export function StockBar({ current, threshold = 10 }) {
  const percent = Math.min(100, Math.max(0, (current / threshold) * 100));
  
  const barColor = current <= 2 ? "var(--color-app-danger)" : "var(--color-app-accent)";

  return (
    <div className="flex flex-col gap-1.5 w-28">
      <div className="flex justify-between items-end leading-none">
        <span className="text-[10px] font-medium text-[var(--color-app-text-muted)] uppercase tracking-wider">Remaining</span>
        <span className="text-xs font-mono text-[var(--color-app-text)]">{current}<span className="text-[var(--color-app-text-subtle)]">/{threshold}</span></span>
      </div>
      <div className="h-1.5 w-full bg-[var(--color-app-panel)] rounded-full overflow-hidden border border-[var(--color-app-border)]">
        <div 
          className="h-full rounded-full transition-all duration-500" 
          style={{ width: `${percent}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export default StockBar;
