export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return '$0.00';
  return `$${num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function calculateProgress(total: number, remaining: number): {
  paid: number;
  percentage: number;
} {
  const paid = Math.max(0, total - remaining);
  const percentage = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;
  return { paid, percentage };
}
