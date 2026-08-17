/**
 * PageContainer — consistent wrapper for every page.
 *
 * Props:
 *  title       - string  — page heading (h1)
 *  subtitle    - string  — optional muted line below the title
 *  actions     - ReactNode — slot for top-right buttons (e.g. "Add Product")
 *  maxWidth    - "full" | "xl" | "2xl" | "4xl" | "6xl"  (default: "6xl")
 *  children    - page body content
 *  className   - extra classes on the inner wrapper
 */
const maxWidthMap = {
  full: "max-w-full",
  xl:   "max-w-xl",
  "2xl":"max-w-2xl",
  "4xl":"max-w-4xl",
  "6xl":"max-w-6xl",
};

export function PageContainer({
  title,
  subtitle,
  actions,
  maxWidth = "6xl",
  children,
  className = "",
}) {
  return (
    <div className="flex-1 min-h-screen bg-[var(--color-app-bg)] overflow-y-auto">
      <div
        className={[
          "mx-auto w-full px-4 sm:px-6 py-6",
          maxWidthMap[maxWidth] ?? maxWidthMap["6xl"],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Page header */}
        {(title || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              {title && (
                <h1 className="text-xl font-semibold text-[var(--color-app-text)] tracking-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-[var(--color-app-text-muted)]">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        )}

        {/* Page body */}
        {children}
      </div>
    </div>
  );
}

export default PageContainer;
