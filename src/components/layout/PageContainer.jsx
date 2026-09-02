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
  actions,
  maxWidth = "6xl",
  children,
  className = "",
}) {
  return (
    <div className="flex-1 min-h-screen bg-[var(--color-app-bg)] overflow-y-auto">
      <div
        className={[
          "mx-auto w-full px-4 sm:px-6 py-6 sm:py-8",
          maxWidthMap[maxWidth] ?? maxWidthMap["6xl"],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Page header */}
        {(title || actions) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            {title && (
              typeof title === "string" ? (
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-6 sm:h-7 rounded-full bg-[var(--color-app-accent)] shadow-[0_0_10px_var(--color-app-accent)] shrink-0" />
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-app-text)] tracking-tight">
                    {title}
                  </h1>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="w-1.5 h-6 sm:h-7 rounded-full bg-[var(--color-app-accent)] shadow-[0_0_10px_var(--color-app-accent)] shrink-0" />
                  <div className="text-2xl sm:text-3xl font-extrabold text-[var(--color-app-text)] tracking-tight">
                    {title}
                  </div>
                </div>
              )
            )}
            {actions && (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:ml-auto">
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
