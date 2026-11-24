/**
 * حفظ/مشاركة تهيئة المنتج (الخيارات + الكمية).
 *
 * - «احفظ لاحقًا»: localStorage لكل منتج، في هذا المتصفح فقط.
 * - «شارك»: رابط فيه التهيئة في الجزء بعد # (لا يصل للخادم ولا يُسجَّل)،
 *   فيفتح من تشاركه معه الصفحة بنفس الخيارات بعد تأكيده.
 * لا تُحفظ الملفات المرفوعة ولا الملاحظات الشخصية.
 */

export type SavedConfig = {
  v: 1;
  /** مفتاح المجموعة ← معرّف القيمة (أو مصفوفة معرّفات). */
  s: Record<string, string | string[]>;
  /** الكمية. */
  q: number;
};

const STORE_KEY = "fsat.saved-config.v1";
const HASH_KEY = "cfg=";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isConfig(value: unknown): value is SavedConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as SavedConfig;
  return (
    config.v === 1 &&
    typeof config.q === "number" &&
    typeof config.s === "object" &&
    config.s !== null
  );
}

export function encodeConfig(config: SavedConfig): string {
  return toBase64Url(JSON.stringify(config));
}

export function decodeConfig(encoded: string): SavedConfig | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(encoded));
    return isConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function shareUrl(config: SavedConfig): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${HASH_KEY}${encodeConfig(config)}`;
}

/** القيمة الخام للرابط (بعد cfg=) أو "". */
export function readHashRaw(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.startsWith(HASH_KEY) ? hash.slice(HASH_KEY.length) : "";
}

function readStore(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** القيمة الخام المحفوظة لمنتج أو "". */
export function readSavedRaw(productId: string): string {
  return readStore()[productId] ?? "";
}

export function writeSaved(productId: string, config: SavedConfig): void {
  try {
    const store = readStore();
    store[productId] = encodeConfig(config);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event("fsat:saved-config"));
  } catch {
    // التخزين معطّل — الزر يخبر العميل بأن الحفظ لم ينجح
    throw new Error("storage-unavailable");
  }
}

export function clearSaved(productId: string): void {
  try {
    const store = readStore();
    delete store[productId];
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event("fsat:saved-config"));
  } catch {
    // لا شيء
  }
}

/** اشتراك مصدر خارجي: تغيّر الرابط (#) أو الحفظ المحلي. */
export function subscribeConfig(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("fsat:saved-config", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("fsat:saved-config", onChange);
    window.removeEventListener("storage", onChange);
  };
}
