"use client";

import { BadgeCheck, Inbox, MapPin } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert, Badge, Progress, Skeleton } from "@/components/ui/misc";
import { PersonCard } from "@/features/records/person-card";
import { AreaStrip } from "@/features/records/record-form";
import { placeText } from "@/features/work/ui";
import { fmtDate } from "@/lib/utils";
import { useVerifierAreas } from "./hooks";

/**
 * The verifier's current area – same header the DEO sees on "New Add Entry":
 * State, district, PIN, deadline, progress and the DEO's card (call, request, meeting).
 * A verifier has one area at a time.
 */
export function CurrentAreaCard({ className }: { className?: string }) {
  const areas = useVerifierAreas();
  if (areas.isLoading) return <Skeleton className={`h-44 ${className ?? ""}`} />;
  const a = areas.data?.find((x) => x.status === "active");
  if (!a) {
    return (
      <Alert tone="blue" icon={Inbox} className={className}>
        No area is assigned to you right now. The admin will assign your next area – you will get a notification and an e-mail.
      </Alert>
    );
  }
  const { approved, rejected, submitted } = a.progress;
  const pending = Math.max(0, submitted - approved);
  return (
    <Card className={className}>
      <CardHeader
        title={`${a.id} · ${a.taskType}`}
        action={
          a.allApprovedAt ? (
            <Badge tone="green">All approved</Badge>
          ) : (
            <Badge tone="blue">{a.recordType === "college" ? "College" : "School"} entries · Target {a.target}</Badge>
          )
        }
      />
      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <AreaStrip area={a.area} />
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="size-3.5" /> {placeText({ village: a.area.village, block: a.area.block, district: a.area.district })} · deadline {fmtDate(a.deadline)}
          </p>
          <div className="max-w-md">
            <Progress value={approved} max={a.target} />
            <p className="mt-1 text-xs text-muted">
              <b className="text-success">{approved}</b> approved of {a.target} · <b className="text-saffron-dark">{pending}</b> waiting for you · <b className="text-danger">{rejected}</b> rejected (with the DEO)
            </p>
          </div>
          {a.allApprovedAt && (
            <Alert tone="green" icon={BadgeCheck}>
              You approved every entry of this area on {fmtDate(a.allApprovedAt)}. The admin has been told and will mark the work completed – then you are free for a new area.
            </Alert>
          )}
        </div>
        <PersonCard title="Entries made by (DEO)" person={a.deo} />
      </div>
    </Card>
  );
}
