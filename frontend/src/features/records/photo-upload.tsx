"use client";

import { Camera } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMe } from "@/components/layout/dashboard-shell";
import { useUploadPhoto } from "@/features/work/hooks";

/** Resizes a photo (max 600 px) and saves it as JPEG so the upload is small. */
async function toJpeg(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Choose a JPG or PNG photo.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("This photo could not be read. Please choose another file."));
      i.src = url;
    });
    const scale = Math.min(1, 600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("This photo could not be read.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "Change photo" button for the logged-in DEO / verifier. */
export function ChangePhotoButton() {
  const me = useMe();
  const upload = useUploadPhoto(me.role, me.id);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        aria-label="Choose profile photo"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            await upload.mutateAsync(await toJpeg(file));
            toast.success("Profile photo updated.");
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      />
      <Button type="button" variant="light" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
        <Camera /> {upload.isPending ? "Uploading…" : "Change photo"}
      </Button>
    </>
  );
}
