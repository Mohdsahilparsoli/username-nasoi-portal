"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send, TriangleAlert, Wand2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMe } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form-controls";
import { Alert, PageHeader, Skeleton } from "@/components/ui/misc";
import { useAssignments } from "@/features/assignments/hooks";
import { EntryFields } from "@/features/entries/components";
import { useCreateEntry } from "@/features/entries/hooks";
import { money } from "@/lib/utils";
import { entrySchema, type EntryForm } from "@/lib/validation";

const EMPTY: EntryForm = {
  studentName: "", fatherName: "", gender: "", dob: "", className: "", rollNo: "", school: "", board: "",
  percentage: "", village: "", pincode: "", mobile: "",
};

function NewEntryInner() {
  const me = useMe();
  const router = useRouter();
  const params = useSearchParams();
  const asg = useAssignments(me.id);
  const active = useMemo(() => (asg.data ?? []).filter((a) => a.status === "active"), [asg.data]);
  const [asgId, setAsgId] = useState(params.get("asg") ?? "");
  const create = useCreateEntry(me.id);
  const form = useForm<EntryForm>({ resolver: zodResolver(entrySchema), defaultValues: EMPTY });

  const selected = active.find((a) => a.id === asgId) ?? active[0];

  // Pre-fill the village from the selected assignment.
  useEffect(() => {
    if (selected && !form.getValues("village")) form.setValue("village", selected.area.village);
  }, [selected, form]);

  const onSubmit = form.handleSubmit((data) => {
    if (!selected) return;
    create.mutate(
      { assignmentId: selected.id, data },
      {
        onSuccess: (e) => {
          toast.success(`Entry ${e.id} submitted. Status: Pending verification.`, {
            action: { label: "View entries", onClick: () => router.push("/deo/entries?status=pending") },
          });
          form.reset({ ...EMPTY, village: selected.area.village });
        },
        onError: (err) => {
          if (err.message.includes("roll number")) form.setError("rollNo", { message: err.message });
          toast.error(err.message);
        },
      },
    );
  });

  const fillSample = () => {
    const names = ["Ravi Tomar", "Sakshi Rana", "Mohit Pal", "Anjali Malik", "Kunal Bansal", "Shivani Goyal"];
    const i = Math.floor(Math.random() * names.length);
    form.reset({
      studentName: names[i], fatherName: `Mr. ${names[(i + 2) % names.length].split(" ")[1]}`,
      gender: i % 2 ? "Female" : "Male", dob: `2008-0${1 + i}-1${i}`, className: i % 2 ? "12th" : "10th",
      rollNo: String(250000 + Math.floor(Math.random() * 90000)), school: "Govt. Inter College Sardhana", board: "UP Board",
      percentage: (55 + Math.random() * 40).toFixed(1), village: selected?.area.village ?? "", pincode: "250342",
      mobile: "9" + String(Math.floor(100000000 + Math.random() * 899999999)),
    });
  };

  if (asg.isLoading) return <Skeleton className="h-96" />;

  return (
    <>
      <PageHeader title="New Add Entry" description="Enter one record exactly as it appears in the source document." />
      {!active.length ? (
        <Alert tone="amber" icon={TriangleAlert}>No active assignment yet. You can add entries once the Super Admin assigns an area to you.</Alert>
      ) : (
        <Card>
          <CardHeader title="Record details" action={<span className="text-sm text-muted">Rate: <b className="text-navy">{money(selected?.rate)}</b> per approved entry</span>} />
          <form onSubmit={onSubmit} noValidate className="space-y-5 p-5">
            <Field label="Assignment" htmlFor="asg" required>
              <Select id="asg" value={selected?.id} onChange={(e) => { setAsgId(e.target.value); form.setValue("village", ""); }}>
                {active.map((a) => (
                  <option key={a.id} value={a.id}>{a.id} – {a.taskType} ({a.area.village}, {a.area.district})</option>
                ))}
              </Select>
            </Field>
            <EntryFields register={form.register} errors={form.formState.errors} />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={create.isPending}><Send /> {create.isPending ? "Submitting…" : "Submit Entry"}</Button>
              <Button type="button" variant="light" onClick={() => form.reset({ ...EMPTY, village: selected?.area.village ?? "" })}>Clear</Button>
              <Button type="button" variant="outline" onClick={fillSample}><Wand2 /> Fill sample</Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

export default function NewEntryPage() {
  return (
    <Suspense>
      <NewEntryInner />
    </Suspense>
  );
}
