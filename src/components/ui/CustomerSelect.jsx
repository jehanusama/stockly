import { useState, useRef, useEffect } from "react";

export function CustomerSelect({
  label = "Customer",
  value = "",
  onChange,
  customers = [],
  allowGuest = false,
  required = false,
  placeholder = "Select a customer...",
  className = "",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCustomer = customers.find((c) => c.id === value);

  const getDisplayValue = () => {
    if (isOpen) return search;
    if (selectedCustomer) return selectedCustomer.name;
    if (value === "" && allowGuest) return "Guest Customer (No Account)";
    return "";
  };

  const handleSelect = (id) => {
    onChange(id);
    setSearch("");
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  const query = search.trim().toLowerCase();
  const filteredCustomers = customers.filter(
    (c) =>
      !query ||
      (c.name ?? "").toLowerCase().includes(query) ||
      (c.phone ?? "").toLowerCase().includes(query)
  );

  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-[var(--color-app-text-muted)]">
          {label} {required && <span className="text-[var(--color-app-danger)]">*</span>}
        </label>
      )}

      <div
        className={[
          "flex items-center h-11 px-3 rounded-lg border bg-[var(--color-app-bg)] text-sm transition-colors cursor-text gap-2",
          isOpen
            ? "border-[var(--color-app-border-focus)] ring-1 ring-[var(--color-app-border-focus)]"
            : "border-[var(--color-app-border)]",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        onClick={() => !disabled && setIsOpen(true)}
      >
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
          className="shrink-0 text-[var(--color-app-text-muted)]"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-[var(--color-app-text)] placeholder-[var(--color-app-text-muted)] min-w-0"
          placeholder={selectedCustomer ? selectedCustomer.name : placeholder}
          value={getDisplayValue()}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setSearch("");
            }
          }}
          autoComplete="off"
          dir="auto"
        />

        {value && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            className="shrink-0 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] transition-colors"
            aria-label="Clear customer selection"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)] shadow-xl max-h-60 overflow-y-auto">
          {allowGuest && (
            <button
              type="button"
              onMouseDown={() => handleSelect("")}
              className={[
                "w-full flex flex-col items-start px-4 py-2.5 text-sm transition-colors text-left border-b border-[var(--color-app-border)]",
                !value
                  ? "bg-[var(--color-app-accent)]/15 text-[var(--color-app-accent)]"
                  : "text-[var(--color-app-text-muted)] hover:bg-[var(--color-app-elevated)]",
              ].join(" ")}
            >
              <span className="font-medium">Guest Customer (No Account)</span>
            </button>
          )}

          {filteredCustomers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-app-text-muted)] text-center italic">
              {search ? `No customers match "${search}"` : "No customers found"}
            </div>
          ) : (
            filteredCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => handleSelect(c.id)}
                className={[
                  "w-full flex flex-col items-start px-4 py-2.5 text-sm transition-colors text-left border-b border-[var(--color-app-border)] last:border-0",
                  c.id === value
                    ? "bg-[var(--color-app-accent)]/15 text-[var(--color-app-accent)]"
                    : "text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
                ].join(" ")}
              >
                <span className="font-medium" dir="auto">
                  {c.name}
                </span>
                {c.phone && (
                  <span className="text-xs text-[var(--color-app-text-muted)] font-mono">
                    {c.phone}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
