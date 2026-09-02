export function StockBar({ current, quantity, threshold, unit = "" }) {
  const qty = current ?? quantity ?? 0;
  const isOut = qty <= 0;
  const isLow = qty > 0 && qty < 10;

  // Determine status color: Red for out of stock, Amber for low stock, Green for healthy stock
  const statusColor = isOut
    ? "var(--color-app-danger)"
    : isLow
    ? "var(--color-app-warning)"
    : "var(--color-app-success)";

  // Calculate visual percentage indicator
  const maxVal = threshold || 50;
  const percent = isOut ? 0 : Math.min(100, Math.max(10, (qty / maxVal) * 100));

  return (
    <div className="flex flex-col gap-1 w-32">
      <div className="flex justify-between items-center leading-none">
        <span className="text-xs font-mono font-semibold text-[var(--color-app-text)]">
          {qty} {unit}
        </span>
        {isOut ? (
          <span className="text-[10px] font-bold text-[var(--color-app-danger)] uppercase tracking-wider">Out</span>
        ) : isLow ? (
          <span className="text-[10px] font-bold text-[var(--color-app-warning)] uppercase tracking-wider">Low</span>
        ) : null}
      </div>
      <div className="h-1.5 w-full bg-[var(--color-app-elevated)] rounded-full overflow-hidden border border-[var(--color-app-border)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percent}%`,
            backgroundColor: statusColor,
          }}
        />
      </div>
    </div>
  );
}

export default StockBar;
