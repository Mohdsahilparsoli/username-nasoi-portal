"use client";

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldBase } from "./form-controls";

/**
 * Dropdown that also allows typing: pick from the list, or type a value.
 * Typing filters the list; Arrow keys + Enter pick; Escape closes.
 */
export function Combobox({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder = "Select or type",
  invalid,
  inputMode,
  maxLength,
  name,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  options: readonly string[];
  placeholder?: string;
  invalid?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  name?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState(false); // true while the user is typing
  const [active, setActive] = React.useState(0);
  const box = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLUListElement>(null);
  const listId = `${id}-list`;

  const shown = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    return filter && q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, value, filter]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted option in view.
  React.useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = (typing: boolean) => {
    setFilter(typing);
    const i = options.indexOf(value);
    setActive(!typing && i >= 0 ? i : 0);
    setOpen(true);
  };
  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <input
        id={id}
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          openList(true);
        }}
        onClick={() => !open && openList(false)}
        onBlur={() => onBlur?.()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) return openList(false);
            setActive((a) => Math.max(0, Math.min(shown.length - 1, a + (e.key === "ArrowDown" ? 1 : -1))));
          } else if (e.key === "Enter" && open && shown[active] !== undefined) {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape" || e.key === "Tab") {
            setOpen(false);
          }
        }}
        className={cn(fieldBase, "h-10 pr-10")}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show options"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (open ? setOpen(false) : (openList(false), document.getElementById(id)?.focus()))}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-navy"
      >
        <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
      </button>
      {open && shown.length > 0 && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-xl"
        >
          {shown.map((o, i) => (
            <li
              key={o}
              data-i={i}
              role="option"
              aria-selected={o === value}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
              className={cn("flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-sm", i === active ? "bg-primary-soft text-primary" : "text-navy")}
            >
              {o}
              {o === value && <Check className="size-4 shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
