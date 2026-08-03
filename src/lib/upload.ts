import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { MAX_DESIGN_SIZE, MAX_IMAGE_SIZE } from "@/lib/constants";

/**
 * ============================================================================
 *  رفع الملفات
 * ============================================================================
 *  نموذج الحماية المطبَّق:
 *
 *  ١. لا يُوثق بـ file.type ولا بامتداد الملف — كلاهما يرسله المتصفّح ويمكن
 *     تزويره. النوع يُستنتج من البايتات الأولى للملف (magic bytes).
 *
 *  ٢. الصور تُعاد ترميزها بالكامل عبر sharp. إعادة الترميز تُسقط أي حمولة
 *     مضمّنة في البيانات الوصفية أو داخل ملف SVG، فالناتج صورة نقطية نظيفة
 *     أنشأناها نحن لا الملف الأصلي. لهذا السبب SVG غير مقبول أصلاً — فهو
 *     مستند XML قابل لتنفيذ سكربتات.
 *
 *  ٣. ملفات التصاميم (PDF, AI, PSD, ZIP) لا يمكن إعادة ترميزها، لذا تُحفظ
 *     خارج مجلد public ولا تُخدَم إلا عبر مسار محمي بجلسة لوحة التحكم.
 *
 *  ٤. أسماء الملفات تُولَّد عشوائيًا ولا يُستخدم الاسم الأصلي في المسار
 *     إطلاقًا — فلا مجال لاختراق المسار (path traversal) ولا للكتابة فوق ملف.
 * ============================================================================
 */

export type UploadKind = "image" | "design";

export type StoredFile = {
  /** الرابط العام للصور، أو معرّف داخلي لملفات التصاميم. */
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  /** true للملفات المحفوظة خارج public. */
  isPrivate: boolean;
};

export type UploadError = { error: string };

const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");
const PRIVATE_DIR = path.join(process.cwd(), "private-uploads");

// ---------------------------------------------------------------------------
// كشف النوع من البايتات الأولى
// ---------------------------------------------------------------------------

type Signature = {
  mime: string;
  extension: string;
  kind: "raster" | "document";
  test: (bytes: Uint8Array) => boolean;
};

