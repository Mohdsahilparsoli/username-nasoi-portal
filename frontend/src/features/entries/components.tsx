"use client";

import { TriangleAlert } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { Alert, Badge, DetailGrid, StatusBadge } from "@/components/ui/misc";
import { BOARDS, CLASSES, GENDERS } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import type { EntryForm } from "@/lib/validation";
import type { Assignment, Entry, User } from "@/types";

/** All fields of one data-entry record, used by "New Entry" and "Edit & Resubmit". */
export function EntryFields({ register, errors }: { register: UseFormRegister<EntryForm>; errors: FieldErrors<EntryForm> }) {
  const e = (k: keyof EntryForm) => errors[k]?.message;
  const digits = { onChange: (ev: React.ChangeEvent<HTMLInputElement>) => (ev.target.value = ev.target.value.replace(/\D/g, "")) };
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Student Name" htmlFor="studentName" required error={e("studentName")}>
        <Input id="studentName" maxLength={80} aria-invalid={!!e("studentName")} {...register("studentName")} />
      </Field>
      <Field label="Father's Name" htmlFor="fatherName" required error={e("fatherName")}>
        <Input id="fatherName" maxLength={80} aria-invalid={!!e("fatherName")} {...register("fatherName")} />
      </Field>
      <Field label="Gender" htmlFor="gender" required error={e("gender")}>
        <Select id="gender" aria-invalid={!!e("gender")} {...register("gender")}>
          <option value="">-- Select --</option>
          {GENDERS.map((g) => <option key={g}>{g}</option>)}
        </Select>
      </Field>
      <Field label="Date of Birth" htmlFor="dob" required error={e("dob")}>
        <Input id="dob" type="date" aria-invalid={!!e("dob")} {...register("dob")} />
      </Field>
      <Field label="Class" htmlFor="className" required error={e("className")}>
        <Select id="className" aria-invalid={!!e("className")} {...register("className")}>
          <option value="">-- Select --</option>
          {CLASSES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Roll Number" htmlFor="rollNo" required error={e("rollNo")}>
        <Input id="rollNo" maxLength={20} aria-invalid={!!e("rollNo")} {...register("rollNo")} />
      </Field>
      <Field className="sm:col-span-2" label="School Name" htmlFor="school" required error={e("school")}>
        <Input id="school" maxLength={100} aria-invalid={!!e("school")} {...register("school")} />
      </Field>
      <Field label="Board" htmlFor="board" required error={e("board")}>
        <Select id="board" aria-invalid={!!e("board")} {...register("board")}>
          <option value="">-- Select --</option>
          {BOARDS.map((b) => <option key={b}>{b}</option>)}
        </Select>
      </Field>
      <Field label="Percentage (%)" htmlFor="percentage" required error={e("percentage")}>
        <Input id="percentage" type="number" step="0.1" min="0" max="100" aria-invalid={!!e("percentage")} {...register("percentage")} />
      </Field>
      <Field label="Village / Ward" htmlFor="village" required error={e("village")}>
        <Input id="village" maxLength={60} aria-invalid={!!e("village")} {...register("village")} />
      </Field>
      <Field label="Pincode" htmlFor="pincode" required error={e("pincode")}>
        <Input id="pincode" inputMode="numeric" maxLength={6} aria-invalid={!!e("pincode")} {...register("pincode", digits)} />
      </Field>
      <Field label="Parent Mobile No." htmlFor="mobile" error={e("mobile")}>
        <Input id="mobile" inputMode="numeric" maxLength={10} aria-invalid={!!e("mobile")} {...register("mobile", digits)} />
      </Field>
    </div>
  );
}

/** Read-only view of an entry (shown in dialogs for DEO, Verifier and Admin). */
export function EntryDetail({ entry, assignment, operator, verifier }: { entry: Entry; assignment?: Assignment; operator?: User; verifier?: User }) {
  const d = entry.data;
  return (
    <div className="space-y-5">
      {entry.status === "rejected" && (
        <Alert tone="red" icon={TriangleAlert}>
          <b>Rejection reason:</b> {entry.reason}
        </Alert>
      )}
      <DetailGrid
        items={[
          ["Entry ID", entry.id],
          ["Status", <span key="s" className="flex gap-1.5"><StatusBadge status={entry.status} />{entry.resubmitted && <Badge tone="blue">Resubmitted</Badge>}</span>],
          ["Operator", operator ? `${operator.name} (${operator.id})` : entry.deoId],
          ["Assignment", assignment ? `${assignment.id} – ${assignment.taskType}` : entry.assignmentId],
          ["Submitted on", fmtDateTime(entry.submittedAt)],
          ["Verified on", entry.verifiedAt ? `${fmtDateTime(entry.verifiedAt)}${verifier ? ` · ${verifier.name}` : ""}` : "—"],
        ]}
      />
      <div>
        <h4 className="mb-3 text-sm font-semibold">Record details</h4>
        <DetailGrid
          items={[
            ["Student Name", d.studentName], ["Father's Name", d.fatherName], ["Gender", d.gender], ["Date of Birth", fmtDate(d.dob)],
            ["Class", d.className], ["Roll Number", d.rollNo], ["School Name", d.school], ["Board", d.board],
            ["Percentage", `${d.percentage}%`], ["Village / Ward", d.village], ["Pincode", d.pincode], ["Parent Mobile", d.mobile || "—"],
          ]}
        />
      </div>
    </div>
  );
}
