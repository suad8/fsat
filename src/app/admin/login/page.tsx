import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/app/admin/login/LoginForm";
import { brand } from "@/config/brand";

/*
 * ديناميكية عمدًا: CSP لوحة الإدارة يعتمد nonce يُولَّد لكل طلب في src/proxy.ts،
 * والصفحة الساكنة المولَّدة وقت البناء لا تحمل nonce فتُحجب سكربتاتها.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تسجيل الدخول — لوحة التحكم",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="bg-surface-sunken flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span
            aria-hidden="true"
            className="bg-primary-950 mx-auto mb-4 grid size-12 place-items-center rounded-xl text-xl font-black text-white"
          >
            {brand.nameShort.charAt(0)}
          </span>

          <h1 className="text-xl font-bold">لوحة تحكم {brand.nameShort}</h1>
          <p className="text-primary-500 mt-1.5 text-sm">
            سجّل دخولك لإدارة المتجر والمحتوى
          </p>
        </div>

        <div className="border-border bg-surface shadow-card rounded-xl border p-6">
          <Suspense fallback={<div className="h-64 animate-pulse" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-primary-500 mt-6 text-center text-xs">
          <Link href="/" className="hover:text-primary-900 transition-colors">
            ← العودة إلى الموقع
          </Link>
        </p>
      </div>
    </div>
  );
}
