"use client";

import { MapPin, TriangleAlert } from "lucide-react";
import { useWatch, type Control, type FieldErrors, type UseFormRegister, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { Alert, Badge, DetailGrid, StatusBadge } from "@/components/ui/misc";
import { AuthError } from "@/lib/api/auth";
import type { SchoolEntry, SchoolInput } from "@/lib/api/work";
import { RURAL_URBAN, SCHOOL_CATEGORIES, SCHOOL_MANAGEMENTS, SCHOOL_TYPES } from "@/lib/school-options";
import { fmtDateTime, money } from "@/lib/utils";

const thisYear = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric" }).format(new Date()));
const text = (label: string, min = 2, max = 80) =>
  z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().min(min, `Enter ${label}`).max(max, `${label} is too long`));
const pick = (list: readonly string[], label: string) => z.string().refine((v) => list.includes(v), `Select ${label}`);
const yearRule = (label: string) =>
  z.string().trim().regex(/^\d{4}$/, `Select ${label}`).refine((y) => +y >= 1800 && +y <= thisYear(), `${label} must be between 1800 and ${thisYear()}`);

/** Same rules as the server (src/modules/entries/schema.ts). */
export const schoolSchema = z
  .object({
    udiseCode: z.string().trim().regex(/^\d{11}$/, "UDISE code must be exactly 11 digits"),
    schoolName: text("school name", 3, 150),
    educationalBlock: text("educational block"),
    ruralUrban: pick(RURAL_URBAN, "Rural / Urban"),
    cluster: text("cluster"),
    lgdBlock: text("LGD block"),
    lgdPanchayat: text("LGD panchayat"),
    lgdVillage: text("LGD village"),
    schoolCategory: pick(SCHOOL_CATEGORIES, "school category"),
    schoolManagement: pick(SCHOOL_MANAGEMENTS, "school management"),
    yearEstablished: yearRule("Year of establishment"),
    yearRecognitionPri: z.union([z.literal(""), yearRule("Year of recognition")]),
    schoolType: pick(SCHOOL_TYPES, "school type"),
  })
  .superRefine((v, ctx) => {
    if (v.yearRecognitionPri && /^\d{4}$/.test(v.yearEstablished) && +v.yearRecognitionPri < +v.yearEstablished) {
      ctx.addIssue({ code: "custom", path: ["yearRecognitionPri"], message: "Cannot be before the year of establishment" });
    }
  });

export type SchoolForm = z.input<typeof schoolSchema>;

export const EMPTY_SCHOOL: SchoolForm = {
  udiseCode: "", schoolName: "", educationalBlock: "", ruralUrban: "", cluster: "", lgdBlock: "", lgdPanchayat: "", lgdVillage: "",
  schoolCategory: "", schoolManagement: "", yearEstablished: "", yearRecognitionPri: "", schoolType: "",
};

export const toInput = (v: z.output<typeof schoolSchema>): SchoolInput => ({
  ...v,
  yearEstablished: Number(v.yearEstablished),
  yearRecognitionPri: v.yearRecognitionPri ? Number(v.yearRecognitionPri) : null,
});

export const fromEntry = (e: SchoolEntry): SchoolForm => ({
  ...e.school,
  yearEstablished: String(e.school.yearEstablished),
  yearRecognitionPri: e.school.yearRecognitionPri ? String(e.school.yearRecognitionPri) : "",
});

