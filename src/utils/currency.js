/**
 * Formats a number as Egyptian Pound.
 * Output: "120.50 EGP"
 */
export function formatCurrency(amount) {
  return `${Number(amount).toFixed(2)} EGP`;
}
