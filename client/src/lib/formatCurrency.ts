/**
 * Formats a number as Indian Rupee currency using en-IN locale
 * @param amount - The amount to format
 * @returns Formatted string with ₹ symbol and Indian numbering system
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a number using Indian numbering system (Lakhs/Crores)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with Indian numbering system
 */
export function formatNumber(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
