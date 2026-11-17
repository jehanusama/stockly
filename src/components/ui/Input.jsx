
import { useRef } from "react";
import { toEnglishDigits } from "@/utils/currency";

export function Input({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  inputClassName = "",
  step,
  ...rest
}) {
  const inputRef = useRef(null);
  const isNumberType = type === "number";

  const handleChange = (e) => {
    if (!onChange) return;

    if (isNumberType) {
      const val = e.target.value;
      // Convert Eastern Arabic and Persian numerals, and Arabic decimal separator (٫) to English (0-9, .)
      let normalized = toEnglishDigits(val);

      // Keep only one decimal point
      const hasMinus = normalized.startsWith("-");
      normalized = normalized.replace(/-/g, "");

      const parts = normalized.split(".");
      if (parts.length > 2) {
        normalized = parts[0] + "." + parts.slice(1).join("");
      }

      // Allow only numbers and decimal point
      normalized = normalized.replace(/[^0-9.]/g, "");
      if (hasMinus) {
        normalized = "-" + normalized;
      }

      e.target.value = normalized;
      onChange(e);
    } else if (type === "tel" || rest.inputMode === "numeric" || rest.inputMode === "decimal") {
      e.target.value = toEnglishDigits(e.target.value);
      onChange(e);
    } else {
      onChange(e);
    }
  };

  const handleStep = (direction) => {
    if (disabled) return;
    const current = parseFloat(value) || 0;
    const stepVal = step && step !== "any" ? parseFloat(step) : 1;
    const minVal = rest.min !== undefined && rest.min !== "" ? parseFloat(rest.min) : -Infinity;
    const maxVal = rest.max !== undefined && rest.max !== "" ? parseFloat(rest.max) : Infinity;

    const nextRaw = direction === "up" ? current + stepVal : current - stepVal;
    const clamped = Math.min(maxVal, Math.max(minVal, nextRaw));
    const rounded = parseFloat(clamped.toFixed(4));
    const strVal = rounded.toString();

    if (inputRef.current) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (nativeSetter) {
        nativeSetter.call(inputRef.current, strVal);
        inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
    }
    onChange?.({ target: { value: strVal, name: rest.name, id } });
  };

  const handleKeyDown = (e) => {
    if (isNumberType) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleStep("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleStep("down");
      }
    }
    rest.onKeyDown?.(e);
  };

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-[var(--color-app-text-muted)]"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-[var(--color-app-danger)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          id={id}
          type={isNumberType ? "text" : type}
          inputMode={isNumberType ? (rest.inputMode || "decimal") : rest.inputMode}
          step={isNumberType ? (step ?? "any") : step}
          value={value ?? ""}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={[
            "w-full h-10 px-3 rounded-lg text-sm",
            isNumberType ? "pr-8 font-mono" : "",
            "bg-[var(--color-app-bg)] text-[var(--color-app-text)]",
            "border",
            error
              ? "border-[var(--color-app-danger)] focus:ring-[var(--color-app-danger)]"
              : "border-[var(--color-app-border)] focus:ring-[var(--color-app-border-focus)] focus:border-[var(--color-app-border-focus)]",
            "outline-none focus:ring-2 focus:ring-offset-0",
            "placeholder:text-[var(--color-app-text-subtle)]",
            "transition-colors duration-150",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            inputClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />

        {isNumberType && !disabled && (
          <div className="absolute right-1 inset-y-1 flex flex-col justify-center border-l border-[var(--color-app-border)]/50 pl-1 pr-0.5 select-none pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Increment"
              onClick={() => handleStep("up")}
              className="h-3.5 w-4.5 flex items-center justify-center text-[var(--color-app-text-muted)] hover:text-[var(--color-app-accent)] hover:bg-[var(--color-app-elevated)] rounded transition-colors focus:outline-none cursor-pointer"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Decrement"
              onClick={() => handleStep("down")}
              className="h-3.5 w-4.5 flex items-center justify-center text-[var(--color-app-text-muted)] hover:text-[var(--color-app-accent)] hover:bg-[var(--color-app-elevated)] rounded transition-colors focus:outline-none cursor-pointer"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        )}
      </div>

      {(error || helperText) && (
        <p
          className={[
            "text-xs",
            error
              ? "text-[var(--color-app-danger)]"
              : "text-[var(--color-app-text-subtle)]",
          ].join(" ")}
        >
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}

export default Input;
