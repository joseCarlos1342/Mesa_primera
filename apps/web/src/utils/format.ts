export function formatCurrency(cents: number | undefined | null): string {
  if (cents == null) return '$0';
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

/** Format centavos as a locale-formatted integer string (no currency symbol). */
export function formatAmount(cents: number | undefined | null): string {
  if (cents == null) return '0';
  return Math.round(cents / 100).toLocaleString('es-CO');
}
