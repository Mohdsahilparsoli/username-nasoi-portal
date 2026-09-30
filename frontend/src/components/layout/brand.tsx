import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ subtitle = "National Academic Services of India", dark, className }: { subtitle?: string; dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/brand/logo.png"
        alt="NASOI logo"
        width={48}
        height={48}
        className={cn("size-11 shrink-0 sm:size-12", dark && "rounded-full bg-white p-0.5")}
        priority
      />
      <span className="flex flex-col leading-tight">
        <strong className={cn("text-lg tracking-wide", dark ? "text-white" : "text-primary")}>NASOI</strong>
        <small className={cn("hidden text-[11px] sm:block", dark ? "text-slate-300" : "text-muted")}>{subtitle}</small>
      </span>
    </Link>
  );
}
