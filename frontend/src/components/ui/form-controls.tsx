import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink placeholder:text-slate-400 transition focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:bg-canvas aria-[invalid=true]:border-danger read-only:bg-canvas";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-20 py-2", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldBase, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn("text-sm font-medium text-navy", className)} {...props} />;
}

/** Label + control + error message in one block. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Pill-style radio group that works with react-hook-form register(). */
export function ChoiceGroup({
  options,
  name,
  register,
  invalid,
}: {
  options: string[];
  name: string;
  register: (name: never) => object;
  invalid?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-invalid={invalid}>
      {options.map((o) => (
        <label
          key={o}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary",
            invalid ? "border-danger" : "border-slate-300",
          )}
        >
          <input type="radio" value={o} className="accent-[var(--color-primary)]" {...register(name as never)} />
          {o}
        </label>
      ))}
    </div>
  );
}
