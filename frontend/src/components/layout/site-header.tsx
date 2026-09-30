"use client";

import { LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
];

export function DemoStrip() {
  return (
    <div className="bg-navy px-4 py-1.5 text-center text-xs text-white">
      Demo project – sample data only. Not a real organisation. No fees are collected.
    </div>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between gap-4 px-4">
        <Brand />
        <button
          type="button"
          className="rounded-lg border border-line p-2 text-navy md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <nav
          className={cn(
            "absolute inset-x-0 top-full flex-col gap-1 border-b border-line bg-white p-4 md:static md:flex md:flex-row md:items-center md:border-0 md:p-0",
            open ? "flex" : "hidden",
          )}
        >
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2 font-medium text-navy hover:bg-primary-soft hover:text-primary",
                path === n.href && "bg-primary-soft text-primary",
              )}
            >
              {n.label}
            </Link>
          ))}
          <Button asChild size="sm" className="mt-2 md:mt-0 md:ml-2">
            <Link href="/login" onClick={() => setOpen(false)}>
              <LogIn /> Login / New Registration
            </Link>
          </Button>
        </nav>
      </div>
      <div className="tricolor" />
    </header>
  );
}
