import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ─── Column definition ─────────────────────────────────────── */

export type ColumnDef<T> = {
  /** Header label (shown in table head and as card field label) */
  header: string;
  /** Unique key for React keying */
  key: string;
  /** Render the cell content for both table and card */
  render: (row: T, index: number) => ReactNode;
  /** Header alignment — defaults to "left" */
  headerAlign?: "left" | "center" | "right";
  /** Cell alignment — defaults to "left" */
  align?: "left" | "center" | "right";
  /** Hide this column label in the card view (useful for self-evident values) */
  hideCardLabel?: boolean;
  /** Span full width in the card grid (useful for detail/action columns) */
  cardFullWidth?: boolean;
  /** Additional className for <td> */
  className?: string;
};

/* ─── Component props ────────────────────────────────────────── */

type ResponsiveDataViewProps<T> = {
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Data rows */
  data: T[];
  /** Unique key extractor per row */
  keyExtractor: (row: T, index: number) => string;
  /** Message when data is empty */
  emptyMessage?: string;
  /** Optional icon for empty state */
  emptyIcon?: ReactNode;
  /** Optional header bar (filters, title, etc.) rendered above the data */
  header?: ReactNode;
  /** Optional footer (pagination, totals) rendered below */
  footer?: ReactNode;
  /** Optional custom card renderer — overrides the default label/value grid */
  renderCard?: (row: T, index: number) => ReactNode;
  /** Extra className on the outer container */
  className?: string;
  /** Row className (table) */
  rowClassName?: (row: T, index: number) => string;
  /** Card className */
  cardClassName?: (row: T, index: number) => string;
};

/* ─── Alignment helpers ──────────────────────────────────────── */

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/* ─── Component ──────────────────────────────────────────────── */

export function ResponsiveDataView<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Sin registros.",
  emptyIcon,
  header,
  footer,
  renderCard,
  className,
  rowClassName,
  cardClassName,
}: ResponsiveDataViewProps<T>) {
  const isEmpty = data.length === 0;

  return (
    <div
      className={cn(
        "bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl",
        className
      )}
    >
      {header}

      {/* ─── Desktop table (lg+) ─────────────────────── */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-white/5">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-6 py-4",
                    alignClass[col.headerAlign ?? col.align ?? "left"]
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-slate-500 font-medium"
                >
                  <div className="flex flex-col items-center gap-3">
                    {emptyIcon}
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={keyExtractor(row, i)}
                  className={cn(
                    "hover:bg-white/5 transition-colors",
                    rowClassName?.(row, i)
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-6 py-4 align-middle",
                        alignClass[col.align ?? "left"],
                        col.className
                      )}
                    >
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Mobile cards (<lg) ──────────────────────── */}
      <div className="lg:hidden">
        {isEmpty ? (
          <div className="px-6 py-12 text-center text-slate-500 font-medium">
            <div className="flex flex-col items-center gap-3">
              {emptyIcon}
              {emptyMessage}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.map((row, i) =>
              renderCard ? (
                <div
                  key={keyExtractor(row, i)}
                  className={cn(
                    "p-4",
                    cardClassName?.(row, i)
                  )}
                >
                  {renderCard(row, i)}
                </div>
              ) : (
                <div
                  key={keyExtractor(row, i)}
                  className={cn(
                    "p-4 space-y-3",
                    cardClassName?.(row, i)
                  )}
                >
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {columns.map((col) => (
                      <div
                        key={col.key}
                        className={cn(
                          col.cardFullWidth && "col-span-2"
                        )}
                      >
                        {!col.hideCardLabel && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                            {col.header}
                          </p>
                        )}
                        <div className="text-sm text-slate-300">
                          {col.render(row, i)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}
