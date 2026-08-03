"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveSettingsAction } from "@/app/admin/(dashboard)/actions/settings";
import { AdminCard } from "@/components/admin/AdminUi";
import { ImageField } from "@/components/admin/ImageField";
import { Alert } from "@/components/ui/Alert";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, TextArea, TextInput } from "@/components/ui/Field";
import { SAUDI_CITIES } from "@/lib/constants";
import { Select } from "@/components/ui/Field";

export type SettingsDraft = {
  companyName: string;
  tagline: string;
  description: string;
  phone: string;
  whatsapp: string;
  landline: string;
  email: string;
  addressLine: string;
  city: string;
  mapUrl: string;
  workingHours: string;
  vatNumber: string;
  crNumber: string;
  vatRate: number;
  pricesIncludeVat: boolean;
  bankTransfer: boolean;
  onlinePayment: boolean;
  cod: boolean;
  onPickup: boolean;
  bankAccounts: { bankName: string; accountName: string; iban: string }[];
  social: {
    instagram: string;
    twitter: string;
    tiktok: string;
    snapchat: string;
    linkedin: string;
    youtube: string;
  };
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  logoUrl: string;
  logoWhiteUrl: string;
};

/** نموذج بيانات المنشأة والإعدادات العامة. */
export function SettingsForm({ initial }: { initial: SettingsDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SettingsDraft>(initial);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{
    tone: "success" | "danger";
    text: string;
    fieldErrors?: Record<string, string>;
  } | null>(null);

  function patch(changes: Partial<SettingsDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function save() {
    startTransition(async () => {
      const result = await saveSettingsAction(draft);

      if (!result.ok) {
        setState({
          tone: "danger",
          text: result.error ?? "تعذّر الحفظ.",
          fieldErrors: result.fieldErrors,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setState({ tone: "success", text: "تم حفظ الإعدادات وتحديث الموقع." });
      router.refresh();
    });
  }

  const errors = state?.fieldErrors ?? {};

  return (
    <div className="space-y-6">
      {state ? (
        <Alert tone={state.tone} live>
          {state.text}
        </Alert>
      ) : null}

      {/* --- الهوية --- */}
      <AdminCard
        title="هوية المنشأة"
        description="الاسم والشعار يظهران في الترويسة والفوتر وعناوين الصفحات."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            id="companyName"
            label="اسم المنشأة"
            required
            value={draft.companyName}
            onChange={(event) => patch({ companyName: event.target.value })}
            error={errors.companyName}
          />

          <TextInput
            id="tagline"
            label="العبارة التسويقية"
            optional
            value={draft.tagline}
            onChange={(event) => patch({ tagline: event.target.value })}
            help="تظهر كعنوان رئيسي في الصفحة الأولى."
          />

          <TextArea
            id="description"
            label="وصف المنشأة"
            optional
            rows={3}
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
            help="يُستخدم في الفوتر وفي البيانات المنظّمة لمحركات البحث."
            wrapperClassName="md:col-span-2"
          />

          <ImageField
            label="الشعار (على خلفية فاتحة)"
            value={draft.logoUrl}
            onValueChange={(logoUrl) => patch({ logoUrl })}
            folder="brand"
            help="يُستخدم في الترويسة. يُفضّل PNG بخلفية شفافة."
          />

          <ImageField
            label="الشعار (على خلفية داكنة)"
            value={draft.logoWhiteUrl}
            onValueChange={(logoWhiteUrl) => patch({ logoWhiteUrl })}
            folder="brand"
            help="يُستخدم في الفوتر ذي الخلفية الداكنة."
          />
        </div>
      </AdminCard>

      {/* --- التواصل --- */}
      <AdminCard
        title="بيانات التواصل"
        description="تظهر في الترويسة والفوتر وصفحة اتصل بنا، وتُستخدم في أزرار الاتصال والواتساب."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            id="phone"
            label="رقم الجوال"
            type="tel"
            value={draft.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            placeholder="+966500000000"
            error={errors.phone}
          />

          <TextInput
            id="whatsapp"
            label="رقم الواتساب"
            type="tel"
            value={draft.whatsapp}
            onChange={(event) => patch({ whatsapp: event.target.value })}
            placeholder="966500000000"
            help="بالصيغة الدولية بدون + وبدون مسافات."
            error={errors.whatsapp}
          />

          <TextInput
            id="landline"
            label="الهاتف الثابت"
            type="tel"
            optional
            value={draft.landline}
            onChange={(event) => patch({ landline: event.target.value })}
          />

          <TextInput
            id="email"
            label="البريد الإلكتروني"
            type="email"
            value={draft.email}
            onChange={(event) => patch({ email: event.target.value })}
            error={errors.email}
          />

          <Select
            id="city"
            label="المدينة"
            value={draft.city}
            onChange={(event) => patch({ city: event.target.value })}
            help="تُستخدم في تحسين البحث المحلي."
          >
            <option value="">— اختر —</option>
            {SAUDI_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>

          <TextInput
            id="workingHours"
            label="أوقات العمل"
            value={draft.workingHours}
            onChange={(event) => patch({ workingHours: event.target.value })}
            placeholder="السبت – الخميس: ٩ صباحًا – ٩ مساءً"
          />

          <TextInput
            id="addressLine"
            label="العنوان"
            value={draft.addressLine}
            onChange={(event) => patch({ addressLine: event.target.value })}
            wrapperClassName="md:col-span-2"
          />

          <TextInput
            id="mapUrl"
            label="رابط الموقع على خرائط جوجل"
            type="url"
            optional
            value={draft.mapUrl}
            onChange={(event) => patch({ mapUrl: event.target.value })}
            error={errors.mapUrl}
            wrapperClassName="md:col-span-2"
          />
        </div>
      </AdminCard>

      {/* --- التواصل الاجتماعي --- */}
      <AdminCard
        title="حسابات التواصل الاجتماعي"
        description="الحسابات الفارغة لا تظهر في الفوتر."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {(
            [
              ["instagram", "إنستقرام"],
              ["twitter", "منصة إكس"],
              ["tiktok", "تيك توك"],
              ["snapchat", "سناب شات"],
              ["linkedin", "لينكدإن"],
              ["youtube", "يوتيوب"],
            ] as const
          ).map(([key, label]) => (
            <TextInput
              key={key}
              id={`social-${key}`}
              label={label}
              type="url"
              optional
              value={draft.social[key]}
              onChange={(event) =>
                patch({ social: { ...draft.social, [key]: event.target.value } })
              }
              placeholder="https://"
            />
          ))}
        </div>
      </AdminCard>

      {/* --- الضريبة --- */}
      <AdminCard
        title="البيانات النظامية والضريبة"
        description="تظهر في الفوتر وفي الفواتير، وتؤثر على حساب المبالغ في صفحة إتمام الطلب."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput
            id="vatNumber"
            label="الرقم الضريبي"
            optional
            value={draft.vatNumber}
            onChange={(event) => patch({ vatNumber: event.target.value })}
            error={errors.vatNumber}
            help="١٥ رقمًا."
          />

          <TextInput
            id="crNumber"
            label="رقم السجل التجاري"
            optional
            value={draft.crNumber}
            onChange={(event) => patch({ crNumber: event.target.value })}
          />

          <TextInput
            id="vatRate"
            label="نسبة ضريبة القيمة المضافة"
            type="number"
            step="0.01"
            value={String(draft.vatRate)}
            onChange={(event) => patch({ vatRate: Number(event.target.value) || 0 })}
            help="0.15 تعني ١٥٪."
            error={errors.vatRate}
          />

          <div className="flex items-end pb-2">
            <Checkbox
              id="pricesIncludeVat"
              label="الأسعار المعروضة شاملة الضريبة"
              description="عند التعطيل، تُضاف الضريبة على المجموع في صفحة إتمام الطلب."
              checked={draft.pricesIncludeVat}
              onChange={(event) => patch({ pricesIncludeVat: event.target.checked })}
            />
          </div>
        </div>
      </AdminCard>

      {/* --- الدفع --- */}
      <AdminCard
        title="طرق الدفع"
        description="الطرق المعطّلة لا تظهر للعميل في صفحة إتمام الطلب."
      >
        <div className="space-y-3">
          <Checkbox
            id="bankTransfer"
            label="التحويل البنكي"
            checked={draft.bankTransfer}
            onChange={(event) => patch({ bankTransfer: event.target.checked })}
          />
          <Checkbox
            id="onPickup"
            label="الدفع عند الاستلام من الفرع"
            checked={draft.onPickup}
            onChange={(event) => patch({ onPickup: event.target.checked })}
          />
          <Checkbox
            id="cod"
            label="الدفع عند الاستلام (مع الشحن)"
            checked={draft.cod}
            onChange={(event) => patch({ cod: event.target.checked })}
          />
          <Checkbox
            id="onlinePayment"
            label="الدفع الإلكتروني بالبطاقة"
            description="الواجهة جاهزة — فعّلها بعد ربط بوابة الدفع."
            checked={draft.onlinePayment}
            onChange={(event) => patch({ onlinePayment: event.target.checked })}
          />
        </div>

        {draft.bankTransfer ? (
          <div className="border-border mt-6 border-t pt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold">الحسابات البنكية</h3>
                <p className="text-primary-500 mt-0.5 text-xs">
                  تُرسل للعميل بعد تأكيد الطلب.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                icon="plus"
                onClick={() =>
                  patch({
                    bankAccounts: [
                      ...draft.bankAccounts,
                      { bankName: "", accountName: "", iban: "" },
                    ],
                  })
                }
              >
                حساب
              </Button>
            </div>

            <ul className="space-y-3">
              {draft.bankAccounts.map((account, index) => (
                <li
                  key={index}
                  className="border-border bg-surface-muted grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]"
                >
                  <TextInput
                    id={`bank-name-${index}`}
                    label="اسم البنك"
                    value={account.bankName}
                    onChange={(event) =>
                      patch({
                        bankAccounts: draft.bankAccounts.map((item, i) =>
                          i === index ? { ...item, bankName: event.target.value } : item,
                        ),
                      })
                    }
                  />
                  <TextInput
                    id={`bank-account-${index}`}
                    label="اسم صاحب الحساب"
                    value={account.accountName}
                    onChange={(event) =>
                      patch({
                        bankAccounts: draft.bankAccounts.map((item, i) =>
                          i === index ? { ...item, accountName: event.target.value } : item,
                        ),
                      })
                    }
                  />
                  <TextInput
                    id={`bank-iban-${index}`}
                    label="رقم الآيبان"
                    value={account.iban}
                    onChange={(event) =>
                      patch({
                        bankAccounts: draft.bankAccounts.map((item, i) =>
                          i === index ? { ...item, iban: event.target.value } : item,
                        ),
                      })
                    }
                    placeholder="SA0000000000000000000000"
                  />
                  <div className="flex items-end">
                    <IconButton
                      name="trash"
                      label="حذف الحساب"
                      size="sm"
                      variant="outline"
                      className="text-danger-600"
                      onClick={() =>
                        patch({
                          bankAccounts: draft.bankAccounts.filter((_, i) => i !== index),
                        })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </AdminCard>

      <div className="border-border bg-surface sticky bottom-0 border-t p-4">
        <Button size="lg" onClick={save} disabled={pending} icon={pending ? undefined : "check"}>
          {pending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}
