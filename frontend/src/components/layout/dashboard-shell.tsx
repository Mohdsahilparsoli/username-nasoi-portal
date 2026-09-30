"use client";

import {
  CircleCheck, CirclePlus, CircleX, ClipboardList, FileText, Folder, LayoutDashboard, LogOut, MapPin, Menu,
  Search, SlidersHorizontal, Target, User, Users, Wallet, type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { useAssignments } from "@/features/assignments/hooks";
import { useEntries } from "@/features/entries/hooks";
import * as authApi from "@/lib/api/auth";
import { ROLE_META } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { useSessionStore, type SessionInfo } from "@/stores/session-store";
import { useUiStore } from "@/stores/ui-store";
import { useSessionHydrated } from "@/stores/use-session-hydrated";
import type { Role } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "newAssignments" | "pending";
  exact?: boolean;
  external?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  deo: [
    { href: "/deo", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/deo/profile", label: "Profile & Bank", icon: User },
    { href: "/deo/work", label: "Work Status", icon: MapPin, badge: "newAssignments" },
    { href: "/deo/entries", label: "My Entries", icon: ClipboardList, exact: true },
    { href: "/deo/entries/new", label: "New Add Entry", icon: CirclePlus },
    { href: "/deo/earnings", label: "Earnings & History", icon: Wallet },
  ],
  verifier: [
    { href: "/verifier", label: "Verify Data", icon: Search, badge: "pending", exact: true },
    { href: "/verifier/approved", label: "Approved", icon: CircleCheck },
    { href: "/verifier/rejected", label: "Rejected", icon: CircleX },
    { href: "/verifier/profile", label: "Profile", icon: User },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/admin/operators", label: "Operators (DEO)", icon: Users },
    { href: "/admin/assign", label: "Assign Work", icon: Target },
    { href: "/admin/assignments", label: "All Assignments", icon: Folder },
    { href: "/admin/entries", label: "All Entries", icon: ClipboardList },
    { href: "/admin/payouts", label: "Payouts", icon: Wallet },
    { href: "/admin/settings", label: "Settings", icon: SlidersHorizontal },
  ],
};

const MeContext = createContext<(SessionInfo & { role: Role }) | null>(null);

/** Logged-in user of the current panel (DEO / Verifier / Admin). */
export function useMe() {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe must be used inside DashboardShell");
  return me;
}

export function DashboardShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const session = useSessionStore((s) => s.sessions[role]);
  const signOut = useSessionStore((s) => s.signOut);
  const { sidebarOpen, setSidebar, toggleSidebar } = useUiStore();
  // Session lives in browser storage: wait for it before deciding.
  const hydrated = useSessionHydrated();

  // The stored session is only a hint for the UI. Access is decided by the
  // server: the httpOnly refresh cookie must give us a valid access token.
  const [verified, setVerified] = useState<string | null>(null);
  const sessionId = session?.id;
  useEffect(() => {
    if (!hydrated) return;
    if (!sessionId) {
      router.replace("/login");
      return;
    }
    let alive = true;
    const check = () =>
      authApi
        .accessToken(role)
        .then(() => alive && setVerified(sessionId))
        .catch((e) => {
          if (!alive) return;
          // Network trouble: keep the user in; an expired/revoked session: sign out.
          if (e instanceof authApi.AuthError && e.status === 0) return setVerified(sessionId);
          signOut(role);
          router.replace("/login");
        });
    check();
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated, sessionId, role, router, signOut]);

  useEffect(() => setSidebar(false), [path, setSidebar]);

  if (!hydrated || !session || verified !== session.id) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-sm text-muted">
          <Image src="/brand/logo.png" alt="" width={64} height={64} className="size-16 animate-pulse" />
          Loading your dashboard…
        </div>
      </div>
    );
  }

  const logout = async () => {
    await authApi.logout(role);
    signOut(role);
    router.replace("/login");
  };

  return (
    <MeContext.Provider value={{ ...session, role }}>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center gap-3 bg-white px-3 shadow-[0_1px_0_var(--color-line)] sm:px-5">
        <button type="button" onClick={toggleSidebar} className="rounded-lg border border-line p-2 text-navy lg:hidden" aria-label="Menu">
          <Menu className="size-5" />
        </button>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/logo.png" alt="NASOI" width={44} height={44} className="size-10 sm:size-11" />
          <span className="leading-tight">
            <strong className="block text-primary">NASOI</strong>
            <small className="hidden text-[11px] text-muted sm:block">{ROLE_META[role].label} Panel</small>
          </span>
        </Link>
        <span className="hidden rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-semibold text-white sm:inline">{ROLE_META[role].short}</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <b className="block text-sm text-navy">{session.name}</b>
            <small className="text-xs text-muted">{session.id}</small>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">{initials(session.name)}</span>
          <button type="button" onClick={logout} className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-navy hover:bg-canvas sm:inline-flex">
            <LogOut className="size-4" /> Logout
          </button>
        </div>
        <div className="tricolor absolute inset-x-0 -bottom-1" />
      </header>

      {sidebarOpen && <div className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden" onClick={() => setSidebar(false)} />}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-16 z-30 w-64 overflow-y-auto bg-navy px-3 py-4 transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <nav className="space-y-1">
          {NAV[role].map((item) => (
            <SideLink key={item.href} item={item} active={item.exact ? path === item.href : path.startsWith(item.href)} role={role} userId={session.id} />
          ))}
          <p className="px-3.5 pb-1.5 pt-5 text-[11px] uppercase tracking-widest text-slate-400">Account</p>
          {role === "deo" && (
            <a href="/terms" target="_blank" className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white">
              <FileText className="size-[18px]" /> Terms &amp; Conditions
            </a>
          )}
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut className="size-[18px]" /> Logout
          </button>
        </nav>
      </aside>

      <main className="min-h-screen px-4 pb-10 pt-[88px] lg:ml-64 lg:px-7">{children}</main>
    </MeContext.Provider>
  );
}

function SideLink({ item, active, role, userId }: { item: NavItem; active: boolean; role: Role; userId: string }) {
  const count = useNavBadge(item.badge, role, userId);
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition",
        active ? "bg-saffron text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
      )}
    >
      <item.icon className="size-[18px]" />
      {item.label}
      {count > 0 && (
        <span className={cn("ml-auto rounded-full px-2 text-[11px] font-bold", active ? "bg-white text-saffron-dark" : "bg-saffron text-white")}>{count}</span>
      )}
    </Link>
  );
}

function useNavBadge(kind: NavItem["badge"], role: Role, userId: string) {
  const asg = useAssignments(role === "deo" ? userId : undefined);
  const entries = useEntries();
  if (kind === "newAssignments") return (asg.data ?? []).filter((a) => !a.seenAt).length;
  if (kind === "pending") return (entries.data ?? []).filter((e) => e.status === "pending").length;
  return 0;
}
