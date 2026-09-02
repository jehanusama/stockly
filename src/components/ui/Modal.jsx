import { useEffect, useRef } from "react";


const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  children,
  footer,
}) {
  const panelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (!panelRef.current?.contains(e.target)) onClose?.();
      }}
    >
      {/* Dimmed background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          "relative w-full max-h-[90vh] flex flex-col rounded-2xl overflow-hidden",
          "bg-[var(--color-app-elevated)] border border-[var(--color-app-border)]",
          "shadow-2xl",
          "animate-[fadeInScale_180ms_ease-out]",
          sizeMap[size] ?? sizeMap.md,
        ].join(" ")}
        style={{ animationFillMode: "both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--color-app-border)] shrink-0">
          <h2
            id="modal-title"
            className="text-base font-semibold text-[var(--color-app-text)] truncate pr-2"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-border)] transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)] shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 text-sm text-[var(--color-app-text)] overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-[var(--color-app-border)] shrink-0 bg-[var(--color-app-panel)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
