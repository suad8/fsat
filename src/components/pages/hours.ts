/**
 * ساعات العمل وحالة «مفتوح الآن» بتوقيت الرياض.
 *
 * نص ساعات العمل يحرّره المدير في الإعدادات كنص حر، لذلك نحاول فهمه
 * («السبت – الخميس: ٩ صباحًا – ٩ مساءً») وإن لم نفهمه بثقة لا نعرض أي حالة —
 * الأفضل ألا نُعلن «مفتوح الآن» بناءً على تخمين.
 *
 * السعودية بلا توقيت صيفي (UTC+3 ثابت) فلا حاجة لمكتبة مناطق زمنية.
 */

export type Schedule = {
  /** أيام العمل: 0 = الأحد … 6 = السبت. */
  days: number[];
  /** دقائق من منتصف الليل. */
  open: number;
  close: number;
};

const DAY_NAMES: { day: number; names: string[] }[] = [
  { day: 0, names: ["الاحد"] },
  { day: 1, names: ["الاثنين", "الإثنين"] },
  { day: 2, names: ["الثلاثاء"] },
  { day: 3, names: ["الاربعاء"] },
  { day: 4, names: ["الخميس"] },
  { day: 5, names: ["الجمعه", "الجمعة"] },
  { day: 6, names: ["السبت"] },
];

const DAY_LABEL = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** يوحّد الأرقام الشرقية والألف والتشكيل لتسهيل المطابقة. */
function normalize(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[ً-ٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه");
}

function toMinutes(hour: number, minute: number, period: "am" | "pm" | null): number {
  let h = hour;
  if (period === "pm" && h < 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  return h * 60 + minute;
}

export function parseWorkingHours(text: string): Schedule | null {
  const source = normalize(text);

  // --- الأيام: كلمتان = مدى («السبت – الخميس»)، كلمة واحدة = يوم واحد ---
  const found: { day: number; index: number }[] = [];
  for (const entry of DAY_NAMES) {
    for (const name of entry.names) {
      const index = source.indexOf(normalize(name));
      if (index !== -1) {
        found.push({ day: entry.day, index });
        break;
      }
    }
  }
  found.sort((a, b) => a.index - b.index);

  let days: number[] = [];
  if (found.length === 1) {
    days = [found[0].day];
  } else if (found.length === 2) {
    let current = found[0].day;
    days.push(current);
    while (current !== found[1].day && days.length < 8) {
      current = (current + 1) % 7;
      days.push(current);
    }
  } else if (/(يوميا|كل يوم)/.test(source)) {
    days = [0, 1, 2, 3, 4, 5, 6];
  } else {
    return null;
  }

  // --- الأوقات: رقمان بينهما فاصل، كل منهما بصباحًا/مساءً أو 24 ساعة ---
  const times = [
    ...source.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(صباحا|مساء|ظهرا|ص|م)?/g),
  ].filter((match) => match[3] !== undefined || match[2] !== undefined);

  if (times.length < 2) return null;

  const toPeriod = (word: string | undefined): "am" | "pm" | null =>
    word === "صباحا" || word === "ص" ? "am" : word ? "pm" : null;

  const open = toMinutes(
    Number(times[0][1]),
    Number(times[0][2] ?? 0),
    toPeriod(times[0][3]),
  );
  const close = toMinutes(
    Number(times[1][1]),
    Number(times[1][2] ?? 0),
    toPeriod(times[1][3]),
  );

  if (!(open >= 0 && close > open && close <= 24 * 60)) return null;

  return { days, open, close };
}

function formatClock(minutes: number): string {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "مساءً" : "صباحًا";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${period}`;
}

export type OpenStatus = { open: boolean; label: string };

export function getOpenStatus(schedule: Schedule, nowMs: number): OpenStatus {
  // الرياض = UTC+3 دائمًا
  const riyadh = new Date(nowMs + 3 * 3600 * 1000);
  const today = riyadh.getUTCDay();
  const minutes = riyadh.getUTCHours() * 60 + riyadh.getUTCMinutes();

  if (schedule.days.includes(today) && minutes >= schedule.open && minutes < schedule.close) {
    return { open: true, label: `مفتوح الآن · نغلق ${formatClock(schedule.close)}` };
  }

  // أقرب فتح قادم
  if (schedule.days.includes(today) && minutes < schedule.open) {
    return { open: false, label: `مغلق الآن · نفتح اليوم ${formatClock(schedule.open)}` };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const day = (today + offset) % 7;
    if (schedule.days.includes(day)) {
      const when = offset === 1 ? "غدًا" : `يوم ${DAY_LABEL[day]}`;
      return { open: false, label: `مغلق الآن · نفتح ${when} ${formatClock(schedule.open)}` };
    }
  }

  return { open: false, label: "مغلق الآن" };
}
