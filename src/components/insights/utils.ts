export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCalories(kcal: number): string {
  return `${Math.round(kcal).toLocaleString()} kcal`;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${months[monthIdx] || parts[1]} ${day}`;
  }
  return dateStr;
}

/**
 * Earthy palette strokes & fills for Kora's warm editorial cookbook charts
 * Sage #6B7F5E, Terracotta #B86B4B, Ochre #C49A45, Olive #7A7463
 */
export const CHART_PALETTE = [
  '#7A7463', // olive
  '#6B7F5E', // sage
  '#B86B4B', // terracotta
  '#C49A45', // ochre
  '#8E8774', // warm olive-taupe
  '#5B6E4E', // deep sage
  '#A05A3D', // deep terracotta
  '#AD8537', // deep ochre
  '#9B9482', // muted taupe
  '#4A4639', // deep olive-charcoal
];
