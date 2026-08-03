import { cache } from "react";

import { brand, commerce, contact, legal, social } from "@/config/brand";
import { prisma } from "@/lib/prisma";

/**
 * إعدادات المنشأة.
 *
 * المصدر هو جدول SiteSettings حتى تُدار كل البيانات من لوحة التحكم دون كود.
 * قيم src/config/brand.ts تعمل كقيمة احتياطية فقط — قبل التهيئة أو إن حُذف
 * السجل. cache() يضمن استعلامًا واحدًا لكل طلب مهما تكرر الاستدعاء.
 */

export type SocialLinks = {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  snapchat?: string;
  linkedin?: string;
  youtube?: string;
};

export type PaymentSettings = {
  bankTransfer: boolean;
  online: boolean;
  cod: boolean;
  onPickup: boolean;
  bankAccounts: { bankName: string; accountName: string; iban: string }[];
};

export type Settings = {
  companyName: string;
  tagline: string;
  description: string;
  phone: string;
  phoneDisplay: string;
  whatsapp: string;
  email: string;
  landline: string;
  addressLine: string;
  city: string;
  mapUrl: string;
  workingHours: string;
  logoUrl: string | null;
  logoWhiteUrl: string | null;
  social: SocialLinks;
  vatNumber: string;
  crNumber: string;
  vatRate: number;
  pricesIncludeVat: boolean;
  payment: PaymentSettings;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
};

const FALLBACK: Settings = {
  companyName: brand.name,
  tagline: brand.tagline,
  description: brand.description,
  phone: contact.phone,
  phoneDisplay: contact.phoneDisplay,
  whatsapp: contact.whatsapp,
  email: contact.email,
  landline: contact.landline,
  addressLine: contact.addressLine,
  city: contact.city,
  mapUrl: contact.mapUrl,
  workingHours: contact.workingHours,
  logoUrl: null,
  logoWhiteUrl: null,
  social,
  vatNumber: legal.vatNumber,
  crNumber: legal.crNumber,
  vatRate: commerce.vatRate,
  pricesIncludeVat: commerce.pricesIncludeVat,
  payment: {
    bankTransfer: true,
    online: false,
    cod: false,
    onPickup: true,
    bankAccounts: [],
  },
  defaultSeoTitle: `${brand.name} | ${brand.taglineSecondary}`,
  defaultSeoDescription: brand.description,
};

/** يزيل وسم "[[يحتاج استبدال]]" من القيم المخزّنة قبل عرضها للزائر. */
function clean(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const stripped = value.replace(/\[\[يحتاج استبدال\]\]/g, "").trim();
  return stripped.length > 0 ? stripped : fallback;
}

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const record = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (!record) return FALLBACK;

    const socialLinks = (record.social ?? {}) as SocialLinks;
    const payment = (record.paymentSettings ?? {}) as Partial<PaymentSettings>;
    const phone = clean(record.phone, FALLBACK.phone);

    return {
      companyName: clean(record.companyName, FALLBACK.companyName),
      tagline: clean(record.tagline, FALLBACK.tagline),
      description: clean(record.description, FALLBACK.description),
      phone,
      phoneDisplay: formatPhoneDisplay(phone),
      whatsapp: clean(record.whatsapp, FALLBACK.whatsapp).replace(/\D/g, ""),
      email: clean(record.email, FALLBACK.email),
      landline: clean(record.landline, FALLBACK.landline),
      addressLine: clean(record.addressLine, FALLBACK.addressLine),
      city: clean(record.city, FALLBACK.city),
      mapUrl: clean(record.mapUrl, FALLBACK.mapUrl),
      workingHours: clean(record.workingHours, FALLBACK.workingHours),
      logoUrl: record.logoUrl,
      logoWhiteUrl: record.logoWhiteUrl,
      social: socialLinks,
      vatNumber: record.vatNumber ?? "",
      crNumber: record.crNumber ?? "",
      vatRate: record.vatRate,
      pricesIncludeVat: record.pricesIncludeVat,
      payment: {
        bankTransfer: payment.bankTransfer ?? true,
        online: payment.online ?? false,
        cod: payment.cod ?? false,
        onPickup: payment.onPickup ?? true,
        bankAccounts: payment.bankAccounts ?? [],
      },
      defaultSeoTitle: clean(record.defaultSeoTitle, FALLBACK.defaultSeoTitle),
      defaultSeoDescription: clean(
        record.defaultSeoDescription,
        FALLBACK.defaultSeoDescription,
      ),
    };
  } catch {
    // قبل تشغيل الترحيل أو عند تعذّر الاتصال — الموقع يظل يعمل بقيم الهوية
    return FALLBACK;
  }
});

/** تنسيق رقم سعودي للعرض: +966 5X XXX XXXX */
function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966") && digits.length === 12) {
    return `+966 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}
