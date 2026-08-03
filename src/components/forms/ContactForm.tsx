"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

/** نموذج "اتصل بنا". */
export function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrors({});
    setMessage(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email") ?? "",
          subject: form.get("subject") ?? "",
          message: form.get("message"),
          website: form.get("website") ?? "",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setStatus("error");
        setErrors(result.errors ?? {});
        setMessage(result.message ?? "تعذّر إرسال الرسالة.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مرة أخرى.");
    }
  }

  if (status === "success") {
    return (
      <div className="border-success-500/30 bg-success-50 rounded-xl border p-8 text-center">
        <span className="bg-success-600 mx-auto mb-4 grid size-12 place-items-center rounded-full text-white">
          <Icon name="check" className="size-6" strokeWidth={2.5} />
        </span>

        <h3 className="text-lg font-bold">وصلتنا رسالتك</h3>

        <p className="text-primary-700 mx-auto mt-2.5 max-w-sm text-sm leading-relaxed">
          شكرًا لتواصلك. سيرد عليك فريقنا خلال يوم عمل واحد على الرقم الذي زوّدتنا به.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink
            href={whatsappGeneralUrl("/contact")}
            external
            variant="whatsapp"
            icon="whatsapp"
          >
            تواصل الآن على واتساب
          </ButtonLink>
          <ButtonLink href="/shop" variant="outline">
            تصفّح المنتجات
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {status === "error" && message ? (
        <Alert tone="danger" live title="تعذّر إرسال الرسالة">
          {message}
        </Alert>
      ) : null}

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="ct-website">اترك هذا الحقل فارغًا</label>
        <input id="ct-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          id="name"
          label="الاسم"
          required
          autoComplete="name"
          error={errors.name}
        />
        <TextInput
          id="phone"
          label="رقم الجوال"
          type="tel"
          required
          autoComplete="tel"
          placeholder="05XXXXXXXX"
          error={errors.phone}
        />
        <TextInput
          id="email"
          label="البريد الإلكتروني"
          type="email"
          optional
          autoComplete="email"
          error={errors.email}
        />
        <TextInput
          id="subject"
          label="موضوع الرسالة"
          optional
          placeholder="مثال: استفسار عن طباعة بوكسات"
          error={errors.subject}
        />
      </div>

      <TextArea
        id="message"
        label="الرسالة"
        required
        rows={5}
        placeholder="اكتب استفسارك أو ملاحظتك بالتفصيل."
        error={errors.message}
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={status === "submitting"}
        icon={status === "submitting" ? undefined : "mail"}
      >
        {status === "submitting" ? "جارٍ الإرسال…" : "إرسال الرسالة"}
      </Button>

      <p className="text-primary-500 text-center text-xs">
        نرد على الرسائل خلال يوم عمل واحد. للاستعجال، تواصل معنا على واتساب.
      </p>
    </form>
  );
}
