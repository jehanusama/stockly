import { createContext, useContext, useState, useCallback, useRef } from "react";

const ToastContext = createContext(null);

let _nextId = 0;

/**
 * Variants: "success" | "error" | "warning" | "info"
 * Duration: ms before auto-dismiss (0 = stays until manually closed)
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback(
    (message, { variant = "info", duration = 4000, title } = {}) => {
      const id = ++_nextId;
      setToasts((prev) => [...prev, { id, message, variant, title }]);

      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  // Shorthand helpers
  const success = useCallback(
    (message, opts) => toast(message, { variant: "success", duration: 3500, ...opts }),
    [toast]
  );
  const error = useCallback(
    (message, opts) => toast(message, { variant: "error", duration: 5500, ...opts }),
    [toast]
  );
  const warning = useCallback(
    (message, opts) => toast(message, { variant: "warning", duration: 4500, ...opts }),
    [toast]
  );
  const info = useCallback(
    (message, opts) => toast(message, { variant: "info", duration: 4000, ...opts }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ─────────────────────────────────────────────
   Internal stack renderer
───────────────────────────────────────────── */
function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed z-[9999] bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] flex flex-col-reverse gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const ICONS = {
  success: (
    <svg className="shrink-0 w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="shrink-0 w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="shrink-0 w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="shrink-0 w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES = {
  success: {
    wrap: "bg-[#0a3628] border border-[var(--color-app-success)] text-[var(--color-app-success)]",
    icon: "text-[var(--color-app-success)]",
    msg: "text-[var(--color-app-text)]",
  },
  error: {
    wrap: "bg-[var(--color-app-danger-muted)] border border-[var(--color-app-danger)] text-[var(--color-app-danger)]",
    icon: "text-[var(--color-app-danger)]",
    msg: "text-[var(--color-app-text)]",
  },
  warning: {
    wrap: "bg-[var(--color-app-warning-muted)] border border-[var(--color-app-warning)] text-[var(--color-app-warning)]",
    icon: "text-[var(--color-app-warning)]",
    msg: "text-[var(--color-app-text)]",
  },
  info: {
    wrap: "bg-[var(--color-app-elevated)] border border-[var(--color-app-border)] text-[var(--color-app-text-muted)]",
    icon: "text-[var(--color-app-accent)]",
    msg: "text-[var(--color-app-text)]",
  },
};

function ToastItem({ toast: t, onDismiss }) {
  const s = STYLES[t.variant] || STYLES.info;

  return (
    <div
      role="alert"
      className={[
        "pointer-events-auto flex items-start gap-3 w-full rounded-xl px-4 py-3 shadow-xl",
        "animate-[slideUp_0.25s_ease-out]",
        s.wrap,
      ].join(" ")}
    >
      <span className={s.icon}>{ICONS[t.variant]}</span>

      <div className="flex-1 min-w-0">
        {t.title && (
          <p className="text-sm font-semibold leading-tight mb-0.5">{t.title}</p>
        )}
        <p className={`text-sm leading-snug ${s.msg}`}>{t.message}</p>
      </div>

      <button
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss notification"
        className="shrink-0 mt-0.5 text-[var(--color-app-text-subtle)] hover:text-[var(--color-app-text)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
