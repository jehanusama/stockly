
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
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={[
          "w-full h-10 px-3 rounded-lg text-sm",
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
