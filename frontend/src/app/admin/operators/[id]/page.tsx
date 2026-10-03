"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ban, CircleCheck, ExternalLink, FileText, ImageIcon, MapPin, Target, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, DetailGrid, PageHeader, Skeleton } from "@/components/ui/misc";
import { useOperator } from "@/features/work/hooks";
import { EmployeeStatusActions, EmployeeStatusBadge } from "@/features/work/employee-status";
import { WorkStatusBadge, areaText } from "@/features/work/ui";
import { authRaw } from "@/lib/api/auth";
import { openOperatorDocument, type OperatorDetail } from "@/lib/api/work";
import { fmtDate, fmtDateTime, initials, money } from "@/lib/utils";

const DOC_LABEL: Record<string, string> = {
  aadhaar: "Aadhaar Card",
  aadhaar_front: "Aadhaar Card – Front",
  aadhaar_back: "Aadhaar Card – Back",
  pan: "PAN Card",
  bank_proof: "Bank Passbook / Cancelled Cheque",
  photo: "Passport Size Photo",
  signature: "Signature",
};
const DOC_ORDER = Object.keys(DOC_LABEL);

export default function OperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useOperator(id);

  if (q.isLoading) return <Skeleton className="h-96" />;
  const u = q.data;
  if (!u) {
    return (
      <Alert tone="red" icon={TriangleAlert}>
        {q.error instanceof Error ? q.error.message : "Employee not found."} <Link href="/admin/operators">Back to employees</Link>
      </Alert>
    );
  }
  const isVr = u.role === "verifier";
  const current = isVr ? undefined : u.assignments.find((a) => a.status === "active");
  const activeAreas = u.assignments.filter((a) => a.status === "active").length;
  const p = u.profile;

  return (
    <>
      <PageHeader
        title={`${u.name} (${u.id})`}
        description={`Registered on ${fmtDate(u.joinedAt)}${u.lastLoginAt ? ` · last login ${fmtDateTime(u.lastLoginAt)}` : " · never logged in"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="light"><Link href="/admin/operators"><ArrowLeft /> Back</Link></Button>
            <EmployeeStatusActions u={u} size="md" />
            {u.role === "deo" && (u.eligible ? (
              <Button asChild><Link href={`/admin/assign?deo=${u.id}`}><Target /> Assign work</Link></Button>
            ) : (
              <Button disabled><Target /> Assign work</Button>
            ))}
          </div>
        }
      />

      {u.status !== "active" ? (
        <Alert tone={u.status === "pending" ? "blue" : u.status === "inactive" ? "amber" : "red"} icon={Ban} className="mb-5">
          {u.status === "pending" ? "New registration – waiting for your approval. Activate to allow work." : u.status === "inactive" ? "This employee is inactive and will not get new work." : "This employee is rejected and cannot log in."}
          {u.statusReason && <> Reason: <b>{u.statusReason}</b></>}
        </Alert>
      ) : isVr ? (
        <Alert tone="green" icon={CircleCheck} className="mb-5">Active verifier · verifying {activeAreas} active area(s).</Alert>
      ) : current ? (
        <Alert tone="amber" icon={MapPin} className="mb-5">
          Currently working on <b>{current.id}</b> ({current.taskType}, PIN <b>{current.area.pincode}</b>) – eligible for new work after it is completed.{" "}
          <Link href={`/admin/assignments?q=${current.id}`}>Open</Link>
        </Alert>
      ) : (
        <Alert tone="green" icon={CircleCheck} className="mb-5">No active work – this operator is eligible for a new assignment.</Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={isVr ? "Verifier details" : "Operator details"} action={<EmployeeStatusBadge status={u.status} />} />
            <CardBody className="flex flex-col gap-6 sm:flex-row">
              <Photo u={u} />
              {p ? (
                <DetailGrid
                  className="flex-1"
                  items={[
                    ["Father's Name", p.fatherName], ["Mother's Name", p.motherName], ["Date of Birth", fmtDate(p.dob)],
                    ["Gender / Category", `${p.gender} / ${p.category}`], ["Religion", p.religion], ["Qualification", p.qualification],
                    ["Mobile", [u.mobile, p.altMobile].filter(Boolean).join(" / ")], ["Email", u.email],
                    ["Aadhaar Number", p.aadhaar], ["PAN", p.pan ?? "—"],
                    ["Post Office / Police Station", `${p.postOffice} / ${p.policeStation}`],
                    ["Address", [p.address, p.subDistrict, p.district, p.state, p.pincode].filter(Boolean).join(", ")],
                  ]}
                />
              ) : (
                <p className="text-sm text-muted">Profile details are not available.</p>
              )}
            </CardBody>
          </Card>
          {p && (
            <Card>
              <CardHeader title="Bank details" />
              <CardBody>
                <DetailGrid
                  items={[
                    ["Bank", p.bank.bankName], ["Account Holder", p.bank.accountHolder], ["Account No.", p.bank.account],
                    ["IFSC", p.bank.ifsc], ["Proof", p.bank.proofType],
                  ]}
                />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={isVr ? "Areas to verify" : "Assignments"} action={<span className="text-xs text-muted">{u.assignments.length} total</span>} />
            <CardBody className="space-y-4">
              {!u.assignments.length ? (
                <p className="text-sm text-muted">No work assigned yet.</p>
              ) : (
                u.assignments.map((a) => (
                  <div key={a.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between gap-2">
                      <b className="text-sm text-navy">{a.id}</b>
                      <WorkStatusBadge a={a} />
                    </div>
                    <p className="text-sm">{a.taskType}</p>
                    <p className="text-xs text-muted">{areaText(a.area)}</p>
                    <p className="text-xs text-muted">
                      Target {a.target} · {money(a.ratePerEntry)}/entry · deadline {fmtDate(a.deadline)}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Documents" />
            <ul className="divide-y divide-line">
              {[...u.documents]
                .sort((a, b) => DOC_ORDER.indexOf(a.kind) - DOC_ORDER.indexOf(b.kind))
                .map((d) => {
                  const Icon = d.mimeType.startsWith("image/") ? ImageIcon : FileText;
                  return (
                    <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-success"><Icon className="size-[18px]" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy">{DOC_LABEL[d.kind] ?? d.kind}</p>
                        <p className="truncate text-xs text-muted">{d.fileName} · {(d.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openOperatorDocument(d.id).catch((e) => toast.error((e as Error).message))}>
                        <ExternalLink /> View
                      </Button>
                    </li>
                  );
                })}
              {!u.documents.length && <li className="px-5 py-3 text-sm text-muted">No documents.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Photo + signature loaded with the admin token and shown from memory. */
function Photo({ u }: { u: OperatorDetail }) {
  const photo = u.documents.find((d) => d.kind === "photo");
  const sign = u.documents.find((d) => d.kind === "signature");
  const { data: urls } = useQuery({
    queryKey: ["operator-photo", photo?.id, sign?.id],
    enabled: !!photo,
    staleTime: Infinity,
    queryFn: async () => {
      const load = async (id?: string) => (id ? URL.createObjectURL(await (await authRaw("admin", `/documents/${id}`)).blob()) : undefined);
      return { photo: await load(photo?.id), sign: await load(sign?.id) };
    },
  });
  if (!urls?.photo) {
    return <span className="grid size-24 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-bold text-primary">{initials(u.name)}</span>;
  }
  return (
    <div className="flex shrink-0 flex-col gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urls.photo} alt="Photo" className="h-32 w-26 rounded-lg border border-line object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {urls.sign && <img src={urls.sign} alt="Signature" className="h-10 w-26 rounded border border-line bg-white object-contain p-0.5" />}
    </div>
  );
}
