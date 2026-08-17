
const paddingMap = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  className = "",
  padding = "md",
  hoverable = false,
  children,
  ...rest
}) {
  return (
    <div
      className={[
        "rounded-xl border border-[var(--color-app-border)]",
        "bg-[var(--color-app-panel)]",
        "transition-all duration-200",
        paddingMap[padding] ?? paddingMap.md,
        hoverable
          ? "hover:bg-[var(--color-app-panel-hover)] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
