"use client";

import { MapPin, TriangleAlert } from "lucide-react";
import { Controller, useWatch, type Control, type FieldErrors, type Resolver, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { Field, Input } from "@/components/ui/form-controls";
import { Alert, Badge, DetailGrid, StatusBadge } from "@/components/ui/misc";
import { AuthError } from "@/lib/api/auth";
import type { FieldDef, FormDef, RecordEntry, RecordInput } from "@/lib/api/work";
import { fmtDateTime } from "@/lib/utils";

/*
 * Generic record form: the fields, options and rules come from the server
 * (GET /entry-forms), so the school form (UDISE profile) and the college form
 * are both rendered, validated and shown by this one component.
 */

export type RecordValues = Record<string, string>;

/** "UDISE 09171602108" / "AISHE C-12345" */
export const codeText = (e: Pick<RecordEntry, "recordType" | "code">) => `${e.recordType === "college" ? "AISHE" : "UDISE"} ${e.code}`;

const thisYear = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric" }).format(new Date()));
const YEARS = () => Array.from({ length: thisYear() - 1800 + 1 }, (_, i) => String(thisYear() - i));

export const isVisible = (f: FieldDef, v: Record<string, unknown>) => !f.showIf || f.showIf.in.includes(String(v[f.showIf.field] ?? ""));
const canon = (f: FieldDef, s: string) => (f.kind === "choice" && f.strict ? (f.options?.find((o) => o.toLowerCase() === s.toLowerCase()) ?? s) : s);

export const emptyValues = (def: FormDef): RecordValues => Object.fromEntries(def.fields.map((f) => [f.key, ""]));

export const fromEntry = (def: FormDef, e: RecordEntry): RecordValues =>
  Object.fromEntries(def.fields.map((f) => [f.key, e.data[f.key] === undefined || e.data[f.key] === null ? "" : String(e.data[f.key])]));

/** Values to send: only visible, filled fields; strict choices in their exact spelling. */
export function toInput(def: FormDef, v: RecordValues): RecordInput {
  const norm: Record<string, string> = {};
  for (const f of def.fields) norm[f.key] = canon(f, (v[f.key] ?? "").replace(/\s+/g, " ").trim());
  const out: RecordInput = {};
  for (const f of def.fields) if (isVisible(f, norm) && norm[f.key]) out[f.key] = norm[f.key];
  return out;
}

/** Same rules as the server, so mistakes show before submitting. */
export function validate(def: FormDef, values: RecordValues): Record<string, string> {
  const errs: Record<string, string> = {};
  const v: Record<string, string> = {};
  for (const f of def.fields) v[f.key] = canon(f, (values[f.key] ?? "").replace(/\s+/g, " ").trim());
  const num: Record<string, number> = {};
  for (const f of def.fields) {
    if (!isVisible(f, v)) continue;
    const s = v[f.key];
    if (!s) {
      if (f.required) errs[f.key] = `${f.label} is required`;
      continue;
    }
    switch (f.kind) {
      case "code":
        if (f.pattern && !new RegExp(f.pattern).test(s.toUpperCase())) errs[f.key] = f.patternMessage ?? `${f.label} is not valid`;
        break;
      case "year":
        if (!/^\d{4}$/.test(s) || +s < 1800 || +s > thisYear()) errs[f.key] = `${f.label}: choose a year between 1800 and ${thisYear()}`;
        else num[f.key] = +s;
        break;
      case "number":
        if (!/^\d+$/.test(s) || +s > (f.max ?? 1_000_000)) errs[f.key] = `${f.label}: enter a whole number${f.max ? ` up to ${f.max}` : ""}`;
        else num[f.key] = +s;
        break;
      case "phone":
        if (!/^[6-9]\d{9}$/.test(s)) errs[f.key] = `${f.label}: enter a valid 10-digit mobile number`;
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) errs[f.key] = `${f.label}: enter a valid email`;
        break;
      case "url":
        if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s)) errs[f.key] = `${f.label}: enter a valid website`;
        break;
      case "choice":
        if (f.strict && !f.options?.includes(s)) errs[f.key] = `Select ${f.label} from the list`;
        else if (/^\d+$/.test(s)) num[f.key] = +s;
        break;
      default:
        if (s.length < (f.min ?? 2)) errs[f.key] = `Enter ${f.label}`;
        else if (s.length > (f.max ?? 80)) errs[f.key] = `${f.label} is too long`;
    }
  }
  for (const f of def.fields) {
    if (errs[f.key] || num[f.key] === undefined) continue;
    const label = (k: string) => def.fields.find((x) => x.key === k)?.label ?? k;
    if (f.notBefore && num[f.notBefore] !== undefined && num[f.key] < num[f.notBefore]) errs[f.key] = `Cannot be before ${label(f.notBefore)}`;
    if (f.notAbove && num[f.notAbove] !== undefined && num[f.key] > num[f.notAbove]) errs[f.key] = `Cannot be more than ${label(f.notAbove)}`;
  }
  return errs;
}

export const recordResolver =
  (def: FormDef): Resolver<RecordValues> =>
  async (values) => {
    const errs = validate(def, values);
    const keys = Object.keys(errs);
    return keys.length
      ? { values: {}, errors: Object.fromEntries(keys.map((k) => [k, { type: "validate", message: errs[k] }])) }
      : { values, errors: {} };
  };

