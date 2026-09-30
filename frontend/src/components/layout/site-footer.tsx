"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";

export function SiteFooter() {
  const path = usePathname() ?? "";
  const live = path.startsWith("/register") || path.startsWith("/login");
  return (
    <footer className="bg-navy text-sm text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Brand dark />
          <p className="mt-3 max-w-md">
            A school data entry portal{live ? "" : " (demo)"} covering the complete operator workflow: registration, school-wise
            assignment, verification and earnings.
          </p>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-white">Quick links</h4>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-white" href="/about">About</Link></li>
            <li><Link className="hover:text-white" href="/services">Services</Link></li>
            <li><Link className="hover:text-white" href="/terms">Terms &amp; Conditions</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-2 font-semibold text-white">Portal</h4>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-white" href="/login">Login</Link></li>
            <li><Link className="hover:text-white" href="/register">New Registration</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-4 text-xs">
          <span>© {new Date().getFullYear()} National Academic Services of India</span>
          {!live && <span className="rounded bg-saffron/20 px-2 py-0.5 text-[#ffb65c]">Demo dashboards – sample data</span>}
        </div>
      </div>
    </footer>
  );
}
