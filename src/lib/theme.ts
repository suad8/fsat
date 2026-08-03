import { palette } from "@/config/brand";

/**
 * ============================================================================
 *  محرّك الثيم
 * ============================================================================
 *  تختار الإدارة ثلاثة ألوان أساسية، ويولّد هذا الملف منها تدرّجًا كاملاً
 *  (50 → 950) ويحقنه كمتغيّرات CSS تتجاوز القيم الافتراضية في globals.css.
 *
 *  لماذا التوليد بدل طلب ١١ لونًا من المستخدم؟ لأن اختيار تدرّج متناسق عمل
 *  مصمّم لا صاحب مطبعة. اللون الواحد يكفي، والباقي حساب.
 *
 *  التباين يُحسب تلقائيًا: لون النص فوق كل لون أساسي يُختار أبيض أو داكنًا
 *  حسب سطوع اللون، فلا تنتج أزرار غير مقروءة مهما كان اللون المختار.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// تحويلات الألوان
// ---------------------------------------------------------------------------

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

/** يقبل #RGB و #RRGGBB. يعيد null للقيم غير الصالحة. */
export function parseHex(input: string): Rgb | null {
  const hex = input.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  return null;
}

function toHex({ r, g, b }: Rgb): string {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }

  const hue = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hue(h + 1 / 3) * 255,
    g: hue(h) * 255,
    b: hue(h - 1 / 3) * 255,
  };
}

// ---------------------------------------------------------------------------
// التباين
// ---------------------------------------------------------------------------

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** السطوع النسبي حسب WCAG. */
export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b)
  );
}

/** نسبة التباين بين لونين — من 1 (متطابقان) إلى 21 (أسود/أبيض). */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return 0;

  const la = relativeLuminance(ca);
  const lb = relativeLuminance(cb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];

  return (hi + 0.05) / (lo + 0.05);
}

/**
 * لون النص المناسب فوق خلفية ما — أبيض أو داكن.
 * هذا ما يمنع تكرار مشكلة «نص أبيض على ذهبي» مهما اختارت الإدارة.
 */
export function readableTextOn(background: string): string {
  const DARK = "#1A1523";
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, DARK)
    ? "#ffffff"
    : DARK;
}

// ---------------------------------------------------------------------------
// توليد التدرّج
// ---------------------------------------------------------------------------

/** درجات السطوع المستهدفة لكل خطوة — مطابقة لأسلوب Tailwind. */
const STEPS: { step: number; lightness: number }[] = [
  { step: 50, lightness: 0.97 },
  { step: 100, lightness: 0.94 },
  { step: 200, lightness: 0.86 },
  { step: 300, lightness: 0.76 },
  { step: 400, lightness: 0.64 },
  { step: 500, lightness: 0.54 },
  { step: 600, lightness: 0.46 },
  { step: 700, lightness: 0.38 },
  { step: 800, lightness: 0.31 },
  { step: 900, lightness: 0.25 },
  { step: 950, lightness: 0.16 },
];

/**
 * يولّد تدرّجًا من لون واحد.
 *
 * الإشباع يقلّ في الأطراف الفاتحة والداكنة جدًا — التدرّج الذي يحافظ على
 * إشباع ثابت ينتج درجات فاقعة غير قابلة للاستخدام كخلفيات.
 */
export function generateScale(baseHex: string): Record<number, string> {
  const rgb = parseHex(baseHex);
  if (!rgb) return {};

  const { h, s } = rgbToHsl(rgb);
  const scale: Record<number, string> = {};

  for (const { step, lightness } of STEPS) {
    // تخفيف الإشباع كلما ابتعدنا عن منتصف التدرّج
    const distance = Math.abs(lightness - 0.5) * 2;
    const saturation = s * (1 - distance * 0.35);
    scale[step] = toHex(hslToRgb({ h, s: saturation, l: lightness }));
  }

  return scale;
}

// ---------------------------------------------------------------------------
// الخطوط
// ---------------------------------------------------------------------------

