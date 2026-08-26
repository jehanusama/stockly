import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

// ── Helpers ───────────────────────────────────────────────────────
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseISO(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(str) {
  if (!str) return "";
  const d = parseISO(str);
  if (!d) return str;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Calendar Panel (portal-rendered, position:fixed) ─────────────
function CalendarPanel({ value, onChange, minDate, maxDate, markedDates = [], onClose, anchorRect }) {
  const today = toISO(new Date());
  const markedSet = new Set(markedDates);

  const initDate = value ? parseISO(value) : new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const panelRef = useRef(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("en-US", {
    month: "long", year: "numeric",
  });

  // Calculate position: appear below anchor, flip up if it would overflow viewport
  const style = (() => {
    if (!anchorRect) return { top: 0, left: 0 };
    const PANEL_H = 340;
    const PANEL_W = 288;
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const top = spaceBelow >= PANEL_H
      ? anchorRect.bottom + 8
      : anchorRect.top - PANEL_H - 8;
    const left = Math.min(
      anchorRect.left,
      window.innerWidth - PANEL_W - 12,
    );
    return { top, left, width: Math.max(anchorRect.width, PANEL_W) };
  })();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Close on outside click (panel itself or anchor handled by parent)
  useEffect(() => {
    function handle(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handle, true);
    document.addEventListener("touchstart", handle, true);
    return () => {
      document.removeEventListener("mousedown", handle, true);
      document.removeEventListener("touchstart", handle, true);
    };
  }, [onClose]);

  const handleDayClick = (day) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    onChange(iso);
    onClose();
  };

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: style.top,
        left: style.left,
        width: style.width,
        zIndex: 9999,
      }}
      className="rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)] shadow-2xl shadow-black/50 p-4 flex flex-col gap-3 select-none"
    >
      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-app-text-muted)] hover:bg-[var(--color-app-elevated)] hover:text-[var(--color-app-text)] transition-colors"
          aria-label="Previous month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-[var(--color-app-text)] tracking-tight">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-app-text-muted)] hover:bg-[var(--color-app-elevated)] hover:text-[var(--color-app-text)] transition-colors"
          aria-label="Next month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", padding: "4px 0", fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-app-text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = iso === value;
          const isToday = iso === today;
          const isDisabled = (minDate && iso < minDate) || (maxDate && iso > maxDate);
          const isMarked = markedSet.has(iso);

          let bg = "transparent";
          let color = "var(--color-app-text)";
          let border = "none";
          if (isSelected) { bg = "var(--color-app-accent)"; color = "#fff"; }
          else if (isToday) { border = "1.5px solid var(--color-app-accent)"; color = "var(--color-app-accent)"; }
          if (isDisabled) { color = "var(--color-app-text-muted)"; }

          return (
            <button
              key={iso}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDayClick(day)}
              style={{
                position: "relative",
                background: bg,
                color,
                border,
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 500,
                height: "34px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.3 : 1,
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { if (!isSelected && !isDisabled) e.currentTarget.style.background = "var(--color-app-elevated)"; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = bg; }}
              aria-label={iso}
              aria-pressed={isSelected}
            >
              {day}
              {isMarked && (
                <span style={{
                  position: "absolute",
                  bottom: "3px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: isSelected ? "rgba(255,255,255,0.7)" : "var(--color-app-accent)",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "8px",
        borderTop: "1px solid var(--color-app-border)",
      }}>
        <button
          type="button"
          onClick={() => { onChange(""); onClose(); }}
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-app-text-muted)", background: "none", border: "none", cursor: "pointer", transition: "color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--color-app-danger)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--color-app-text-muted)"}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => { onChange(today); onClose(); }}
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-app-accent)", background: "none", border: "none", cursor: "pointer", opacity: 1, transition: "opacity 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          Today
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ── DatePicker ────────────────────────────────────────────────────
export function DatePicker({
  value = "",
  onChange,
  placeholder = "Select date…",
  label,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  markedDates,
  className = "",
  id,
}) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const triggerRef = useRef(null);

  const handleOpen = () => {
    if (disabled) return;
    if (!open && triggerRef.current) {
      setAnchorRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen(o => !o);
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const displayValue = formatDisplay(value);

  return (
    <div className={["relative flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--color-app-text-muted)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-app-danger)]" aria-hidden="true">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={[
          "w-full h-10 px-3 rounded-lg text-sm text-left",
          "bg-[var(--color-app-bg)]",
          "border transition-colors duration-150",
          open
            ? "border-[var(--color-app-border-focus)] ring-2 ring-[var(--color-app-border-focus)] ring-offset-0"
            : "border-[var(--color-app-border)] hover:border-[var(--color-app-border-focus)]",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          "flex items-center justify-between gap-2 outline-none",
        ].join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={displayValue ? "text-[var(--color-app-text)]" : "text-[var(--color-app-text-subtle)]"}>
          {displayValue || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={["shrink-0 text-[var(--color-app-text-muted)] transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <CalendarPanel
          value={value}
          onChange={onChange}
          minDate={minDate}
          maxDate={maxDate}
          markedDates={markedDates}
          onClose={() => setOpen(false)}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}

export default DatePicker;