function startsWith(bytes: Uint8Array, prefix: number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) return false;
  return prefix.every((byte, index) => bytes[offset + index] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

const SIGNATURES: Signature[] = [
  {
    mime: "image/jpeg",
    extension: "jpg",
    kind: "raster",
    test: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  {
    mime: "image/png",
    extension: "png",
    kind: "raster",
    test: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    mime: "image/webp",
    extension: "webp",
    kind: "raster",
    test: (b) => asciiAt(b, 0, "RIFF") && asciiAt(b, 8, "WEBP"),
  },
  {
    mime: "image/avif",
    extension: "avif",
    kind: "raster",
    test: (b) => asciiAt(b, 4, "ftypavif") || asciiAt(b, 4, "ftypavis"),
  },
  {
    mime: "image/tiff",
    extension: "tiff",
    kind: "raster",
    test: (b) => startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a]),
  },
  {
    // ملفات Illustrator الحديثة مبنية على PDF فتلتقطها هذه التوقيعة نفسها
    mime: "application/pdf",
    extension: "pdf",
    kind: "document",
    test: (b) => asciiAt(b, 0, "%PDF-"),
  },
  {
    mime: "application/postscript",
    extension: "eps",
    kind: "document",
    test: (b) => asciiAt(b, 0, "%!PS") || startsWith(b, [0xc5, 0xd0, 0xd3, 0xc6]),
  },
  {
    mime: "image/vnd.adobe.photoshop",
    extension: "psd",
    kind: "document",
    test: (b) => asciiAt(b, 0, "8BPS"),
  },
  {
    mime: "application/zip",
    extension: "zip",
    kind: "document",
    test: (b) =>
      startsWith(b, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWith(b, [0x50, 0x4b, 0x05, 0x06]) ||
      startsWith(b, [0x50, 0x4b, 0x07, 0x08]),
  },
];

function detect(bytes: Uint8Array): Signature | null {
  return SIGNATURES.find((signature) => signature.test(bytes)) ?? null;
}

// ---------------------------------------------------------------------------
// الحفظ
// ---------------------------------------------------------------------------

/** اسم عشوائي — الاسم الأصلي يُحفظ في القاعدة للعرض فقط، لا في المسار. */
function randomName(extension: string): string {
  const stamp = Date.now().toString(36);
  return `${stamp}-${randomBytes(8).toString("hex")}.${extension}`;
}

/** تنظيف الاسم الأصلي قبل تخزينه كنص للعرض. */
function safeDisplayName(name: string): string {
  return name
    .replace(/[\r\n\t]/g, " ")
    .replace(/[/\\]/g, "-")
    .trim()
    .slice(0, 200);
}

export async function storeUpload(
  file: File,
  kind: UploadKind,
  folder = "uploads",
): Promise<StoredFile | UploadError> {
  const maxSize = kind === "image" ? MAX_IMAGE_SIZE : MAX_DESIGN_SIZE;

  if (file.size === 0) {
    return { error: "الملف فارغ." };
  }

  if (file.size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    return { error: `حجم الملف يتجاوز الحد المسموح (${mb} ميجابايت).` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = detect(new Uint8Array(buffer.subarray(0, 32)));

  if (!signature) {
    return {
      error:
        "صيغة الملف غير مدعومة. الصيغ المقبولة: JPG، PNG، WEBP، PDF، AI، PSD، ZIP.",
    };
  }

  const displayName = safeDisplayName(file.name || `ملف.${signature.extension}`);

  // --- الصور: إعادة ترميز كاملة ---
  if (signature.kind === "raster") {
    try {
      const pipeline = sharp(buffer, { failOn: "error" }).rotate(); // rotate() يطبّق اتجاه EXIF ثم يسقطه

      const metadata = await pipeline.metadata();

      // حدّ أعلى للأبعاد يمنع صور "قنبلة الضغط" التي تستهلك الذاكرة عند الفك
      if ((metadata.width ?? 0) > 12000 || (metadata.height ?? 0) > 12000) {
        return { error: "أبعاد الصورة كبيرة جدًا." };
      }

      const output = await pipeline
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });

      const filename = randomName("webp");
      const directory = path.join(PUBLIC_DIR, folder);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), output.data);

      return {
        url: `/uploads/${folder}/${filename}`,
        filename,
        originalName: displayName,
        mimeType: "image/webp",
        size: output.data.byteLength,
        width: output.info.width,
        height: output.info.height,
        isPrivate: false,
      };
    } catch {
      return { error: "تعذّرت معالجة الصورة. تأكّد أن الملف صورة سليمة." };
    }
  }

  // --- ملفات التصاميم: حفظ خارج public ---
  if (kind !== "design") {
    return { error: "هذا الحقل يقبل الصور فقط." };
  }

  const filename = randomName(signature.extension);
  await mkdir(PRIVATE_DIR, { recursive: true });
  await writeFile(path.join(PRIVATE_DIR, filename), buffer);

  return {
    // يُخدَم عبر /api/admin/files/[filename] المحمي بجلسة الإدارة
    url: `/api/admin/files/${filename}`,
    filename,
    originalName: displayName,
    mimeType: signature.mime,
    size: buffer.byteLength,
    isPrivate: true,
  };
}

/** يمنع الخروج من مجلد الملفات الخاصة عبر أسماء مثل "../../etc/passwd". */
export function resolvePrivateFile(filename: string): string | null {
  // الأسماء المولَّدة تطابق هذا النمط حصرًا
  if (!/^[a-z0-9]+-[a-f0-9]{16}\.[a-z0-9]{1,5}$/i.test(filename)) return null;

  const resolved = path.resolve(PRIVATE_DIR, filename);
  if (!resolved.startsWith(path.resolve(PRIVATE_DIR) + path.sep)) return null;

  return resolved;
}
