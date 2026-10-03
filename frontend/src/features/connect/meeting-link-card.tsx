"use client";

import { Save, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-controls";
import { useMe } from "@/components/layout/dashboard-shell";
import { useMyProfile } from "@/features/users/hooks";
import { AuthError } from "@/lib/api/auth";
import { useSaveMeetingLink } from "./hooks";
import { JoinMeetingButton, PLATFORM, PlatformMark, platformOf } from "./meeting-ui";

/**
 * "My meeting room": a personal Zoom / Google Meet link. It is shown as a
 * "Join Zoom" / "Join Google Meet" button on my card for the people I work
 * with, and filled in automatically when I schedule a meeting.
 */
export function MeetingLinkCard() {
  const profile = useMyProfile();
  const saved = profile.data?.meetingLink ?? "";
  // Re-mounts (fresh input) whenever the saved link changes.
  return <MeetingLinkForm key={saved} saved={saved} />;
}

function MeetingLinkForm({ saved }: { saved: string }) {
  const { role } = useMe();
  const save = useSaveMeetingLink(role);
  const [link, setLink] = useState(saved);
  const [error, setError] = useState("");
  const platform = platformOf(link);

  const submit = async (value: string) => {
    if (value && !platformOf(value)) return setError("Use a Zoom, Google Meet or Microsoft Teams link starting with https://");
    try {
      await save.mutateAsync(value);
      toast.success(value ? "Meeting room saved." : "Meeting room removed.");
      setError("");
    } catch (e) {
      setError(e instanceof AuthError && e.fields?.length ? e.fields[0]!.message : (e as Error).message);
    }
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Video className="size-4 text-primary" /> My meeting room (Zoom / Google Meet)
          </span>
        }
      />
      <CardBody className="space-y-4">
        <p className="text-sm text-muted">
          Paste your personal Zoom or Google Meet link.{" "}
          {role === "admin" ? "DEOs and verifiers" : role === "deo" ? "Your verifier and the admin" : "Your DEOs and the admin"} will see a <b>Join</b> button on your
          card, and it is filled in automatically when you schedule a meeting.
        </p>
        <Field label="Meeting link" htmlFor="my-meeting-link" error={error}>
          <div className="flex items-center gap-2">
            <PlatformMark platform={platform} className={platform ? "" : "opacity-40"} />
            <Input
              id="my-meeting-link"
              value={link}
              placeholder="https://zoom.us/j/… or https://meet.google.com/…"
              onChange={(e) => {
                setLink(e.target.value);
                setError("");
              }}
            />
          </div>
          {platform && <span className={`mt-1 text-xs font-semibold ${PLATFORM[platform].text}`}>✓ {PLATFORM[platform].label}</span>}
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => submit(link.trim())} disabled={save.isPending || link.trim() === saved}>
            <Save /> {save.isPending ? "Saving…" : "Save link"}
          </Button>
          {saved && <JoinMeetingButton link={saved} label="Test my room" />}
          {saved && (
            <Button variant="ghost" onClick={() => submit("")} disabled={save.isPending}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