export const THEME_FONTS = [
  { key: "cairo", label: "القاهرة (Cairo)", note: "هندسي واضح — الافتراضي" },
  { key: "tajawal", label: "تجوّل (Tajawal)", note: "عصري مبسّط" },
  { key: "almarai", label: "المراعي (Almarai)", note: "ودود ومقروء" },
  { key: "ibmArabic", label: "IBM Plex Arabic", note: "رسمي ومؤسسي" },
  { key: "notoKufi", label: "نوتو كوفي", note: "كوفي حديث" },
] as const;

export type ThemeFontKey = (typeof THEME_FONTS)[number]["key"];

export function isThemeFont(value: string | null | undefined): value is ThemeFontKey {
  return THEME_FONTS.some((font) => font.key === value);
}

// ---------------------------------------------------------------------------
// الانحناءات
// ---------------------------------------------------------------------------

export const THEME_RADII = [
  { key: "SHARP", label: "حادّة", scale: 0.35 },
  { key: "SOFT", label: "ناعمة (الافتراضي)", scale: 1 },
  { key: "ROUND", label: "دائرية", scale: 1.8 },
] as const;

export type ThemeRadiusKey = (typeof THEME_RADII)[number]["key"];

// ---------------------------------------------------------------------------
// الثيم المطبَّق
// ---------------------------------------------------------------------------

export type Theme = {
  primary: string;
  accent: string;
  brand: string;
  font: ThemeFontKey;
  radius: ThemeRadiusKey;
};

/** ألوان الهوية الأصلية — تُستخدم حين لا تحدّد الإدارة شيئًا. */
export const DEFAULT_THEME: Theme = {
  primary: palette.plum,
  accent: palette.gold,
  brand: palette.violet,
  font: "cairo",
  radius: "SOFT",
};

const BASE_RADII: Record<string, number> = {
  xs: 0.25,
  sm: 0.375,
  md: 0.625,
  lg: 0.875,
  xl: 1.25,
  "2xl": 1.75,
};

/**
 * يبني كتلة CSS تتجاوز متغيّرات الثيم الافتراضية.
 *
 * تُحقن في <head> فتُطبَّق قبل أول رسم — لا وميض للألوان الافتراضية ثم
 * تبدّلها. الدرجة 900 من `primary` تُثبَّت على اللون المختار نفسه لأنها
 * لون الأسطح الداكنة الأبرز في الموقع.
 */
export function buildThemeCss(theme: Theme): string {
  const primary = generateScale(theme.primary);
  const accent = generateScale(theme.accent);
  const brand = generateScale(theme.brand);

  if (Object.keys(primary).length === 0) return "";

  const lines: string[] = [];

  for (const [step, value] of Object.entries(primary)) {
    lines.push(`--color-primary-${step}:${value}`);
  }
  for (const [step, value] of Object.entries(accent)) {
    lines.push(`--color-accent-${step}:${value}`);
  }
  for (const [step, value] of Object.entries(brand)) {
    lines.push(`--color-brand-${step}:${value}`);
  }

  // اللون المختار نفسه يبقى هو الأبرز، لا نسخة محسوبة منه
  lines.push(`--color-primary-900:${theme.primary}`);
  lines.push(`--color-accent-500:${theme.accent}`);
  lines.push(`--color-brand-600:${theme.brand}`);

  // ألوان النص المحسوبة — تضمن قابلية القراءة مهما كان اللون المختار
  lines.push(`--color-accent-contrast:${readableTextOn(theme.accent)}`);
  lines.push(`--color-brand-contrast:${readableTextOn(theme.brand)}`);
  lines.push(`--color-primary-contrast:${readableTextOn(theme.primary)}`);

  const radiusScale =
    THEME_RADII.find((entry) => entry.key === theme.radius)?.scale ?? 1;

  for (const [name, rem] of Object.entries(BASE_RADII)) {
    lines.push(`--radius-${name}:${(rem * radiusScale).toFixed(3)}rem`);
  }

  return `:root{${lines.join(";")}}`;
}
