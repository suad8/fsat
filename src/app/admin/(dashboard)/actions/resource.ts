"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, hashPassword } from "@/lib/auth";
import { getResource, type FieldDef, type ResourceDef } from "@/lib/admin/resources";
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
      return Number.isNaN(parsed) ? null : parsed;
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

export async function saveResourceAction(
  _previous: ResourceState,
  form: FormData,
): Promise<ResourceState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const slug = form.get("__resource");
  const id = form.get("__id");

  if (typeof slug !== "string") return { error: "طلب غير صالح." };

  const resource = getResource(slug);
  if (!resource) return { error: "مورد غير معروف." };

  const { data, fieldErrors } = buildData(resource, form);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, error: "تحقّق من الحقول المطلوبة." };
  }

  // كلمة مرور مستخدمي اللوحة تُعالَج خارج الحقول العامة لأنها تُجزَّأ ولا تُقرأ
  if (resource.model === "adminUser") {
    const password = form.get("password");
    if (typeof password === "string" && password.length > 0) {
      if (password.length < 10) {
        return { fieldErrors: { password: "كلمة المرور يجب ألا تقل عن ١٠ أحرف" } };
      }
      data.passwordHash = await hashPassword(password);
    } else if (typeof id !== "string" || id === "") {
      return { fieldErrors: { password: "كلمة المرور مطلوبة عند إنشاء مستخدم" } };
    }
  }

  const delegate = delegateFor(resource);

  try {
    if (typeof id === "string" && id !== "") {
      await delegate.update({ where: { id }, data });
    } else {
      await delegate.create({ data });
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
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const resource = getResource(slug);
  if (!resource) return { ok: false, error: "مورد غير معروف." };

  const delegate = delegateFor(resource);

  // حقول النظام في قالب عرض السعر مرتبطة بمنطق في الكود (مثل تعبئة أنواع
  // المنتجات تلقائيًا)، فحذفها يكسر النموذج. تُخفى بدل أن تُحذف.
  const existing = await delegate.findUnique({ where: { id } });
  if (existing?.isSystem === true) {
    return {
      ok: false,
      error: "هذا حقل أساسي في النموذج ولا يمكن حذفه. أطفئ خيار «ظاهر في النموذج» لإخفائه بدل ذلك.",
    };
  }

  try {
    await delegate.delete({ where: { id } });
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
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "انتهت جلستك. أعد تسجيل الدخول." };
  }

  const resource = getResource(slug);
  if (!resource) return { ok: false, error: "مورد غير معروف." };

  // الحقل يجب أن يكون حقلاً منطقيًا معرّفًا لهذا المورد
  const allowed = resource.fields.some(
    (definition) => definition.name === field && definition.type === "checkbox",
  );
  if (!allowed) return { ok: false, error: "حقل غير مسموح." };

  const delegate = delegateFor(resource);

  try {
    await delegate.update({ where: { id }, data: { [field]: value } });
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
  const resource = getResource(slug);
  if (!resource) return null;

  const delegate = delegateFor(resource);
  return delegate.findUnique({ where: { id } });
}
