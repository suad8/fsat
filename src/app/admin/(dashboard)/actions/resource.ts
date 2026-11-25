"use server";

import { revalidatePath } from "next/cache";

import { getResource, type FieldDef, type ResourceDef } from "@/lib/admin/resources";
import { hashPassword } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/constants";
import { getAdminContext, type AdminContext } from "@/lib/data/admin-context";
import { diffRecords, logAudit } from "@/lib/data/audit";
import { MAX_MONEY, roundMoney } from "@/lib/data/money";
import { checkAdminPassword } from "@/lib/data/password-policy";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * إجراءات CRUD العامة للموارد البسيطة.
 *
 * الأمان: اسم النموذج لا يأتي من المستخدم إطلاقًا — يُقرأ من تعريف الموارد
 * المغلق في src/lib/admin/resources.ts بعد التحقق من أن المعرّف موجود فيه.
 * والحقول المقبولة محصورة بما هو معرّف للمورد، فلا يمكن حقن حقل غير متوقّع
 * عبر إضافة إدخال للنموذج في المتصفّح.
 */

export type ResourceState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

type Delegate = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
  count: (args?: unknown) => Promise<number>;
};

/** الوصول للنموذج بعد التأكد أنه ضمن القائمة المغلقة. */
function delegateFor(resource: ResourceDef): Delegate {
  const client = prisma as unknown as Record<string, Delegate>;
  const delegate = client[resource.model];

  if (!delegate || typeof delegate.findMany !== "function") {
    throw new Error(`نموذج غير معروف: ${resource.model}`);
  }

  return delegate;
}

