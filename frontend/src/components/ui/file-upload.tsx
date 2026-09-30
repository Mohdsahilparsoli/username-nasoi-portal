"use client";

import { CircleCheck, ExternalLink, FileText, ImageIcon, RefreshCw, Upload, X } from "lucide-react";
import { useId, useRef } from "react";
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

  const pick = async (f?: File) => {
    if (!f) return;
    const allowed = accept.split(",").map((a) => a.trim().toLowerCase());
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    const ok = allowed.some((a) => a === f.type.toLowerCase() || a === ext);
    if (!ok) return toast.error("This file type is not allowed.");
    if (f.size > maxMb * 1024 * 1024) return toast.error(`File must be under ${maxMb} MB.`);
    await onFile(f);
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
      {fileName ? (
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
