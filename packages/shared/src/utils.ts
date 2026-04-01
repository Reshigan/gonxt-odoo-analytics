// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Shared Utilities
// ═══════════════════════════════════════════════════════════════

import { SA_HOLIDAYS } from './constants';

// ── Currency ──
export function fmtZAR(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  const formatted = abs >= 1_000_000
    ? `${(abs / 1_000_000).toFixed(1)}M`
    : abs >= 1_000
    ? `${(abs / 1_000).toFixed(0)}K`
    : abs.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${value < 0 ? '-' : ''}R ${formatted}`;
}

export function fmtZARFull(value: number | null | undefined): string {
  if (value == null) return '—';
  return `R ${Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Percentages ──
export function fmtPct(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// ── Numbers ──
export function fmtNum(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-ZA');
}

// ── Dates (DD/MM/YYYY for SA) ──
export function fmtDateSA(isoDate: string): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function toISODate(day: number, month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getDateRange(year: number, month: number | null, day: number | null): { from: string; to: string } {
  if (day && month) {
    const d = toISODate(day, month, year);
    return { from: d, to: d };
  }
  if (month) {
    const lastDay = new Date(year, month, 0).getDate();
    return { from: toISODate(1, month, year), to: toISODate(lastDay, month, year) };
  }
  return { from: toISODate(1, 1, year), to: toISODate(31, 12, year) };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ── Business Days ──
export function isSAHoliday(dateStr: string): boolean {
  const year = parseInt(dateStr.slice(0, 4));
  return (SA_HOLIDAYS[year] || []).includes(dateStr);
}

export function isBusinessDay(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !isSAHoliday(dateStr);
}

export function addBusinessDays(dateStr: string, days: number): string {
  let date = new Date(dateStr);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const iso = date.toISOString().split('T')[0];
    if (isBusinessDay(iso)) added++;
  }
  return date.toISOString().split('T')[0];
}

// ── Delta calculations ──
export function calcDelta(current: number, prior: number): number {
  if (prior === 0) return current > 0 ? 100 : 0;
  return ((current - prior) / prior) * 100;
}

// ── Generate unique batch ID ──
export function batchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── ISO now in SAST ──
export function nowSAST(): string {
  const now = new Date();
  // SAST = UTC+2
  const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return sast.toISOString().replace('Z', '+02:00');
}

export function nowISO(): string {
  return new Date().toISOString();
}
