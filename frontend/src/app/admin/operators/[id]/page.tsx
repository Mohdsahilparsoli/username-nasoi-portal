"use client";

import { ArrowLeft, Ban, CircleCheck, CircleX, ClipboardList, Clock, Target, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Badge, DetailGrid, PageHeader, Progress, Skeleton, StatCard } from "@/components/ui/misc";
import { useAssignments } from "@/features/assignments/hooks";
import { useEntries } from "@/features/entries/hooks";
import { useUpdateUser, useUser } from "@/features/users/hooks";
import { maskAadhaar } from "@/features/registration/schema";
import { fmtDate, initials, maskAccount, money, statsOf } from "@/lib/utils";

export default function OperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useUser(id);
  const entries = useEntries(id);
  const asg = useAssignments(id);
  const update = useUpdateUser(id);

  if (user.isLoading) return <Skeleton className="h-96" />;
  const u = user.data;
  if (!u) return <Alert tone="red" icon={TriangleAlert}>Operator not found. <Link href="/admin/operators">Back</Link></Alert>;
  const s = statsOf(entries.data ?? []);
  const blocked = u.status === "blocked";

  return (
    <>
      <PageHeader
        title={`${u.name} (${u.id})`}
        description={`Registered on ${fmtDate(u.joinedAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="light"><Link href="/admin/operators"><ArrowLeft /> Back</Link></Button>
            <Button
              variant={blocked ? "success" : "danger"}
              disabled={update.isPending}
              onClick={() =>
                update.mutate({ status: blocked ? "active" : "blocked" }, { onSuccess: () => toast.success(`${u.name} ${blocked ? "unblocked" : "blocked"}.`) })
              }
            >
              {blocked ? <><CircleCheck /> Unblock</> : <><Ban /> Block</>}
            </Button>
            <Button asChild><Link href={`/admin/assign?deo=${u.id}`}><Target /> Assign work</Link></Button>
          </div>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total entries" value={s.total} icon={ClipboardList} />
        <StatCard label="Pending" value={s.pending} icon={Clock} tone="amber" />
        <StatCard label="Rejected" value={s.rejected} icon={CircleX} tone="red" />
        <StatCard label="Earnings" value={money(s.earnings)} icon={Wallet} tone="saffron" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Operator details" action={<Badge tone={blocked ? "red" : "green"}>{blocked ? "Blocked" : "Active"}</Badge>} />
          <CardBody className="flex flex-col gap-6 sm:flex-row">
            {u.photo ? (
              <div className="flex shrink-0 flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.photo} alt="" className="h-32 w-26 rounded-lg border border-line object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {u.signature && <img src={u.signature} alt="Signature" className="h-10 w-26 rounded border border-line bg-white object-contain p-0.5" />}
              </div>
            ) : (
              <span className="grid size-24 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-bold text-primary">{initials(u.name)}</span>
            )}
            <DetailGrid
              className="flex-1"
              items={[
                ["Father's Name", u.fatherName], ["Mother's Name", u.motherName], ["Date of Birth", fmtDate(u.dob)],
                ["Gender / Category", [u.gender, u.category].filter(Boolean).join(" / ")], ["Mobile", u.mobile], ["Email", u.email],
                ["Religion", u.religion], ["Qualification", u.qualification], ["Aadhaar Number", maskAadhaar(u.aadhaar)], ["Aadhaar Card", u.aadhaarDocName], ["PAN", [u.pan, u.panDocName].filter(Boolean).join(" · ")],
                [`Bank Proof${u.bankDocType ? ` (${u.bankDocType})` : ""}`, u.bankDocName], ["Photo / Signature", [u.photoName, u.signatureName].filter(Boolean).join(" · ")],
                ["Post Office / Police Station", [u.postOffice, u.policeStation].filter(Boolean).join(" / ")],
                ["Address", [u.address, u.tehsil, u.district, u.state, u.pincode].filter(Boolean).join(", ")],
                ["Bank", u.bank?.bankName], ["Account Holder", u.bank?.holder], ["Account No.", maskAccount(u.bank?.account)], ["IFSC", u.bank?.ifsc],
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Assignments" />
          <CardBody className="space-y-5">
            {!asg.data?.length ? (
              <p className="text-sm text-muted">No work assigned yet.</p>
            ) : (
              asg.data.map((a) => (
                <div key={a.id}>
                  <div className="flex justify-between gap-2">
                    <b className="text-sm text-navy">{a.id} · {a.taskType}</b>
                    {a.status === "completed" ? <Badge>Completed</Badge> : !a.seenAt ? <Badge tone="blue">New</Badge> : <Badge tone="green">Active</Badge>}
                  </div>
                  <p className="mb-2 text-xs text-muted">{a.area.village}, {a.area.block}, {a.area.district}</p>
                  <Progress value={(entries.data ?? []).filter((e) => e.assignmentId === a.id).length} max={a.target} />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
