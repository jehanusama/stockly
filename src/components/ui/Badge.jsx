
const variantStyles = {
  default: "bg-[var(--color-app-elevated)] text-[var(--color-app-text-muted)] border-[var(--color-app-border)]",
  accent:  "bg-[var(--color-app-accent-muted)] text-[var(--color-app-accent)] border-[var(--color-app-accent-muted)]",
  warning: "bg-[var(--color-app-warning-muted)] text-[var(--color-app-warning)] border-[var(--color-app-warning-muted)]",
  danger:  "bg-[var(--color-app-danger-muted)] text-[var(--color-app-danger)] border-[var(--color-app-danger-muted)]",
  success: "bg-[var(--color-app-success-muted)] text-[var(--color-app-success)] border-[var(--color-app-success-muted)]",
};

const dotColors = {
  default: "bg-[var(--color-app-text-muted)]",
  accent:  "bg-[var(--color-app-accent)]",
  warning: "bg-[var(--color-app-warning)]",
  danger:  "bg-[var(--color-app-danger)]",
  success: "bg-[var(--color-app-success)]",
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[10px] gap-1",
  md: "px-2 py-1 text-xs gap-1.5",
};

export function Badge({
  variant = "default",
  size = "md",
  dot = false,
  className = "",
  children,
}) {
  return (
    <span
      className={[
        "inline-flex items-center font-medium rounded-full border",
        variantStyles[variant] ?? variantStyles.default,
        sizeStyles[size] ?? sizeStyles.md,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={[
            "rounded-full flex-shrink-0",
            size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
            dotColors[variant] ?? dotColors.default,
          ].join(" ")}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