/** Shows a server error on its field (duplicate UDISE / AISHE code, validation) or as a toast. */
export function showServerError(err: unknown, setError: UseFormSetError<RecordValues>) {
  if (!(err instanceof AuthError)) return toast.error("Could not save the entry. Please try again.");
  if (err.fields?.length) {
    err.fields.forEach((f, i) => setError(f.path, { message: f.message }, { shouldFocus: i === 0 }));
    return;
  }
  toast.error(err.message);
}

/** STATE — EDUCATIONAL DISTRICT — PINCODE (fixed by the assignment). */
export function AreaStrip({ area }: { area: { state: string; district: string; pincode: string } }) {
  const item = (label: string, value: string) => (
    <div className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-4 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate font-semibold text-navy">{value}</p>
    </div>
  );
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {item("State", area.state)}
      {item("Educational District", area.district)}
      {item("Pincode", area.pincode)}
    </div>
  );
}

/** All sections and fields of a form. Dropdowns also accept typed values. */
export function RecordFields({ def, control, errors }: { def: FormDef; control: Control<RecordValues>; errors: FieldErrors<RecordValues> }) {
  const raw = useWatch({ control }) as RecordValues;
  // Typed values count too ("urban" = "Urban"), so show/hide follows what the user typed.
  const values: RecordValues = Object.fromEntries(def.fields.map((f) => [f.key, canon(f, (raw?.[f.key] ?? "").trim())]));
  const years = YEARS();

  return (
    <div className="space-y-7">
      {def.sections.map((section, si) => {
        const fields = def.fields.filter((f) => f.section === section && isVisible(f, values));
        if (!fields.length) return null;
        return (
          <fieldset key={section} className="space-y-4">
            <legend className="mb-1 w-full border-b border-line pb-2 text-base font-bold text-navy">
              {si + 1} – {section}
            </legend>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((f) => {
                const err = errors[f.key]?.message as string | undefined;
                const wide = f.wide ? "sm:col-span-2 xl:col-span-3" : undefined;
                return (
                  <Field key={f.key} className={wide} label={f.label} htmlFor={f.key} required={f.required} error={err} hint={f.hint}>
                    <Controller
                      control={control}
                      name={f.key}
                      render={({ field }) => {
                        const common = { id: f.key, name: field.name, value: field.value ?? "", onBlur: field.onBlur };
                        if (f.kind === "choice" || f.kind === "year") {
                          let options = f.kind === "year" ? years : (f.options ?? []);
                          // Recognition years cannot be before establishment: list only valid years.
                          if (f.notBefore && /^\d+$/.test(values?.[f.notBefore] ?? "")) options = options.filter((o) => !/^\d+$/.test(o) || +o >= +values[f.notBefore!]);
                          return (
                            <Combobox
                              {...common}
                              onChange={field.onChange}
                              options={options}
                              invalid={!!err}
                              inputMode={f.kind === "year" ? "numeric" : undefined}
                              maxLength={f.kind === "year" ? 4 : (f.max ?? 120)}
                              placeholder={f.kind === "year" ? "Select or type year" : f.strict ? "Select" : "Select or type"}
                            />
                          );
                        }
                        const digitsOnly = f.kind === "number" || f.kind === "phone" || (f.kind === "code" && f.pattern?.startsWith("^\\d"));
                        return (
                          <Input
                            {...common}
                            ref={field.ref}
                            aria-invalid={!!err}
                            inputMode={digitsOnly ? "numeric" : f.kind === "email" ? "email" : undefined}
                            type={f.kind === "email" ? "email" : "text"}
                            maxLength={f.kind === "phone" ? 10 : f.kind === "number" ? 7 : (f.max ?? 150)}
                            placeholder={f.placeholder}
                            onChange={(e) => field.onChange(digitsOnly ? e.target.value.replace(/\D/g, "") : e.target.value)}
                          />
                        );
                      }}
                    />
                  </Field>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/** Read-only view of an entry, grouped by the same sections as the form. */
export function RecordDetail({ def, entry, showMeta = true }: { def?: FormDef; entry: RecordEntry; showMeta?: boolean }) {
  const d = entry.data;
  return (
    <div className="space-y-5">
      {entry.status === "rejected" && <Alert tone="red" icon={TriangleAlert}><b>Rejection reason:</b> {entry.rejectReason || "—"}</Alert>}
      {showMeta && (
        <DetailGrid
          items={[
            ["Entry ID", entry.id],
            ["Status", <span key="s" className="flex gap-1.5"><StatusBadge status={entry.status} />{entry.resubmitCount > 0 && <Badge tone="blue">Resubmitted</Badge>}</span>],
            ["Assignment", entry.assignmentId],
            ["Entry of", entry.recordType === "college" ? "College" : "School"],
            ["Submitted on", fmtDateTime(entry.submittedAt)],
            ["Verified on", fmtDateTime(entry.verifiedAt)],
          ]}
        />
      )}
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MapPin className="size-4 text-primary" /> Area</h4>
        <AreaStrip area={entry.area} />
      </div>
      {def ? (
        def.sections.map((section, si) => {
          const fields = def.fields.filter((f) => f.section === section && isVisible(f, d));
          if (!fields.length) return null;
          return (
            <div key={section}>
              <h4 className="mb-3 text-sm font-semibold">{si + 1} – {section}</h4>
              <DetailGrid items={fields.map((f) => [f.label, d[f.key] === undefined || d[f.key] === "" ? "—" : String(d[f.key])] as [string, string])} />
            </div>
          );
        })
      ) : (
        <DetailGrid items={Object.entries(d).map(([k, v]) => [k, String(v)] as [string, string])} />
      )}
    </div>
  );
}
