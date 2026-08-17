
export function Table({
  columns = [],
  rows = [],
  emptyMessage = "No data available",
  loading = false,
  className = "",
}) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div
      className={[
        "w-full overflow-x-auto rounded-xl border border-[var(--color-app-border)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <table className="w-full border-collapse text-sm">
        {/* Head */}
        <thead>
          <tr className="border-b border-[var(--color-app-border)] bg-[var(--color-app-elevated)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  "px-4 py-3 font-semibold text-[var(--color-app-text-muted)] uppercase tracking-wide text-xs",
                  alignClass[col.align ?? "left"],
                ].join(" ")}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            // Skeleton rows
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--color-app-border)] bg-[var(--color-app-panel)]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 rounded bg-[var(--color-app-elevated)] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-[var(--color-app-text-muted)] italic"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIdx) => (
              <tr
                key={row.id ?? rowIdx}
                className={[
                  "border-b border-[var(--color-app-border)] last:border-0",
                  "bg-[var(--color-app-panel)] hover:bg-[var(--color-app-panel-hover)]",
                  "transition-colors duration-100",
                  row.className || ""
                ].filter(Boolean).join(" ")}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      "px-4 py-3 text-[var(--color-app-text)]",
                      alignClass[col.align ?? "left"],
                    ].join(" ")}
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
