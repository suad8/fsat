"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  deleteMessageAction,
  updateMessageStatusAction,
} from "@/app/admin/(dashboard)/actions/workflow";
import { StatusBadge } from "@/components/admin/AdminUi";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { MESSAGE_STATUS_LABELS, type MessageStatus } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

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

const TONES: Record<string, string> = {
  NEW: "bg-info-50 text-info-700 ring-info-500/20",
  READ: "bg-primary-100 text-primary-700 ring-primary-500/20",
  REPLIED: "bg-success-50 text-success-700 ring-success-500/20",
  ARCHIVED: "bg-primary-100 text-primary-500 ring-primary-500/20",
};

/**
 * قائمة رسائل الموقع.
 *
 * فتح الرسالة يعلّمها "مقروءة" تلقائيًا — الخطوة اليدوية هنا لا تضيف شيئًا
 * وتُنسى غالبًا، فيبقى العدّاد مضلّلاً.
 */
export function MessagesList({ messages }: { messages: MessageRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  function open(message: MessageRow) {
    const next = openId === message.id ? null : message.id;
    setOpenId(next);

    if (next && message.status === "NEW") {
      startTransition(async () => {
        await updateMessageStatusAction(message.id, "READ");
        router.refresh();
      });
    }
  }

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      const result = await updateMessageStatusAction(id, status);
      if (!result.ok) {
        setError(result.error ?? "تعذّر التحديث.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`هل تريد حذف رسالة «${name}»؟`)) return;

    startTransition(async () => {
      const result = await deleteMessageAction(id);
      if (!result.ok) {
        setError(result.error ?? "تعذّر الحذف.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="danger" live>
          {error}
        </Alert>
      ) : null}

      <ul className="space-y-3">
        {messages.map((message) => {
          const isOpen = openId === message.id;

          return (
            <li
              key={message.id}
              className={cn(
                "border-border bg-surface rounded-xl border shadow-sm transition-opacity",
                pending && "opacity-70",
                message.status === "NEW" && "border-info-500/40",
              )}
            >
              <button
                type="button"
                onClick={() => open(message)}
                aria-expanded={isOpen}
                className="focus-visible:outline-accent-600 flex w-full items-start gap-3 p-4 text-right focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <Icon
                  name="chevronDown"
                  className={cn(
                    "text-primary-400 mt-1 size-4 shrink-0 transition-transform",
                    isOpen && "rotate-180",
                  )}
                  strokeWidth={2}
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{message.name}</span>
                    <StatusBadge
                      label={
                        MESSAGE_STATUS_LABELS[message.status as MessageStatus] ??
                        message.status
                      }
                      tone={TONES[message.status] ?? ""}
                    />
                  </span>

                  <span className="text-primary-600 mt-1 block text-sm">
                    {message.subject ?? "بدون موضوع"}
                  </span>

                  {!isOpen ? (
                    <span className="text-primary-500 mt-1 line-clamp-1 block text-xs">
                      {message.message}
                    </span>
                  ) : null}
                </span>

                <span className="text-primary-400 shrink-0 text-xs whitespace-nowrap">
                  {formatDateTime(message.createdAt)}
                </span>
              </button>

              {isOpen ? (
                <div className="border-border border-t p-4">
                  <p className="text-primary-800 text-sm leading-[1.9] whitespace-pre-line">
                    {message.message}
                  </p>

                  <div className="border-border mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    <a
                      href={`https://wa.me/${message.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1EBE5A]"
                    >
                      <Icon name="whatsapp" className="size-4" />
                      رد على واتساب
                    </a>

                    <a
                      href={`tel:+${message.phone}`}
                      className="border-border-strong text-primary-700 hover:bg-surface-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors"
                      dir="ltr"
                    >
                      <Icon name="phone" className="size-4" />
                      {message.phone}
                    </a>

                    {message.email ? (
                      <a
                        href={`mailto:${message.email}`}
                        className="border-border-strong text-primary-700 hover:bg-surface-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors"
                      >
                        <Icon name="mail" className="size-4" />
                        بريد
                      </a>
                    ) : null}

                    <span className="flex-1" />

                    {message.status !== "REPLIED" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(message.id, "REPLIED")}
                        className="text-success-700 hover:bg-success-50 rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                      >
                        تعليم كـ «تم الرد»
                      </button>
                    ) : null}

                    {message.status !== "ARCHIVED" ? (
                      <button
                        type="button"
                        onClick={() => setStatus(message.id, "ARCHIVED")}
                        className="text-primary-600 hover:bg-surface-sunken rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                      >
                        أرشفة
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => remove(message.id, message.name)}
                      className="text-danger-600 hover:bg-danger-50 rounded-lg px-3 py-2 text-xs font-bold transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
