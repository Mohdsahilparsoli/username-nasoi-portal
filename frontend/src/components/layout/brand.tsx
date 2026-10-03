import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Logo + full name of the organisation (used in the website header and footer). */
export function Brand({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex min-w-0 items-center gap-3", className)} aria-label="National Academic Services of India – Home">
      <Image
        src="/brand/logo.png"
        alt="NASOI logo"
        width={64}
        height={64}
        unoptimized
        className={cn("size-12 shrink-0 sm:size-14", dark && "rounded-full bg-white p-0.5")}
        priority
      />
      <strong className={cn("text-[15px] font-bold leading-tight sm:text-lg", dark ? "text-white" : "text-primary")}>
        National Academic Services of India
      </strong>
    </Link>
  );
}
