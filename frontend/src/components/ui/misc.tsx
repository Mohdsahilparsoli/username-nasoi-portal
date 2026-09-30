import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EntryStatus } from "@/types";

/* ---------------- Badge ---------------- */
const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    tone: {
      green: "bg-success-soft text-success",
      red: "bg-danger-soft text-danger",
      amber: "bg-warning-soft text-warning",
      blue: "bg-info-soft text-info",
      grey: "bg-slate-100 text-muted",
      saffron: "bg-saffron text-white",
      primary: "bg-primary-soft text-primary",
    },
  },
  defaultVariants: { tone: "grey" },
});

export function Badge({ tone, className, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_TONE = { pending: "amber", approved: "green", rejected: "red" } as const;
export function StatusBadge({ status }: { status: EntryStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/* ---------------- Stat card ---------------- */
const toneBorder = {
  navy: "border-t-navy",
  green: "border-t-success",
  red: "border-t-danger",
  amber: "border-t-amber-500",
  blue: "border-t-info",
  saffron: "border-t-saffron bg-saffron-soft",
};
const toneIcon = {
  navy: "bg-primary-soft text-primary",
  green: "bg-success-soft text-success",
  red: "bg-danger-soft text-danger",
  amber: "bg-warning-soft text-warning",
  blue: "bg-info-soft text-info",
  saffron: "bg-white text-saffron-dark",
};
export type Tone = keyof typeof toneBorder;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "navy",
  href,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[13px] text-muted">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-navy">{value}</p>
      </div>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneIcon[tone])}>
        <Icon className="size-[18px]" />
      </span>
    </div>
  );
  const cls = cn(
    "block rounded-xl border border-line border-t-4 bg-white p-4 text-left shadow-sm transition",
    toneBorder[tone],
    (href || onClick) && "hover:-translate-y-0.5 hover:shadow-md",
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn(cls, "w-full")}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">{children}</div>;
}

/* ---------------- Alert ---------------- */
const alertTone = {
  blue: "border-info bg-info-soft text-[#174ea6]",
  green: "border-success bg-success-soft text-success",
  red: "border-danger bg-danger-soft text-danger",
  amber: "border-saffron bg-saffron-soft text-[#7a4a00]",
};
export function Alert({
  tone = "blue",
  icon: Icon,
  className,
  children,
}: {
  tone?: keyof typeof alertTone;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border-l-4 px-4 py-3 text-sm", alertTone[tone], className)}>
      {Icon && <Icon className="mt-0.5 size-4 shrink-0" />}
      <div className="[&_a]:font-semibold [&_a]:underline">{children}</div>
    </div>
  );
}

/* ---------------- Page heading ---------------- */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Progress ---------------- */
export function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>
          {value} / {max} entries
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------------- Detail list ---------------- */
export function DetailGrid({ items, className }: { items: [string, React.ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="font-medium break-words">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- Skeleton & empty ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}

export function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted">
      <Icon className="size-8 text-slate-300" />
      {text}
    </div>
  );
}
