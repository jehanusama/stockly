import { useState, useRef, useEffect, useId } from "react";

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
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxRef = useRef(null);
  const uniqueId = useId();
  const listboxId = `customer-listbox-${uniqueId}`;

  const query = search.trim().toLowerCase();
  const filteredCustomers = customers.filter(
    (c) =>
      !query ||
      (c.name ?? "").toLowerCase().includes(query) ||
      (c.phone ?? "").toLowerCase().includes(query)
  );

  // Compute total options including guest if allowed
  const allOptions = [
    ...(allowGuest ? [{ id: "", name: "Guest Customer (No Account)", isGuest: true }] : []),
    ...filteredCustomers,
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listboxRef.current) {
      const activeEl = listboxRef.current.children[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);

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
    setActiveIndex(-1);
    const input = document.getElementById(`customer-input-${uniqueId}`);
    input?.focus();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
    const input = document.getElementById(`customer-input-${uniqueId}`);
    input?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1 < allOptions.length ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allOptions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < allOptions.length) {
          handleSelect(allOptions[activeIndex].id);
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 && allOptions[activeIndex]
      ? `customer-opt-${uniqueId}-${allOptions[activeIndex].id || "guest"}`
      : undefined;

  return (
    <div className={`flex flex-col gap-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={`customer-input-${uniqueId}`}
          className="text-sm font-medium text-[var(--color-app-text-muted)]"
        >
          {label} {required && <span className="text-[var(--color-app-danger)]">*</span>}
        </label>
      )}

      <div
        className={[
          "flex items-center h-11 px-3 rounded-lg border bg-[var(--color-app-bg)] text-sm transition-colors cursor-text gap-2",
          isOpen
            ? "border-[var(--color-app-border-focus)] ring-2 ring-[var(--color-app-border-focus)]"
            : "border-[var(--color-app-border)] hover:border-[var(--color-app-border-focus)]",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setActiveIndex(0);
          }
        }}
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
          aria-hidden="true"
          className="shrink-0 text-[var(--color-app-text-muted)]"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          id={`customer-input-${uniqueId}`}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-[var(--color-app-text)] placeholder-[var(--color-app-text-muted)] min-w-0"
          placeholder={selectedCustomer ? selectedCustomer.name : placeholder}
          value={getDisplayValue()}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              setActiveIndex(0);
              setSearch("");
            }
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          dir="auto"
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-[var(--color-app-text-muted)] hover:text-[var(--color-app-danger)] transition-colors p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-app-border-focus)]"
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
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={label || "Customers"}
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-panel)] shadow-xl max-h-60 overflow-y-auto"
        >
          {allOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-app-text-muted)] text-center italic">
              {search ? `No customers match "${search}"` : "No customers found"}
            </div>
          ) : (
            allOptions.map((opt, idx) => {
              const isSelected = opt.id === value;
              const isHighlighted = idx === activeIndex;
              const optId = `customer-opt-${uniqueId}-${opt.id || "guest"}`;

              return (
                <div
                  key={opt.id || "guest"}
                  id={optId}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.id)}
                  className={[
                    "w-full flex flex-col items-start px-4 py-2.5 text-sm transition-colors text-left border-b border-[var(--color-app-border)] last:border-0 cursor-pointer",
                    isHighlighted
                      ? "bg-[var(--color-app-elevated)] ring-1 ring-inset ring-[var(--color-app-border-focus)]/50"
                      : "",
                    isSelected
                      ? "bg-[var(--color-app-accent)]/15 text-[var(--color-app-accent)] font-semibold"
                      : "text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
                  ].join(" ")}
                >
                  <span className="font-medium" dir="auto">
                    {opt.name}
                  </span>
                  {opt.phone && (
                    <span className="text-xs text-[var(--color-app-text-muted)] font-mono">
                      {opt.phone}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default CustomerSelect;
