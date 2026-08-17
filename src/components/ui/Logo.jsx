/**
 * Logo — Shopping bag SVG icon with a bold "S" inside, plus the "Stockly" wordmark.
 *
 * Props:
 *  size        - icon size in px  (default: 32)
 *  showText    - boolean — show "Stockly" wordmark  (default: true)
 *  className   - extra classes on the root wrapper
 */
export function Logo({ size = 32, showText = true, className = "" }) {
  // Wordmark font size scales with icon but stays readable
  const textSize = Math.round(size * 0.47);

  return (
    <div
      className={[
        "inline-flex items-center gap-2.5 select-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Stockly logo"
    >
      {/* ── Shopping bag SVG ───────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Bag body */}
        <path
          d="M6 13h24l-2.5 16.5A2 2 0 0 1 25.52 31H10.48a2 2 0 0 1-1.98-1.5L6 13Z"
          stroke="var(--color-app-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Bag handle */}
        <path
          d="M13 13V10a5 5 0 0 1 10 0v3"
          stroke="var(--color-app-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Bold "S" — x/y centers it in the bag body area (rows ~13-31, mid = 22) */}
        <text
          x="18"
          y="22"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
          fill="#f3f4f6"
        >
          S
        </text>
      </svg>

      {/* ── Wordmark — vertically centered via flex ── */}
      {showText && (
        <span
          style={{
            fontSize: textSize,
            lineHeight: 1,
          }}
          className="font-semibold tracking-tight text-[var(--color-app-text)] self-center"
        >
          Stockly
        </span>
      )}
    </div>
  );
}

export default Logo;

