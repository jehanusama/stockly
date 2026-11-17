/**
 * Converts Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹),
 * plus Arabic decimal separators (٫) and commas, to standard Western digits (0-9) and dot (.).
 */
export function toEnglishDigits(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٫,]/g, ".");
}

/**
 * Safely parses any number, string, or Arabic numeral string into a valid float.
 * Returns defaultValue (0 by default) if invalid or NaN.
 */
export function parseNumber(val, defaultValue = 0) {
  if (val === null || val === undefined || val === "") return defaultValue;
  if (typeof val === "number") return isNaN(val) ? defaultValue : val;
  const normalized = toEnglishDigits(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(normalized);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Formats a number as Egyptian Pound.
 * Output: "120.50 EGP"
 */
export function formatCurrency(amount) {
  const num = parseNumber(amount, 0);
  return `${num.toFixed(2)} EGP`;
}
