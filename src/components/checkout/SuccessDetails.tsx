"use client";

import Link from "next/link";
import { useRef, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";

import { CopyButton } from "@/components/shop/CopyButton";
import { ShopIcon } from "@/components/shop/ShopIcon";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Price } from "@/components/ui/Price";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { readLastOrder, subscribeNever } from "@/lib/shop/last-order";
import { whatsappOrderUrl } from "@/lib/shop/wa";
import { cn } from "@/lib/utils";

export type PaymentGuide = { label: string; title: string; steps: string[] };

export type BankAccountView = { bankName: string; accountName: string; iban: string };

/**
 * تفاصيل نجاح الطلب. تُبنى من لقطة آخر طلب في sessionStorage (المبلغ والجوال
 * وطريقة الدفع) ولا تعتمد على أي قيمة قابلة للتعديل في الرابط سوى رقم الطلب.
 * بدون اللقطة (فتح الرابط لاحقًا) تعرض رقم الطلب وطريقة تتبّعه.
 */
export function SuccessDetails({
  orderNumber,
  guides,
  bankAccounts,
}: {
  orderNumber: string;
  guides: Record<string, PaymentGuide>;
  bankAccounts: BankAccountView[];
}) {
  const snapshot = useSyncExternalStore(subscribeNever, readLastOrder, () => null);
  const last = snapshot && snapshot.orderNumber === orderNumber ? snapshot : null;

  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-pop]",
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.8)", clearProps: "opacity,transform" },
        );
        gsap.fromTo(
          "[data-rise]",
          { y: 16, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.08,
            delay: 0.25,
            ease: "power3.out",
            clearProps: "opacity,transform",
          },
        );
      });
      return () => mm.revert();
    },
    { scope },
  );

  const guide = last ? guides[last.paymentMethod] : undefined;
  const isBank = last?.paymentMethod === "BANK_TRANSFER";
  const firstName = last?.name.split(/\s+/)[0];

  const steps: { title: string; text: string; state: "done" | "next" | "later" }[] = [
    { title: "وصلنا طلبك", text: "حفظنا طلبك برقمه أدناه.", state: "done" },
    {
      title: "نراجع ونتواصل معك",
      text: "نراجع المواصفات وملفات التصميم فنيًا، ونتواصل معك على واتساب خلال يوم عمل لتأكيد التفاصيل.",
      state: "next",
    },
    ...(guide
      ? [{ title: guide.title, text: guide.steps.join(" "), state: "later" as const }]
      : []),
    {
      title: last?.fulfillment === "PICKUP" ? "نبلغك عند الجاهزية" : "التنفيذ والشحن",
      text:
        last?.fulfillment === "PICKUP"
          ? "يبدأ الإنتاج، ونبلغك على واتساب فور جاهزية الطلب للاستلام من الفرع."
          : "يبدأ الإنتاج، ثم نشحن الطلب إلى عنوانك ونرسل لك التحديثات على واتساب.",
      state: "later",
    },
  ];

  return (
    <div ref={scope} className="mx-auto max-w-3xl">
      <div className="text-center">
        <span
          data-pop
          className="bg-success-600 shadow-card mx-auto mb-6 grid size-20 place-items-center rounded-full text-white ring-8 ring-success-100"
        >
          <Icon name="check" className="size-10" strokeWidth={2.6} />
        </span>

        <h1 data-rise className="text-3xl font-black md:text-4xl">
          {firstName ? `شكرًا ${firstName}، ` : ""}تم استلام طلبك
        </h1>
        <p data-rise className="text-primary-600 mx-auto mt-3 max-w-xl leading-relaxed">
          لم يُخصم منك أي مبلغ. فريقنا سيراجع الطلب ويتواصل معك قريبًا لتأكيده.
        </p>
      </div>

      {/* رقم الطلب */}
      <div
        data-rise
        className="border-border bg-surface shadow-card mt-8 rounded-2xl border p-5 text-center md:p-7"
      >
        <p className="text-primary-500 text-xs font-bold">رقم طلبك</p>
        <p
          className="text-primary-950 mt-2 font-mono text-3xl font-black tracking-wide md:text-4xl"
          dir="ltr"
        >
          {orderNumber}
        </p>

        {last ? (
          <div className="border-border mx-auto mt-5 flex max-w-xs items-center justify-center gap-3 border-t pt-5">
            <span className="text-primary-600 text-sm">إجمالي الطلب</span>
            <Price value={last.total} size="lg" />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <CopyButton value={orderNumber} label="نسخ رقم الطلب" />
          <ButtonLink
            href={whatsappOrderUrl(orderNumber, "confirm")}
            external
            variant="whatsapp"
            icon="whatsapp"
            className="min-h-11"
          >
            تأكيد الطلب على واتساب
          </ButtonLink>
        </div>

        <p className="text-primary-500 mt-4 text-xs leading-relaxed">
          احتفظ بالرقم؛ تتبّع طلبك لاحقًا برقمه وجوالك المسجّل من صفحة{" "}
          <Link
            href={`/track?order=${encodeURIComponent(orderNumber)}`}
            className="text-accent-800 font-bold underline underline-offset-2"
          >
            تتبّع الطلب
          </Link>
          .
        </p>
      </div>

      {/* تعليمات الدفع بالتحويل */}
      {isBank ? (
        <section data-rise className="border-accent-500/40 bg-accent-50/50 mt-6 rounded-2xl border p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShopIcon name="bank" className="text-accent-700 size-5" />
            إتمام الدفع بالتحويل البنكي
          </h2>

          {bankAccounts.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {bankAccounts.map((account) => (
                <li key={account.iban} className="border-border bg-surface rounded-xl border p-4">
                  <p className="text-sm font-bold">{account.bankName}</p>
                  <p className="text-primary-600 text-xs">{account.accountName}</p>
                  <p className="mt-2 font-mono text-sm tracking-wide break-all" dir="ltr">
                    {account.iban}
                  </p>
                  <CopyButton value={account.iban} label="نسخ الآيبان" className="mt-3 min-h-11" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-primary-700 mt-2 text-sm leading-relaxed">
              سنرسل لك بيانات الحساب البنكي على واتساب عند تأكيد طلبك، ثم تحوّل المبلغ وترسل
              لنا صورة الإيصال.
            </p>
          )}

          <ButtonLink
            href={whatsappOrderUrl(orderNumber, "receipt")}
            external
            variant="whatsapp"
            icon="whatsapp"
            className="mt-4 min-h-12"
          >
            أرسل إيصال التحويل على واتساب
          </ButtonLink>
        </section>
      ) : null}

      {/* ماذا بعد؟ */}
      <section data-rise className="mt-8">
        <h2 className="mb-4 text-lg font-bold">ماذا سيحدث الآن؟</h2>
        <ol className="border-border bg-surface rounded-2xl border p-5 md:p-6">
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="bg-border-strong absolute start-[1.05rem] top-9 bottom-1 w-px"
                />
              ) : null}
              <span
                className={cn(
                  "z-10 grid size-9 shrink-0 place-items-center rounded-full text-sm font-black",
                  step.state === "done" && "bg-success-600 text-white",
                  step.state === "next" && "bg-accent-500 text-accent-contrast",
                  step.state === "later" && "bg-surface-sunken text-primary-600",
                )}
              >
                {step.state === "done" ? (
                  <Icon name="check" className="size-4" strokeWidth={2.8} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 pt-1">
                <b className="text-primary-950 block text-sm">{step.title}</b>
                <span className="text-primary-600 mt-1 block text-sm leading-relaxed">
                  {step.text}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div data-rise className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink
          href={`/track?order=${encodeURIComponent(orderNumber)}`}
          size="lg"
          className="min-h-13"
        >
          تتبّع طلبك
        </ButtonLink>
        <ButtonLink href="/shop" size="lg" variant="outline" className="min-h-13">
          متابعة التسوّق
        </ButtonLink>
      </div>
    </div>
  );
}
