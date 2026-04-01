// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Formatters (SA Locale)
// ═══════════════════════════════════════════════════════════════

export function fmtZAR(v: number | null | undefined): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const formatted = abs >= 1_000_000
    ? `${(abs / 1_000_000).toFixed(1)}M`
    : abs >= 1_000
    ? `${(abs / 1_000).toFixed(0)}K`
    : abs.toLocaleString('en-ZA', { minimumFractionDigits: 0 });
  return `${v < 0 ? '-' : ''}R ${formatted}`;
}

export function fmtZARFull(v: number | null | undefined): string {
  if (v == null) return '—';
  return `R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('en-ZA');
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