/** تحويل قيمة الحقل من FormData إلى النوع الذي تتوقّعه القاعدة. */
function coerce(field: FieldDef, form: FormData): unknown {
  switch (field.type) {
    case "checkbox":
      return form.get(field.name) === "on";

    case "number": {
      const raw = form.get(field.name);
      if (typeof raw !== "string" || raw.trim() === "") return null;
      const parsed = Number.parseInt(raw, 10);
      return Number.isNaN(parsed) ? null : parsed;
    }

    case "price": {
      const raw = form.get(field.name);
      if (typeof raw !== "string" || raw.trim() === "") return null;
      const parsed = Number.parseFloat(raw);
      // كل المبالغ تُخزَّن مضاعفًا دقيقًا للهللة
      return Number.isFinite(parsed) ? roundMoney(parsed) : null;
    }

    case "date": {
      const raw = form.get(field.name);
      if (typeof raw !== "string" || raw.trim() === "") return null;
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    case "multiselect":
      // قائمة مفصولة بأسطر أو فواصل — تُحفظ كمصفوفة JSON
      return parseList(form.get(field.name));

    case "keyValue":
      return parseKeyValue(form.get(field.name));

    default: {
      const raw = form.get(field.name);
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      return trimmed === "" ? null : trimmed;
    }
  }
}

function parseList(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\n,،]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseKeyValue(raw: FormDataEntryValue | null): { label: string; value: string }[] {
  if (typeof raw !== "string") return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // الفاصل هو أول "/" أو ":" في السطر
      const separatorIndex = line.search(/[/:]/);
      if (separatorIndex === -1) return { label: line, value: "" };
      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((entry) => entry.label.length > 0);
}

// ---------------------------------------------------------------------------
// قواعد الأعمال لكل مورد
// ---------------------------------------------------------------------------

/**
 * حقل التاريخ يصل منتصف ليل UTC لليوم المختار. الكوبون ينتهي بنهاية ذلك
 * اليوم (٢٣:٥٩:٥٩٫٩٩٩) لا بدايته، وإلا انتهى «يوم الانتهاء» قبل أن يبدأ.
 * نبقى على أيام UTC عمدًا: الواجهة تعرض التاريخ بـ toISOString فيبقى اليوم
 * المعروض ثابتًا عند تكرار التعديل والحفظ (التحويل لتوقيت الرياض كان سيزحزحه
 * يومًا في كل مرة).
 */
function endOfDay(date: Date): Date {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(start + 24 * 3_600_000 - 1);
}

const COUPON_CODE = /^[A-Z0-9_-]{3,30}$/;

/**
 * قواعد تتجاوز "الحقل مطلوب": مثلاً نسبة الخصم لا تتجاوز ١٠٠ والتواريخ مرتّبة.
 * تعدّل `data` في مكانها (تقريب/تطبيع) وتضيف أخطاء الحقول.
 */
function validateResourceRules(
  resource: ResourceDef,
  form: FormData,
  data: Record<string, unknown>,
  errors: Record<string, string>,
): void {
  // أي مبلغ سالب أو ضخم مرفوض مهما كان المورد
  for (const field of resource.fields) {
    if (field.type !== "price") continue;
    const value = data[field.name];
    if (typeof value === "number" && (value < 0 || value > MAX_MONEY)) {
      errors[field.name] = "المبلغ غير صالح";
    }
  }

  switch (resource.model) {
    case "coupon": {
      // قيمة الخصم قد تكون كسرية (٧٫٥٪ أو ١٢٫٥ ريال) — حقل number يقطعها لعدد صحيح
      const rawValue = form.get("value");
      const value = typeof rawValue === "string" ? Number.parseFloat(rawValue) : Number.NaN;
      data.value = Number.isFinite(value) ? roundMoney(value) : null;

      const code = typeof data.code === "string" ? data.code.toUpperCase().replace(/\s+/g, "") : "";
      if (!COUPON_CODE.test(code)) {
        errors.code = "الرمز حروف إنجليزية وأرقام و - _ فقط (٣ إلى ٣٠)";
      }

      if (typeof data.value === "number") {
        if (data.value <= 0) errors.value = "قيمة الخصم يجب أن تكون أكبر من صفر";
        else if (data.type === "PERCENT" && data.value > 100) {
          errors.value = "النسبة المئوية لا تتجاوز ١٠٠";
        }
      }

      if (typeof data.maxUses === "number" && data.maxUses < 1) {
        errors.maxUses = "أقصى استخدام يجب أن يكون ١ على الأقل (أو اتركه فارغًا)";
      }

      // التواريخ: البداية أول اليوم والنهاية آخره
      if (data.expiresAt instanceof Date) data.expiresAt = endOfDay(data.expiresAt);
      if (
        data.startsAt instanceof Date &&
        data.expiresAt instanceof Date &&
        data.expiresAt <= data.startsAt
      ) {
        errors.expiresAt = "تاريخ الانتهاء يجب أن يلي تاريخ البداية";
      }
      break;
    }

    case "shippingZone": {
      if (Array.isArray(data.cities) && data.cities.length === 0) {
        errors.cities = "اختر مدينة واحدة على الأقل";
      }
      // الشحن المجاني فوق مبلغ أقل من التكلفة نفسها غير منطقي لكنه ممكن — نمنع الصفر فقط
      if (data.freeOverAmount === 0) data.freeOverAmount = null;
      break;
    }

    case "testimonial": {
      if (typeof data.rating === "number" && (data.rating < 1 || data.rating > 5)) {
        errors.rating = "التقييم من ١ إلى ٥";
      }
      break;
    }

    case "adminUser": {
      if (typeof data.email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = "صيغة البريد الإلكتروني غير صحيحة";
      }
      if (typeof data.role === "string" && !(ADMIN_ROLES as readonly string[]).includes(data.role)) {
        errors.role = "صلاحية غير معروفة";
      }
      break;
    }
  }
}

/** الموارد التي تحمل علامة "بيانات مبدئية" تُصفَّر عند حفظ الإدارة لها. */
const REVIEWABLE_MODELS = new Set(["page", "shippingZone", "equipment", "faq"]);

/** صفحات تعتمد عليها روابط الموقع (التذييل) — تُخفى ولا تُحذف. */
const PROTECTED_PAGE_SLUGS = new Set(["privacy", "terms", "returns", "shipping"]);

/** اسم الكيان في سجلّ التدقيق: coupon ← Coupon */
function entityName(model: string): string {
  return model.charAt(0).toUpperCase() + model.slice(1);
}

/** تسمية مقروءة للسجل من أول حقل نصي معروف. */
function recordLabel(record: Record<string, unknown> | null | undefined): string {
  if (!record) return "";
  for (const key of ["name", "title", "code", "question", "authorName", "email", "slug"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.slice(0, 80);
  }
  return String(record.id ?? "");
}

/**
 * حماية الحسابات: لا يُترك النظام بلا مالك فعّال، ولا يعطّل المستخدم نفسه.
 * يعيد رسالة خطأ أو null.
 */
async function guardAdminUserChange(
  ctx: AdminContext,
  id: string | null,
  next: { role?: unknown; isActive?: unknown } | "delete",
): Promise<string | null> {
  // إدارة الحسابات للمالك فقط — وإلا صار المحرّر قادرًا على ترقية نفسه
  if (ctx.role !== "OWNER") return "إدارة المستخدمين متاحة للمالك فقط.";
  if (!id) return null;

  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return null;

  const removing = next === "delete" || next.isActive === false || (next.role && next.role !== "OWNER");

  if (id === ctx.actor.id && (next === "delete" || next.isActive === false)) {
    return "لا يمكنك حذف حسابك أو تعطيله بنفسك.";
  }

  if (removing && target.role === "OWNER" && target.isActive) {
    const otherOwners = await prisma.adminUser.count({
      where: { role: "OWNER", isActive: true, id: { not: id } },
    });
    if (otherOwners === 0) return "لا يمكن إزالة آخر مالك فعّال للنظام.";
  }

  return null;
}

/** بناء بيانات الحفظ مع التحقق من الحقول الإلزامية. */
function buildData(
  resource: ResourceDef,
  form: FormData,
): { data: Record<string, unknown>; fieldErrors: Record<string, string> } {
  const data: Record<string, unknown> = {};
  const fieldErrors: Record<string, string> = {};

  for (const field of resource.fields) {
    const value = coerce(field, form);

    if (field.required) {
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0);

      if (empty && field.type !== "checkbox") {
        fieldErrors[field.name] = `${field.label} مطلوب`;
        continue;
      }
    }

    data[field.name] = value;
  }

  validateResourceRules(resource, form, data, fieldErrors);

  // توليد slug تلقائيًا إن تُرك فارغًا وكان المورد يستخدمه
  if ("slug" in data && !data.slug) {
    const source = (data.name ?? data.title ?? data.question) as string | undefined;
    if (source) data.slug = slugify(source);
  }

  if (typeof data.slug === "string") {
    data.slug = slugify(data.slug);
    if (!data.slug) fieldErrors.slug = "الرابط غير صالح";
  }

  // رموز الكوبونات تُوحَّد بحروف كبيرة لتطابق ما يُدخله العميل
  if (typeof data.code === "string") {
    data.code = data.code.toUpperCase().replace(/\s+/g, "");
  }

  if (typeof data.email === "string") {
    data.email = data.email.toLowerCase();
  }

  return { data, fieldErrors };
}

// ---------------------------------------------------------------------------

async function guard(): Promise<{ ctx: AdminContext } | { error: string }> {
  try {
    return { ctx: await getAdminContext() };
  } catch {
    return { error: "انتهت جلستك. أعد تسجيل الدخول." };
  }
}

export async function saveResourceAction(
  _previous: ResourceState,
  form: FormData,
): Promise<ResourceState> {
  const auth = await guard();
  if ("error" in auth) return { error: auth.error };
  const { ctx } = auth;

  const slug = form.get("__resource");
  const id = form.get("__id");

  if (typeof slug !== "string") return { error: "طلب غير صالح." };

  const resource = getResource(slug);
  if (!resource) return { error: "مورد غير معروف." };

  const { data, fieldErrors } = buildData(resource, form);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "تحقّق من الحقول المطلوبة." };
  }

  const editingId = typeof id === "string" && id !== "" ? id : null;

  // كلمة مرور مستخدمي اللوحة تُعالَج خارج الحقول العامة لأنها تُجزَّأ ولا تُقرأ
  if (resource.model === "adminUser") {
    const denied = await guardAdminUserChange(ctx, editingId, data);
    if (denied) return { error: denied };

    const password = form.get("password");
    if (typeof password === "string" && password.length > 0) {
      // سياسة الإنتاج تُطبَّق دائمًا على حسابات اللوحة (≥ ١٢ حرفًا، ٣ أنواع)
      const strength = checkAdminPassword(password, {
        email: typeof data.email === "string" ? data.email : undefined,
        production: true,
      });
      if (!strength.ok) {
        return { fieldErrors: { password: strength.reasons.join(" ") } };
      }
      data.passwordHash = await hashPassword(password);
    } else if (!editingId) {
      return { fieldErrors: { password: "كلمة المرور مطلوبة عند إنشاء مستخدم" } };
    }
  }

  // حفظ الإدارة لنص/تكلفة مبدئية يعني أنها راجعتها
  if (REVIEWABLE_MODELS.has(resource.model)) data.needsReview = false;

  const delegate = delegateFor(resource);

  try {
    const entity = entityName(resource.model);

    if (editingId) {
      const before = await delegate.findUnique({ where: { id: editingId } });
      if (!before) return { error: "السجل غير موجود." };

      const saved = await delegate.update({ where: { id: editingId }, data });
      const changes = diffRecords(before, data);

      if (changes) {
        const sensitive = resource.model === "adminUser" && ("role" in changes || "isActive" in changes || "passwordHash" in changes);
        await logAudit({
          actor: ctx.actor,
          action: "UPDATE",
          entity,
          entityId: editingId,
          summary: `تعديل ${resource.singular} «${recordLabel(saved)}»${sensitive ? " (صلاحيات/كلمة مرور)" : ""}`,
          changes,
          ip: ctx.ip,
        });
      }
    } else {
      const saved = await delegate.create({ data });
      await logAudit({
        actor: ctx.actor,
        action: "CREATE",
        entity,
        entityId: String(saved.id),
        summary: `إضافة ${resource.singular} «${recordLabel(saved)}»`,
        changes: diffRecords(null, data),
        ip: ctx.ip,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    // P2002 = انتهاك قيد التفرّد
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      const conflictField = /slug/i.test(message)
        ? "slug"
        : /code/i.test(message)
          ? "code"
          : /email/i.test(message)
            ? "email"
            : null;

      return conflictField
        ? { fieldErrors: { [conflictField]: "هذه القيمة مستخدمة مسبقًا" }, error: "قيمة مكرّرة." }
        : { error: "توجد قيمة مكرّرة في أحد الحقول الفريدة." };
    }

    console.error(`[admin] فشل حفظ ${resource.model}:`, error);
    return { error: "تعذّر الحفظ. راجع البيانات وحاول مرة أخرى." };
  }

  revalidatePath(`/admin/${resource.slug}`);
  revalidatePath("/", "layout");

  return { ok: true };
}

export async function deleteResourceAction(
  slug: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await guard();
  if ("error" in auth) return { ok: false, error: auth.error };
  const { ctx } = auth;

  const resource = getResource(slug);
  if (!resource) return { ok: false, error: "مورد غير معروف." };

  const delegate = delegateFor(resource);

  // حقول النظام في قالب عرض السعر مرتبطة بمنطق في الكود (مثل تعبئة أنواع
  // المنتجات تلقائيًا)، فحذفها يكسر النموذج. تُخفى بدل أن تُحذف.
  const existing = await delegate.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "السجل غير موجود." };

  if (existing.isSystem === true) {
    return {
      ok: false,
      error: "هذا حقل أساسي في النموذج ولا يمكن حذفه. أطفئ خيار «ظاهر في النموذج» لإخفائه بدل ذلك.",
    };
  }

  if (resource.model === "page" && typeof existing.slug === "string" && PROTECTED_PAGE_SLUGS.has(existing.slug)) {
    return {
      ok: false,
      error: "هذه صفحة سياسة مرتبطة بروابط الموقع. أخفِها بدل حذفها.",
    };
  }

  if (resource.model === "adminUser") {
    const denied = await guardAdminUserChange(ctx, id, "delete");
    if (denied) return { ok: false, error: denied };
  }

  try {
    await delegate.delete({ where: { id } });

    await logAudit({
      actor: ctx.actor,
      action: "DELETE",
      entity: entityName(resource.model),
      entityId: id,
      summary: `حذف ${resource.singular} «${recordLabel(existing)}»`,
      changes: diffRecords(null, existing),
      ip: ctx.ip,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    // P2003 = مفتاح خارجي مرتبط: يمنع حذف قسم فيه منتجات مثلاً
    if (message.includes("Foreign key") || message.includes("P2003")) {
      return {
        ok: false,
        error: "لا يمكن الحذف لوجود عناصر مرتبطة. انقلها أو احذفها أولاً.",
      };
    }

    console.error(`[admin] فشل حذف ${resource.model}:`, error);
    return { ok: false, error: "تعذّر الحذف." };
  }

  revalidatePath(`/admin/${resource.slug}`);
  revalidatePath("/", "layout");

  return { ok: true };
}

/** تبديل حقل منطقي مباشرة من الجدول (منشور/معتمد/مفعّل). */
export async function toggleResourceFieldAction(
  slug: string,
  id: string,
  field: string,
  value: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const auth = await guard();
  if ("error" in auth) return { ok: false, error: auth.error };
  const { ctx } = auth;

  const resource = getResource(slug);
  if (!resource) return { ok: false, error: "مورد غير معروف." };

  // الحقل يجب أن يكون حقلاً منطقيًا معرّفًا لهذا المورد
  const allowed = resource.fields.some(
    (definition) => definition.name === field && definition.type === "checkbox",
  );
  if (!allowed) return { ok: false, error: "حقل غير مسموح." };

  const delegate = delegateFor(resource);
  const nextValue = Boolean(value);

  if (resource.model === "adminUser") {
    const denied = await guardAdminUserChange(ctx, id, { isActive: field === "isActive" ? nextValue : undefined });
    if (denied) return { ok: false, error: denied };
  }

  try {
    const before = await delegate.findUnique({ where: { id } });
    if (!before) return { ok: false, error: "السجل غير موجود." };

    await delegate.update({ where: { id }, data: { [field]: nextValue } });

    await logAudit({
      actor: ctx.actor,
      action: "UPDATE",
      entity: entityName(resource.model),
      entityId: id,
      summary: `تعديل ${resource.singular} «${recordLabel(before)}»: ${field} ← ${nextValue ? "نعم" : "لا"}`,
      changes: { [field]: { from: before[field] ?? null, to: nextValue } },
      ip: ctx.ip,
    });
  } catch (error) {
    console.error(`[admin] فشل تبديل ${field}:`, error);
    return { ok: false, error: "تعذّر التحديث." };
  }

  revalidatePath(`/admin/${resource.slug}`);
  revalidatePath("/", "layout");

  return { ok: true };
}

/** قراءة سجل واحد لتعبئة نموذج التحرير. */
export async function fetchResourceRecord(
  slug: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  // لا قراءة بلا جلسة فعّالة (يرمي UNAUTHORIZED) — الـ proxy وحده لا يكفي
  const ctx = await getAdminContext();

  const resource = getResource(slug);
  if (!resource) return null;

  // بيانات الحسابات للمالك فقط، ولا تخرج كلمة المرور المجزّأة من الخادم أبدًا
  if (resource.model === "adminUser" && ctx.role !== "OWNER") return null;

  const delegate = delegateFor(resource);
  const record = (await delegate.findUnique({ where: { id } })) as Record<string, unknown> | null;
  if (!record) return null;

  const { passwordHash: _omit, ...safe } = record;
  void _omit;
  return safe;
}
