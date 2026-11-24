"use client";

import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { whatsappGeneralUrl } from "@/lib/whatsapp";

/**
 * نموذج «اتصل بنا» القصير: ثلاثة حقول فقط (الاسم، الجوال، الرسالة).
 * البريد اختياري ومطوي حتى لا يطيل النموذج على من لا يحتاجه.
 */
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
          subject: "",
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
      <div className="py-6 text-center md:py-10">
        <span className="bg-success-600 mx-auto mb-5 grid size-14 place-items-center rounded-full text-white">
          <Icon name="check" className="size-7" strokeWidth={2.5} />
        </span>

        <h3 className="text-xl font-black">وصلتنا رسالتك</h3>

        <p className="text-primary-600 mx-auto mt-3 max-w-sm text-sm leading-relaxed">
          شكرًا لتواصلك. سيردّ عليك فريقنا خلال يوم عمل على الرقم الذي زوّدتنا به. وإن كان
          الأمر عاجلًا فواتساب أسرع.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink
            href={whatsappGeneralUrl("/contact")}
            external
            variant="whatsapp"
            icon="whatsapp"
          >
            تابع على واتساب
          </ButtonLink>
          <ButtonLink href="/quote" variant="outline">
            اطلب عرض سعر
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
          inputMode="tel"
          placeholder="05XXXXXXXX"
          error={errors.phone}
        />
      </div>

      <TextArea
        id="message"
        label="رسالتك"
        required
        rows={4}
        placeholder="اكتب استفسارك باختصار: ماذا تريد أن تطبع، وبأي كمية تقريبًا؟"
        error={errors.message}
      />

      <details className="group" open={Boolean(errors.email)}>
        <summary className="text-primary-600 hover:text-primary-950 flex cursor-pointer list-none items-center gap-2 text-sm font-bold">
          <Icon
            name="plus"
            className="size-4 transition-transform group-open:rotate-45"
            strokeWidth={2}
          />
          أضف بريدك الإلكتروني (اختياري)
        </summary>
        <div className="mt-3">
          <TextInput
            id="email"
            label="البريد الإلكتروني"
            type="email"
            optional
            autoComplete="email"
            error={errors.email}
          />
        </div>
      </details>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={status === "submitting"}
        icon={status === "submitting" ? undefined : "mail"}
      >
        {status === "submitting" ? "جارٍ الإرسال…" : "إرسال الرسالة"}
      </Button>
    </form>
  );
}
