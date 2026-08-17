
export function Select({
  id,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  error,
  helperText,
  disabled = false,
  required = false,
  className = "",
  selectClassName = "",
  ...rest
}) {
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

      {/* Wrapper gives us the custom chevron icon */}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={[
            "w-full h-10 pl-3 pr-9 rounded-lg text-sm appearance-none",
            "bg-[var(--color-app-bg)] text-[var(--color-app-text)]",
            "border",
            error
              ? "border-[var(--color-app-danger)] focus:ring-[var(--color-app-danger)]"
              : "border-[var(--color-app-border)] focus:ring-[var(--color-app-border-focus)] focus:border-[var(--color-app-border-focus)]",
            "outline-none focus:ring-2 focus:ring-offset-0",
            "transition-colors duration-150 cursor-pointer",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            selectClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[#1f2937] text-[#f3f4f6]"
            >
              {opt.label}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--color-app-text-muted)]">
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
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
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

export default Select;
