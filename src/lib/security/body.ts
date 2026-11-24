/**
 * قراءة جسم الطلب بحدّ أقصى صارم.
 *
 * request.json() و request.formData() يحمّلان الجسم كاملًا في الذاكرة دون سقف؛
 * طلب بحجم مئات الميغابايت (أو chunked بلا Content-Length) يستنزف الخادم.
 * هنا نرفض مبكرًا بـ Content-Length ثم نعدّ البايتات أثناء القراءة نفسها.
 */

export class BodyTooLargeError extends Error {
  constructor() {
    super("BODY_TOO_LARGE");
  }
}

export async function readBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  const declared = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();

  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/** JSON بحدّ حجم؛ يعيد null لأي جسم غير صالح. */
export async function readJsonLimited(
  request: Request,
  maxBytes: number,
): Promise<unknown | null> {
  const bytes = await readBodyLimited(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

/** multipart بحدّ حجم إجمالي؛ يعيد null إن تعذّر التحليل. */
export async function readFormLimited(
  request: Request,
  maxBytes: number,
): Promise<FormData | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;\s*boundary=/i.test(contentType)) return null;

  const bytes = await readBodyLimited(request, maxBytes);

  try {
    // نعيد بناء الطلب من البايتات التي قرأناها نحن (المحدودة) لا من الجسم الأصلي
    const copy = new Response(bytes as BodyInit, { headers: { "content-type": contentType } });
    return await copy.formData();
  } catch {
    return null;
  }
}
