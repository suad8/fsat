import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "brand"
  | "outline"
  | "ghost"
  | "whatsapp"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 font-bold rounded-lg " +
  "transition-[background-color,color,box-shadow,transform] duration-200 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.985] " +
  "whitespace-nowrap";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-950 text-white hover:bg-primary-900 shadow-sm focus-visible:outline-primary-950",
  /*
   * لون النص محسوب لا ثابت: `accent-contrast` يُولَّد من سطوع اللون المميّز
   * عند حفظ الثيم. هكذا يبقى الزر مقروءًا سواء اختارت الإدارة ذهبيًا فاتحًا
   * (فيصير النص داكنًا) أو أزرق غامقًا (فيصير أبيض).
   */
  accent:
    "bg-accent-500 text-accent-contrast hover:bg-accent-400 shadow-sm focus-visible:outline-accent-600",
  brand:
    "bg-brand-600 text-brand-contrast hover:bg-brand-700 shadow-sm focus-visible:outline-brand-700",
  outline:
    "border border-border-strong bg-surface text-primary-900 hover:bg-surface-muted hover:border-primary-400 focus-visible:outline-primary-700",
  ghost: "text-primary-700 hover:bg-surface-sunken hover:text-primary-950",
  // لون واتساب الرسمي — ثابت عمدًا ولا يتبع تدرّج الهوية حتى يبقى معروفًا فورًا
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1EBE5A] shadow-sm focus-visible:outline-[#1EBE5A]",
  danger: "bg-danger-600 text-white hover:bg-danger-700 focus-visible:outline-danger-700",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "text-sm px-3.5 py-2 min-h-9",
  md: "text-sm px-5 py-2.5 min-h-11",
  lg: "text-base px-7 py-3.5 min-h-13",
};

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** أيقونة قبل النص (على يمين النص في الواجهة العربية). */
  icon?: IconName;
  /** أيقونة بعد النص. */
  iconAfter?: IconName;
  fullWidth?: boolean;
  children?: ReactNode;
  className?: string;
};

function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: SharedProps) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

function Content({ icon, iconAfter, children }: SharedProps) {
  return (
    <>
      {icon && <Icon name={icon} className="size-[1.15em]" />}
      {children}
      {iconAfter && <Icon name={iconAfter} className="size-[1.15em]" />}
    </>
  );
}

type ButtonProps = SharedProps & Omit<ComponentProps<"button">, "className" | "children">;

export function Button({
  variant,
  size,
  icon,
  iconAfter,
  fullWidth,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      <Content icon={icon} iconAfter={iconAfter}>
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = SharedProps &
  Omit<ComponentProps<typeof Link>, "className" | "children"> & {
    /** يفتح في تبويب جديد ويضيف rel الآمن تلقائيًا. */
    external?: boolean;
  };

export function ButtonLink({
  variant,
  size,
  icon,
  iconAfter,
  fullWidth,
  className,
  children,
  external,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    >
      <Content icon={icon} iconAfter={iconAfter}>
        {children}
      </Content>
    </Link>
  );
}

/** زر أيقونة مربّع — يتطلب label لإمكانية الوصول. */
export function IconButton({
  name,
  label,
  variant = "ghost",
  size = "md",
  className,
  ...props
}: {
  name: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & Omit<ComponentProps<"button">, "className" | "children">) {
  const box = size === "sm" ? "size-9" : size === "lg" ? "size-13" : "size-11";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(BASE, VARIANTS[variant], box, "p-0", className)}
      {...props}
    >
      <Icon name={name} />
    </button>
  );
}
