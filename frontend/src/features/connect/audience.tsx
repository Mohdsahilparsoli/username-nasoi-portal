"use client";

import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/misc";
import { Avatar } from "@/features/records/person-card";
import type { Audience, Contact } from "@/lib/api/connect";
import { cn } from "@/lib/utils";

export const ROLE_LABEL: Record<string, string> = { admin: "Admin", verifier: "Verifier", deo: "DEO" };

const OPTIONS: [Audience, string, string][] = [
  ["custom", "Choose people", "One or more people"],
  ["all_deo", "All DEOs", "Every active Data Entry Operator"],
  ["all_vr", "All Verifiers", "Every active Verifier"],
  ["all", "Everyone", "All active DEOs and Verifiers"],
];

/** Admin: send to chosen people, all DEOs, all verifiers or everyone. */
export function AudiencePicker({ value, onChange }: { value: Audience; onChange: (v: Audience) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Send to">
      {OPTIONS.map(([v, label, hint]) => (
        <label
          key={v}
          className="flex cursor-pointer flex-col rounded-lg border border-slate-300 px-3 py-2 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary"
        >
          <span className="flex items-center gap-2 font-semibold">
            <input type="radio" name="audience" value={v} checked={value === v} onChange={() => onChange(v)} className="accent-[var(--color-primary)]" />
            {label}
          </span>
          <span className="mt-0.5 text-[11px] text-muted">{hint}</span>
        </label>
      ))}
    </div>
  );
}

export const audienceText = (a: Audience) => OPTIONS.find((o) => o[0] === a)?.[2] ?? "";

/**
 * Search + checkbox list of people. With `roleFilter` (admin) there are
 * All / DEO / Verifier tabs and "Select all shown".
 */
export function PeopleChecklist({
  contacts,
  loading,
  selected,
  onChange,
  myId,
  roleFilter,
}: {
  contacts: Contact[];
  loading?: boolean;
  selected: string[];
  onChange: (ids: string[]) => void;
  myId?: string;
  roleFilter?: boolean;
}) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | "deo" | "verifier" | "admin">("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return contacts.filter((c) => c.id !== myId && (!role || c.role === role) && (!s || `${c.id} ${c.name}`.toLowerCase().includes(s)));
  }, [contacts, q, myId, role]);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allShown = list.length > 0 && list.every((c) => selected.includes(c.id));

  return (
    <div className="rounded-lg border border-line">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-2 py-1.5">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or ID"
            className="h-9 w-full bg-transparent pl-8 pr-2 text-sm outline-none"
            aria-label="Search people"
          />
        </div>
        {roleFilter && (
          <>
            {(
              [
                ["", "All"],
                ["deo", "DEO"],
                ["verifier", "Verifier"],
                ["admin", "Admin"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setRole(v)}
                className={cn("rounded-md px-2 py-1 text-xs font-semibold", role === v ? "bg-primary text-white" : "text-muted hover:bg-canvas")}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-canvas disabled:opacity-40"
              disabled={!list.length}
              onClick={() => onChange(allShown ? selected.filter((id) => !list.some((c) => c.id === id)) : [...new Set([...selected, ...list.map((c) => c.id)])])}
            >
              <Users className="size-3.5" /> {allShown ? "Clear shown" : "Select all shown"}
            </button>
          </>
        )}
      </div>
      <ul className="max-h-52 divide-y divide-line overflow-y-auto">
        {loading && <li className="p-3 text-sm text-muted">Loading…</li>}
        {!loading && !list.length && <li className="p-3 text-sm text-muted">Nobody found. You can contact the people of your current work and the admin.</li>}
        {list.map((c) => (
          <li key={c.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-canvas">
              <input type="checkbox" className="size-4 accent-primary" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} aria-label={`Choose ${c.name}`} />
              <Avatar person={c} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-navy">{c.name}</span>
                <span className="text-xs text-muted">{c.id}</span>
              </span>
              <Badge tone={c.role === "admin" ? "saffron" : c.role === "verifier" ? "blue" : "grey"}>{ROLE_LABEL[c.role] ?? c.role}</Badge>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
