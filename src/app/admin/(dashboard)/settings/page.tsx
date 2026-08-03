import { SettingsForm, type SettingsDraft } from "@/app/admin/(dashboard)/settings/SettingsForm";
import { AdminHeading } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "بيانات المنشأة" };

type Social = Record<string, string | undefined>;
type Payment = {
  bankTransfer?: boolean;
  online?: boolean;
  cod?: boolean;
  onPickup?: boolean;
  bankAccounts?: { bankName: string; accountName: string; iban: string }[];
};

export default async function AdminSettingsPage() {
  const record = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });

  const social = (record?.social ?? {}) as Social;
  const payment = (record?.paymentSettings ?? {}) as Payment;

  // نُزيل وسم المحتوى المؤقت من القيم قبل عرضها للتحرير
  const clean = (value: string | null | undefined) =>
    (value ?? "").replace(/\[\[يحتاج استبدال\]\]/g, "").trim();

  const initial: SettingsDraft = {
    companyName: clean(record?.companyName),
    tagline: clean(record?.tagline),
    description: clean(record?.description),
    phone: clean(record?.phone),
    whatsapp: clean(record?.whatsapp),
    landline: clean(record?.landline),
    email: clean(record?.email),
    addressLine: clean(record?.addressLine),
    city: clean(record?.city),
    mapUrl: clean(record?.mapUrl),
    workingHours: clean(record?.workingHours),
    vatNumber: record?.vatNumber ?? "",
    crNumber: record?.crNumber ?? "",
    vatRate: record?.vatRate ?? 0.15,
    pricesIncludeVat: record?.pricesIncludeVat ?? true,
    bankTransfer: payment.bankTransfer ?? true,
    onlinePayment: payment.online ?? false,
    cod: payment.cod ?? false,
    onPickup: payment.onPickup ?? true,
    bankAccounts: payment.bankAccounts ?? [],
    social: {
      instagram: social.instagram ?? "",
      twitter: social.twitter ?? "",
      tiktok: social.tiktok ?? "",
      snapchat: social.snapchat ?? "",
      linkedin: social.linkedin ?? "",
      youtube: social.youtube ?? "",
    },
    defaultSeoTitle: clean(record?.defaultSeoTitle),
    defaultSeoDescription: clean(record?.defaultSeoDescription),
    logoUrl: record?.logoUrl ?? "",
    logoWhiteUrl: record?.logoWhiteUrl ?? "",
  };

  // ما زالت هناك بيانات هيكلية لم تُستبدل بعد
  const needsAttention =
    !initial.phone ||
    !initial.whatsapp ||
    !initial.email ||
    initial.email.includes("example.com") ||
    initial.whatsapp.startsWith("966500000000");

  return (
    <>
      <AdminHeading
        title="بيانات المنشأة"
        description="هذه البيانات تظهر في كل الموقع وتُستخدم في أزرار التواصل والفواتير والبيانات المنظّمة."
      />

      {needsAttention ? (
        <Alert tone="warning" title="بيانات تواصل تحتاج استبدالاً" className="mb-6">
          ما زالت بعض بيانات التواصل قيمًا مؤقتة. استبدلها بالأرقام والبريد
          الحقيقيين قبل نشر الموقع، وإلا ستوجّه أزرار الاتصال والواتساب العملاء
          إلى رقم غير صحيح.
        </Alert>
      ) : null}

      <SettingsForm initial={initial} />
    </>
  );
}
