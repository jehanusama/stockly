
const variantStyles = {
  primary: [
    "bg-[var(--color-app-accent)] text-white",
    "hover:bg-[var(--color-app-accent-hover)]",
    "focus-visible:ring-[var(--color-app-accent)]",
  ].join(" "),

  secondary: [
    "bg-transparent text-[var(--color-app-text)]",
    "border border-[var(--color-app-border)]",
    "hover:bg-[var(--color-app-panel-hover)] hover:border-[var(--color-app-text-muted)]",
    "focus-visible:ring-[var(--color-app-border-focus)]",
  ].join(" "),

  danger: [
    "bg-[var(--color-app-danger)] text-white",
    "hover:bg-[var(--color-app-danger-hover)]",
    "focus-visible:ring-[var(--color-app-danger)]",
  ].join(" "),
};

const sizeStyles = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center font-medium rounded-lg",
        "transition-all duration-150 ease-in-out cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-[var(--color-app-bg)]",
        "select-none whitespace-nowrap",
        variantStyles[variant] ?? variantStyles.primary,
        sizeStyles[size] ?? sizeStyles.md,
        isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      )}
      {children}
    </button>
  );
}

export default Button;