/** Shows a server error on the right field (duplicate UDISE, validation) or as a toast. */
export function showServerError(err: unknown, setError: UseFormSetError<SchoolForm>) {
  if (!(err instanceof AuthError)) return toast.error("Could not save the entry. Please try again.");
  if (err.code === "DUPLICATE_UDISE") return setError("udiseCode", { message: err.message }, { shouldFocus: true });
  if (err.fields?.length) {
    err.fields.forEach((f, i) => setError(f.path as keyof SchoolForm, { message: f.message }, { shouldFocus: i === 0 }));
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

const FIRST_YEAR = 1800;
/** Newest first: 2026, 2025 … down to `from`. */
const yearsFrom = (from: number) => Array.from({ length: Math.max(0, thisYear() - from + 1) }, (_, i) => String(thisYear() - i));

/** "1 – School" fields. */
export function SchoolFields({ register, errors, control }: { register: UseFormRegister<SchoolForm>; errors: FieldErrors<SchoolForm>; control: Control<SchoolForm> }) {
  // Recognition cannot be before establishment: earlier years are disabled.
  const established = useWatch({ control, name: "yearEstablished" });
  const minRecognition = /^\d{4}$/.test(established ?? "") ? Number(established) : FIRST_YEAR;
  const e = (k: keyof SchoolForm) => errors[k]?.message;
  // Runs before react-hook-form reads the value, so only digits are stored.
  const digits = (max: number) => ({
    onInput: (ev: React.FormEvent<HTMLInputElement>) => (ev.currentTarget.value = ev.currentTarget.value.replace(/\D/g, "").slice(0, max)),
  });
  const input = (k: keyof SchoolForm, label: string, opts: { required?: boolean; max?: number; placeholder?: string; wide?: boolean } = {}) => (
    <Field className={opts.wide ? "sm:col-span-2" : undefined} label={label} htmlFor={k} required={opts.required ?? true} error={e(k)}>
      <Input id={k} maxLength={opts.max ?? 80} placeholder={opts.placeholder} aria-invalid={!!e(k)} {...register(k)} />
    </Field>
  );
  const select = (k: keyof SchoolForm, label: string, list: readonly string[], wide = false) => (
    <Field className={wide ? "sm:col-span-2" : undefined} label={label} htmlFor={k} required error={e(k)}>
      <Select id={k} aria-invalid={!!e(k)} {...register(k)}>
        <option value="">-- Select --</option>
        {list.map((o) => <option key={o}>{o}</option>)}
      </Select>
    </Field>
  );
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="UDISE Code" htmlFor="udiseCode" required error={e("udiseCode")} hint="11-digit UDISE+ code of the school">
        <Input id="udiseCode" inputMode="numeric" maxLength={11} placeholder="e.g. 09130500101" aria-invalid={!!e("udiseCode")} {...digits(11)} {...register("udiseCode")} />
      </Field>
      {input("schoolName", "School Name", { max: 150 })}
      {input("educationalBlock", "Educational Block")}
      {select("ruralUrban", "Rural / Urban", RURAL_URBAN)}
      {input("cluster", "Cluster")}
      {input("lgdBlock", "LGD Block")}
      {input("lgdPanchayat", "LGD Panchayat")}
      {input("lgdVillage", "LGD Village")}
      {select("schoolCategory", "School Category", SCHOOL_CATEGORIES)}
      {select("schoolManagement", "School Management", SCHOOL_MANAGEMENTS)}
      <Field label="Year of Establishment" htmlFor="yearEstablished" required error={e("yearEstablished")}>
        <Select id="yearEstablished" aria-invalid={!!e("yearEstablished")} {...register("yearEstablished")}>
          <option value="">-- Select year --</option>
          {yearsFrom(FIRST_YEAR).map((y) => <option key={y}>{y}</option>)}
        </Select>
      </Field>
      <Field label="Year of Recognition – Pri." htmlFor="yearRecognitionPri" error={e("yearRecognitionPri")} hint="Choose “Not recognised” if the school has no recognition">
        <Select id="yearRecognitionPri" aria-invalid={!!e("yearRecognitionPri")} {...register("yearRecognitionPri")}>
          <option value="">Not recognised</option>
          {yearsFrom(FIRST_YEAR).map((y) => (
            <option key={y} disabled={minRecognition > +y}>{y}</option>
          ))}
        </Select>
      </Field>
      {select("schoolType", "School Type", SCHOOL_TYPES)}
    </div>
  );
}

/** Read-only view of a school entry. */
export function SchoolEntryDetail({ entry }: { entry: SchoolEntry }) {
  const s = entry.school;
  return (
    <div className="space-y-5">
      {entry.status === "rejected" && (
        <Alert tone="red" icon={TriangleAlert}><b>Rejection reason:</b> {entry.rejectReason || "—"}</Alert>
      )}
      <DetailGrid
        items={[
          ["Entry ID", entry.id],
          ["Status", <span key="s" className="flex gap-1.5"><StatusBadge status={entry.status} />{entry.resubmitCount > 0 && <Badge tone="blue">Resubmitted</Badge>}</span>],
          ["Assignment", entry.assignmentId],
          ["DEO rate", `${money(entry.ratePerEntry)} per approved entry`],
          ["Submitted on", fmtDateTime(entry.submittedAt)],
          ["Verified on", fmtDateTime(entry.verifiedAt)],
        ]}
      />
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><MapPin className="size-4 text-primary" /> Area</h4>
        <AreaStrip area={entry.area} />
      </div>
      <div>
        <h4 className="mb-3 text-sm font-semibold">1 – School</h4>
        <DetailGrid
          items={[
            ["UDISE Code", s.udiseCode], ["School Name", s.schoolName], ["Educational Block", s.educationalBlock], ["Rural / Urban", s.ruralUrban],
            ["Cluster", s.cluster], ["LGD Block", s.lgdBlock], ["LGD Panchayat", s.lgdPanchayat], ["LGD Village", s.lgdVillage],
            ["School Category", s.schoolCategory], ["School Management", s.schoolManagement], ["Year of Establishment", String(s.yearEstablished)],
            ["Year of Recognition – Pri.", s.yearRecognitionPri ? String(s.yearRecognitionPri) : "—"], ["School Type", s.schoolType],
          ]}
        />
      </div>
    </div>
  );
}
