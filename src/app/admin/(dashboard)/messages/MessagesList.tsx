"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteMessageAction,
  updateMessageStatusAction,
} from "@/app/admin/(dashboard)/actions/workflow";
import { AdminIcon } from "@/components/admin/AdminIcon";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { MessageStatusBadge } from "@/components/admin/StatusBadges";
import { adminDateTime, formatPhone, telLink, waLink } from "@/lib/admin/format";
import { messageReplyWhatsApp } from "@/lib/admin/messages";
import { formatAge } from "@/lib/admin/time";
import { cn } from "@/lib/utils";

export type MessageRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string | null;
  message: string;
  status: string;
  createdAt: Date;
};

/**
 * قائمة رسائل الموقع.
 *
 * فتح الرسالة يعلّمها «مقروءة» تلقائيًا — الخطوة اليدوية هنا لا تضيف شيئًا
 * وتُنسى غالبًا، فيبقى العدّاد مضلّلاً. الرد عبر واتساب يعلّمها «تم الرد».
 */
export function MessagesList({
  messages,
  nowIso,
}: {
  messages: MessageRow[];
  /** وقت الخادم وقت الرسم — يُمرَّر كي تتطابق «منذ كذا» بين الخادم والعميل. */
  nowIso: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const now = new Date(nowIso);

  function open(message: MessageRow) {
    const next = openId === message.id ? null : message.id;
    setOpenId(next);

    if (next && message.status === "NEW") {
      startTransition(async () => {
        const result = await updateMessageStatusAction(message.id, "READ");
        if (!result.ok) {
          toast.error("تعذّر تعليم الرسالة كمقروءة", result.error);
          return;
        }
        router.refresh();
      });
    }
  }

  function setStatus(id: string, status: string, success: string) {
    startTransition(async () => {
      const result = await updateMessageStatusAction(id, status);
      if (!result.ok) {
        toast.error("تعذّر التحديث", result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  async function remove(id: string, name: string) {
    const ok = await confirm({
      title: `حذف رسالة «${name}»؟`,
      description: "يُحذف النص نهائيًا ولا يمكن استرجاعه. للاحتفاظ بها استخدم «أرشفة».",
      confirmLabel: "احذف نهائيًا",
      tone: "danger",
    });
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteMessageAction(id);
      if (!result.ok) {
        toast.error("تعذّر الحذف", result.error);
        return;
      }
      toast.success("حُذفت الرسالة");
      router.refresh();
    });
  }

  return (
    <ul className="space-y-3">
      {messages.map((message) => {
        const isOpen = openId === message.id;
        const panelId = `msg-${message.id}`;

        return (
          <li
            key={message.id}
            className={cn(
              "border-border bg-surface rounded-xl border shadow-sm transition-opacity",
              pending && "opacity-70",
              message.status === "NEW" && "border-brand-500/40 border-s-4 border-s-(--color-brand-600)",
            )}
          >
            <button
              type="button"
              onClick={() => open(message)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className="flex w-full items-start gap-3 rounded-xl p-4 text-start"
            >
              <AdminIcon
                name="chevronDown"
                className={cn("text-primary-400 mt-1 size-4 shrink-0 transition-transform", isOpen && "rotate-180")}
                strokeWidth={2}
              />

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-primary-950", message.status === "NEW" ? "font-extrabold" : "font-bold")}>
                    {message.name}
                  </span>
                  <MessageStatusBadge status={message.status} />
                </span>

                <span className="text-primary-700 mt-1 block text-sm">{message.subject ?? "بدون موضوع"}</span>

                {!isOpen ? (
                  <span className="text-primary-500 mt-1 line-clamp-1 block text-xs">{message.message}</span>
                ) : null}
              </span>

              <span className="text-primary-500 shrink-0 text-xs whitespace-nowrap" title={adminDateTime(message.createdAt)}>
                {formatAge(message.createdAt, now)}
              </span>
            </button>

            <div id={panelId} hidden={!isOpen} className="border-border border-t p-4">
              <p className="text-primary-900 text-sm leading-[1.9] whitespace-pre-line">{message.message}</p>
              <p className="text-primary-500 mt-2 text-xs">{adminDateTime(message.createdAt)}</p>

              <div className="border-border mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                <a
                  href={waLink(message.phone, messageReplyWhatsApp(message))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (message.status !== "REPLIED") setStatus(message.id, "REPLIED", "عُلّمت كـ«تم الرد»");
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 text-xs font-bold text-[#052e14] transition-colors hover:bg-[#1EBE5A]"
                >
                  <AdminIcon name="whatsapp" className="size-4" />
                  رد على واتساب
                </a>

                <a
                  href={telLink(message.phone)}
                  className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition-colors"
                >
                  <AdminIcon name="phone" className="size-4" />
                  <span dir="ltr">{formatPhone(message.phone)}</span>
                </a>

                {message.email ? (
                  <a
                    href={`mailto:${message.email}`}
                    className="border-border-strong text-primary-800 hover:bg-surface-muted inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-bold transition-colors"
                  >
                    <AdminIcon name="mail" className="size-4" />
                    بريد
                  </a>
                ) : null}

                <span className="flex-1" />

                {message.status !== "REPLIED" ? (
                  <button
                    type="button"
                    onClick={() => setStatus(message.id, "REPLIED", "عُلّمت كـ«تم الرد»")}
                    className="text-success-700 hover:bg-success-50 min-h-10 rounded-lg px-3 text-xs font-bold transition-colors"
                  >
                    تعليم كـ«تم الرد»
                  </button>
                ) : null}

                {message.status !== "ARCHIVED" ? (
                  <button
                    type="button"
                    onClick={() => setStatus(message.id, "ARCHIVED", "نُقلت إلى الأرشيف")}
                    className="text-primary-700 hover:bg-surface-sunken min-h-10 rounded-lg px-3 text-xs font-bold transition-colors"
                  >
                    أرشفة
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus(message.id, "READ", "أُعيدت إلى الوارد")}
                    className="text-primary-700 hover:bg-surface-sunken min-h-10 rounded-lg px-3 text-xs font-bold transition-colors"
                  >
                    استرجاع
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => remove(message.id, message.name)}
                  className="text-danger-700 hover:bg-danger-50 min-h-10 rounded-lg px-3 text-xs font-bold transition-colors"
                >
                  حذف
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
