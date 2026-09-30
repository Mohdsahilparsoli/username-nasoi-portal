"use client";

import { CircleCheck, ExternalLink, FileText, ImageIcon, LoaderCircle, RefreshCw, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Upload box without preview: shows the chosen file name with Change / Remove.
 * `accept` e.g. "image/png,image/jpeg" or ".pdf,image/png,image/jpeg".
 */
export function FileUpload({
  fileName,
  accept,
  maxMb = 2,
  maxPdfMb,
  hint,
  invalid,
  kind = "document",
  viewUrl,
  onFile,
  onClear,
}: {
  fileName?: string;
  accept: string;
  maxMb?: number;
  /** Separate limit for PDF files (images are compressed before upload, PDFs are not). */
  maxPdfMb?: number;
  hint: string;
  invalid?: boolean;
  kind?: "image" | "document";
  /** When set, a "View" link opens the uploaded file in a new tab. */
  viewUrl?: string;
  onFile: (file: File) => void | Promise<void>;
  onClear: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const Icon = kind === "image" ? ImageIcon : FileText;
  const [busy, setBusy] = useState(false);

  const pick = async (f?: File) => {
    if (!f || busy) return;
    const allowed = accept.split(",").map((a) => a.trim().toLowerCase());
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    const ok = allowed.some((a) => a === f.type.toLowerCase() || a === ext);
    if (!ok) return toast.error("This file type is not allowed.");
    const isPdf = ext === ".pdf" || f.type === "application/pdf";
    const limit = isPdf && maxPdfMb ? maxPdfMb : maxMb;
    if (f.size > limit * 1024 * 1024) return toast.error(`${isPdf ? "PDF" : "File"} must be under ${limit} MB.`);
    setBusy(true);
    try {
      await onFile(f);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {busy ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-soft/40 px-4 py-3" aria-live="polite">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-primary">
            <LoaderCircle className="size-5 animate-spin" />
          </span>
          <p className="text-sm font-semibold text-navy">Uploading…</p>
        </div>
      ) : fileName ? (
        <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success-soft/50 px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-success">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">{fileName}</p>
            <p className="flex items-center gap-1 text-xs text-success"><CircleCheck className="size-3.5" /> Uploaded</p>
          </div>
          {viewUrl && (
            <a href={viewUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft">
              <ExternalLink className="size-3.5" /> View
            </a>
          )}
          <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft">
            <RefreshCw className="size-3.5" /> Change
          </button>
          <button type="button" onClick={onClear} aria-label="Remove file" className="rounded-md p-1 text-muted hover:bg-danger-soft hover:text-danger">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed bg-canvas px-4 py-4 transition hover:border-primary hover:bg-primary-soft/40",
            invalid ? "border-danger" : "border-slate-300",
          )}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-sm">
            <Upload className="size-5" />
          </span>
          <span className="text-sm">
            <b className="block text-navy">Click to upload or drag &amp; drop</b>
            <span className="text-xs text-muted">{hint}</span>
          </span>
        </label>
      )}
    </div>
  );
}
