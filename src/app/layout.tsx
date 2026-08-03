import type { Metadata, Viewport } from "next";
import {
  Almarai,
  Cairo,
  IBM_Plex_Sans_Arabic,
  Noto_Kufi_Arabic,
  Tajawal,
} from "next/font/google";

import { brand, contact, siteUrl } from "@/config/brand";
import { buildThemeCss, type ThemeFontKey } from "@/lib/theme";
import { getTheme } from "@/lib/theme-server";

import "./globals.css";

/*
 * الخطوط المتاحة في محرّر الثيم.
 *
 * كلها تُصرَّح هنا لأن next/font يعمل وقت البناء ولا يقبل اسمًا متغيّرًا،
 * لكن المتصفّح لا ينزّل إلا الخط المطبَّق فعليًا على نص مرسوم — فوجود خمسة
 * تعريفات لا يكلّف الزائر شيئًا.
 */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

const almarai = Almarai({
  subsets: ["arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
});

const ibmArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-arabic",
  display: "swap",
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-noto-kufi",
  display: "swap",
});

/** يربط مفتاح الخط المختار بمتغيّر CSS الذي أنشأه next/font. */
const FONT_VARIABLES: Record<ThemeFontKey, string> = {
  cairo: "var(--font-cairo)",
  tajawal: "var(--font-tajawal)",
  almarai: "var(--font-almarai)",
  ibmArabic: "var(--font-ibm-arabic)",
  notoKufi: "var(--font-noto-kufi)",
};

const fontClasses = [cairo, tajawal, almarai, ibmArabic, notoKufi]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} | ${brand.taglineSecondary}`,
    template: `%s | ${brand.nameShort}`,
  },
  description: brand.description,
  applicationName: brand.name,
  keywords: [
    "طباعة",
    "تجهيزات دعائية",
    "مطبعة",
    "طباعة بوكسات",
    "أكواب ورقية",
    "استيكرات",
    "طباعة UV",
    "أكريليك",
    "لوحات إعلانية",
    "بنرات",
    "طباعة على الملابس",
    "هدايا دعائية",
    contact.city,
    brand.nameEn,
  ],
  authors: [{ name: brand.name }],
  creator: brand.name,
  publisher: brand.name,
  formatDetection: { telephone: true, address: false, email: false },
  alternates: {
    canonical: "/",
    // مهيّأ لإضافة الإنجليزية مستقبلاً عبر مسار /en
    languages: { "ar-SA": "/" },
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: brand.name,
    title: `${brand.name} | ${brand.taglineSecondary}`,
    description: brand.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description: brand.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  // البنفسجي الداكن من الهوية — يلوّن شريط المتصفّح على الجوال
  themeColor: "#3A2570",
  width: "device-width",
  initialScale: 1,
  // لا نمنع التكبير — تقييده يضرّ إمكانية الوصول
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getTheme();
  const selectedFont = FONT_VARIABLES[theme.font];

  /*
   * الثيم يُحقن في <head> فيُطبَّق قبل أول رسم — لا وميض للألوان الافتراضية
   * ثم تبدّلها. المحتوى مولَّد من قيم مُتحقَّق منها في theme-server.ts
   * (ألوان HEX ومفاتيح من قوائم مغلقة)، فلا مدخل مستخدم حرّ يصل إلى CSS.
   */
  const themeCss = `${buildThemeCss(theme)}:root{--font-heading:${selectedFont};--font-body:${selectedFont}}`;

  return (
    <html lang="ar" dir="rtl" className={`${fontClasses} h-full antialiased`}>
      <head>
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="bg-surface text-primary-900 flex min-h-full flex-col">
        {/* رابط تخطّي التنقّل — يظهر عند التنقّل بلوحة المفاتيح فقط */}
        <a
          href="#main"
          className="focus:bg-primary-950 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-100 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          تخطّي إلى المحتوى الرئيسي
        </a>
        {children}
      </body>
    </html>
  );
}
