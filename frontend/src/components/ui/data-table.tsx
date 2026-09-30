"use client";

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownUp, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { EmptyState, Skeleton } from "./misc";

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyText = "No records found.",
  pageSize = 10,
  rowClassName,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  pageSize?: number;
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    autoResetPageIndex: true,
  });

  const pages = table.getPageCount();

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="whitespace-nowrap border-b border-line bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                  >
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <ArrowDownUp className="size-3 opacity-50" />
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={columns.length} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className={cn("border-b border-line hover:bg-slate-50/70", rowClassName?.(row.original))}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && data.length === 0 && <EmptyState icon={Inbox} text={emptyText} />}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {pages} · {data.length} records
          </span>
          <div className="flex gap-2">
            <Button variant="light" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft /> Prev
            </Button>
            <Button variant="light" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pill filter tabs (All / Pending / Approved / Rejected). */
export function FilterTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition",
            value === o.value ? "border-navy bg-navy text-white" : "border-line bg-white text-muted hover:bg-canvas",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
