"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { saveSectionsAction, saveThemeAction } from "@/app/admin/(dashboard)/actions/theme";
import { AdminCard } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Select, TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  contrastRatio,
  DEFAULT_THEME,
  generateScale,
  parseHex,
  readableTextOn,
  THEME_FONTS,
  THEME_RADII,
  type Theme,
  type ThemeFontKey,
  type ThemeRadiusKey,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

export type SectionRow = {
  key: string;
  label: string;
  isActive: boolean;
  order: number;
  eyebrow: string;
  title: string;
  description: string;
  /** أقسام لا يمكن إخفاؤها — إخفاؤها يترك الصفحة بلا وسيلة تواصل. */
  locked?: boolean;
};

/**
 * محرّر الثيم.
 *
 * المعاينة تُرسم من نفس دوال توليد التدرّج المستخدمة على الخادم، فما تراه
 * هنا هو ما سيظهر في الموقع بالضبط — لا تقريب ولا محاكاة.
 */
export function ThemeEditor({
  initialTheme,
  initialSections,
}: {
  initialTheme: Theme;
  initialSections: SectionRow[];
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [sections, setSections] = useState<SectionRow[]>(initialSections);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null,
  );

  const scales = useMemo(
    () => ({
      primary: generateScale(theme.primary),
      accent: generateScale(theme.accent),
      brand: generateScale(theme.brand),
    }),
    [theme.primary, theme.accent, theme.brand],
  );

  function save() {
    startTransition(async () => {
      const themeResult = await saveThemeAction(theme);
      if (!themeResult.ok) {
        setFeedback({ tone: "danger", text: themeResult.error ?? "تعذّر الحفظ." });
        return;
      }

      const sectionsResult = await saveSectionsAction(
        sections.map((section, index) => ({
          key: section.key,
          isActive: section.isActive,
          order: index,
          eyebrow: section.eyebrow.trim() || null,
          title: section.title.trim() || null,
          description: section.description.trim() || null,
        })),
      );

      if (!sectionsResult.ok) {
        setFeedback({ tone: "danger", text: sectionsResult.error ?? "تعذّر حفظ الأقسام." });
        return;
      }

      setFeedback({ tone: "success", text: "تم حفظ الثيم وتحديث الموقع." });
      router.refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
  }

  const activeCount = sections.filter((section) => section.isActive).length;

  return (
    <div className="space-y-6">
      {feedback ? (
        <Alert tone={feedback.tone} live>
          {feedback.text}
        </Alert>
      ) : null}

      {/* --- الألوان --- */}
      <AdminCard
        title="ألوان الموقع"
        description="اختر ثلاثة ألوان، ويُولَّد منها تدرّج كامل تلقائيًا لكل الموقع."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <ColorPicker
            label="اللون الأساسي"
            hint="الأسطح الداكنة والعناوين والفوتر"
            value={theme.primary}
            onChange={(primary) => setTheme({ ...theme, primary })}
            scale={scales.primary}
          />
          <ColorPicker
            label="اللون المميّز"
            hint="أزرار الإجراء الرئيسية"
            value={theme.accent}
            onChange={(accent) => setTheme({ ...theme, accent })}
            scale={scales.accent}
          />
          <ColorPicker
            label="لون العلامة"
            hint="الشارات واللمسات المميّزة"
            value={theme.brand}
            onChange={(brand) => setTheme({ ...theme, brand })}
            scale={scales.brand}
          />
        </div>

        <div className="border-border mt-6 border-t pt-5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTheme(DEFAULT_THEME)}
            icon="settings"
          >
            استعادة ألوان الهوية الأصلية
          </Button>
        </div>
      </AdminCard>

      {/* --- المعاينة --- */}
      <AdminCard title="معاينة مباشرة" description="هكذا يظهر الموقع بالألوان المختارة.">
        <Preview theme={theme} scales={scales} />
      </AdminCard>

      {/* --- الخط والانحناء --- */}
      <AdminCard title="الخط والشكل">
        <div className="grid gap-5 md:grid-cols-2">
          <Select
            id="font"
            label="خط الموقع"
            value={theme.font}
            onChange={(event) =>
              setTheme({ ...theme, font: event.target.value as ThemeFontKey })
            }
            help="يُطبَّق على كل نصوص الموقع."
          >
            {THEME_FONTS.map((font) => (
              <option key={font.key} value={font.key}>
                {font.label} — {font.note}
              </option>
            ))}
          </Select>

          <Select
            id="radius"
            label="انحناء الأركان"
            value={theme.radius}
            onChange={(event) =>
              setTheme({ ...theme, radius: event.target.value as ThemeRadiusKey })
            }
            help="يؤثر على البطاقات والأزرار والحقول."
          >
            {THEME_RADII.map((radius) => (
              <option key={radius.key} value={radius.key}>
                {radius.label}
              </option>
            ))}
          </Select>
        </div>
      </AdminCard>

      {/* --- الأقسام --- */}
      <AdminCard
        title="أقسام الصفحة الرئيسية"
        description={`${activeCount} من ${sections.length} أقسام ظاهرة. أطفئ ما لا تحتاجه — كل قسم إضافي يطيل الصفحة على الجوال.`}
      >
        <ul className="space-y-3">
          {sections.map((section, index) => (
            <li
              key={section.key}
              className={cn(
                "border-border bg-surface-muted rounded-lg border p-4 transition-opacity",
                !section.isActive && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-primary-400 font-mono text-xs">{index + 1}</span>

                <span className="min-w-0 flex-1 font-bold">{section.label}</span>

                <div className="flex items-center gap-1">
                  <IconButton
                    name="chevronDown"
                    label="تحريك لأعلى"
                    size="sm"
                    variant="outline"
                    className="rotate-180"
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    name="chevronDown"
                    label="تحريك لأسفل"
                    size="sm"
                    variant="outline"
                    onClick={() => move(index, 1)}
                  />
                </div>

                <Checkbox
                  id={`active-${section.key}`}
                  label="ظاهر"
                  checked={section.isActive}
                  disabled={section.locked}
                  onChange={(event) =>
                    setSections(
                      sections.map((item, i) =>
                        i === index ? { ...item, isActive: event.target.checked } : item,
                      ),
                    )
                  }
                />
              </div>

              <details className="group mt-3">
                <summary className="text-primary-600 hover:text-primary-900 inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-bold">
                  <Icon
                    name="chevronDown"
                    className="size-3.5 transition-transform group-open:rotate-180"
                    strokeWidth={2.5}
                  />
                  تعديل عناوين القسم
                </summary>

                <div className="border-border mt-3 grid gap-4 border-t pt-3 md:grid-cols-2">
                  <TextInput
                    id={`eyebrow-${section.key}`}
                    label="النص الصغير فوق العنوان"
                    optional
                    value={section.eyebrow}
                    onChange={(event) =>
                      setSections(
                        sections.map((item, i) =>
                          i === index ? { ...item, eyebrow: event.target.value } : item,
                        ),
                      )
                    }
                    help="اتركه فارغًا للنص الافتراضي."
                  />
                  <TextInput
                    id={`title-${section.key}`}
                    label="عنوان القسم"
                    optional
                    value={section.title}
                    onChange={(event) =>
                      setSections(
                        sections.map((item, i) =>
                          i === index ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <TextArea
                    id={`desc-${section.key}`}
                    label="وصف القسم"
                    optional
                    rows={2}
                    value={section.description}
                    onChange={(event) =>
                      setSections(
                        sections.map((item, i) =>
                          i === index ? { ...item, description: event.target.value } : item,
                        ),
                      )
                    }
                    wrapperClassName="md:col-span-2"
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </AdminCard>

      <div className="border-border bg-surface sticky bottom-0 flex flex-wrap items-center gap-3 border-t p-4">
        <Button size="lg" onClick={save} disabled={pending} icon={pending ? undefined : "check"}>
          {pending ? "جارٍ الحفظ…" : "حفظ الثيم"}
        </Button>
        <p className="text-primary-500 text-xs">
          يُطبَّق على الموقع فورًا بعد الحفظ.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ColorPicker({
  label,
  hint,
  value,
  onChange,
  scale,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  scale: Record<number, string>;
}) {
  const valid = parseHex(value) !== null;
  const textOn = valid ? readableTextOn(value) : "#ffffff";
  const ratio = valid ? contrastRatio(value, textOn) : 0;

  return (
    <div>
      <span className="text-primary-800 mb-1.5 block text-sm font-bold">{label}</span>
      <p className="text-primary-500 mb-3 text-xs">{hint}</p>

      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={valid ? value : "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="border-border-strong size-11 shrink-0 cursor-pointer rounded-lg border p-1"
        />
        <input
          type="text"
          aria-label={`${label} — كود اللون`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          dir="ltr"
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 font-mono text-sm",
            valid ? "border-border-strong" : "border-danger-500 bg-danger-50/40",
          )}
        />
      </div>

      {!valid ? (
        <p className="text-danger-600 mt-1.5 text-xs font-bold">
          صيغة غير صحيحة — استخدم #RRGGBB
        </p>
      ) : (
        <>
          {/* شريط التدرّج المولَّد */}
          <div className="mt-3 flex overflow-hidden rounded-md">
            {Object.entries(scale).map(([step, color]) => (
              <span
                key={step}
                title={`${step} — ${color}`}
                style={{ backgroundColor: color }}
                className="h-6 flex-1"
              />
            ))}
          </div>

          <p className="text-primary-500 mt-2 text-xs">
            لون النص المحسوب:{" "}
            <span
              className="ms-1 inline-block rounded px-2 py-0.5 font-bold"
              style={{ backgroundColor: value, color: textOn }}
            >
              {ratio.toFixed(1)}:1
            </span>
            {ratio < 4.5 ? (
              <span className="text-warning-700 block font-bold">
                ⚠ تباين منخفض — لون أغمق أو أفتح يعطي قراءة أوضح
              </span>
            ) : null}
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Preview({
  theme,
  scales,
}: {
  theme: Theme;
  scales: { primary: Record<number, string>; accent: Record<number, string> };
}) {
  const accentText = readableTextOn(theme.accent);
  const dark = scales.primary[900] ?? theme.primary;

  return (
    <div className="overflow-hidden rounded-xl" style={{ backgroundColor: dark }}>
      <div className="p-6 md:p-8">
        <p
          className="mb-2 text-xs font-bold"
          style={{ color: scales.accent[300] ?? theme.accent }}
        >
          حلول الطباعة والتجهيزات الدعائية
        </p>

        <p className="text-xl font-extrabold text-white md:text-2xl">
          نحوّل أفكارك إلى مطبوعات بين يديك
        </p>

        <p
          className="mt-3 max-w-md text-sm"
          style={{ color: scales.primary[300] ?? "#cccccc" }}
        >
          هكذا تظهر الواجهة الرئيسية بالألوان المختارة.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <span
            className="rounded-lg px-4 py-2.5 text-sm font-bold"
            style={{ backgroundColor: theme.accent, color: accentText }}
          >
            تصفّح المنتجات
          </span>
          <span
            className="rounded-lg border px-4 py-2.5 text-sm font-bold text-white"
            style={{ borderColor: scales.primary[700] ?? "#555" }}
          >
            شاهد أعمالنا
          </span>
        </div>
      </div>

      {/* بطاقة منتج على خلفية فاتحة */}
      <div className="bg-white p-5">
        <p
          className="text-[0.7rem] font-bold"
          style={{ color: scales.accent[700] ?? theme.accent }}
        >
          بوكسات وتغليف
        </p>
        <p className="mt-1 font-bold" style={{ color: scales.primary[950] ?? "#111" }}>
          بوكس كرتون مطبوع
        </p>
        <p className="mt-2 text-sm" style={{ color: scales.primary[600] ?? "#666" }}>
          يبدأ من <span className="font-bold">4.50</span> ر.س
        </p>
        <span
          className="mt-3 inline-block rounded-lg px-4 py-2 text-xs font-bold"
          style={{ backgroundColor: theme.accent, color: accentText }}
        >
          أضف للسلة
        </span>
      </div>
    </div>
  );
}
