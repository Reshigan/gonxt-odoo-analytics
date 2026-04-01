// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — DateFilterBar
// Year / Month / Day selectors on every page
// Company picker for admin multi-company switching
// ═══════════════════════════════════════════════════════════════

'use client';
import React from 'react';
import { Calendar, Building2, GitCompare, RotateCcw, ChevronDown } from 'lucide-react';
import { MONTHS, getDaysInMonth } from '../lib/formatters';

export interface FilterState {
  company_id: number;
  year: number;
  month: number | null;  // null = all months
  day: number | null;     // null = all days in selected month
  compare_year: number | null;
}

interface Company {
  id: number;
  name: string;
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  companies: Company[];
  showCompare?: boolean;
}

const YEARS = [2024, 2025, 2026, 2027];

export default function DateFilterBar({ filters, onChange, companies, showCompare = true }: Props) {
  const daysInMonth = filters.month ? getDaysInMonth(filters.year, filters.month) : 0;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function update(patch: Partial<FilterState>) {
    const next = { ...filters, ...patch };
    // Reset day if month changed or cleared
    if ('month' in patch && patch.month !== filters.month) next.day = null;
    if ('month' in patch && patch.month === null) next.day = null;
    // Reset month+day if year changed
    if ('year' in patch && patch.year !== filters.year) { next.month = null; next.day = null; }
    onChange(next);
  }

  function reset() {
    onChange({ ...filters, year: new Date().getFullYear(), month: null, day: null, compare_year: null });
  }

  const activeLabel = [
    filters.year,
    filters.month ? MONTHS[filters.month - 1].label : null,
    filters.day ? String(filters.day) : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-3 flex-wrap bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
      {/* Company Picker */}
      {companies.length > 1 && (
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-cyan-500" />
          <select
            value={filters.company_id}
            onChange={e => update({ company_id: parseInt(e.target.value) })}
            className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 cursor-pointer"
          >
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-slate-200 mx-1" />
        </div>
      )}

      {/* Calendar icon */}
      <Calendar size={14} className="text-slate-400" />

      {/* Year */}
      <select
        value={filters.year}
        onChange={e => update({ year: parseInt(e.target.value) })}
        className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 cursor-pointer min-w-[72px]"
      >
        {YEARS.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {/* Month */}
      <select
        value={filters.month ?? ''}
        onChange={e => update({ month: e.target.value ? parseInt(e.target.value) : null })}
        className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 cursor-pointer min-w-[110px]"
      >
        <option value="">All Months</option>
        {MONTHS.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {/* Day — only visible when month is selected */}
      {filters.month && (
        <select
          value={filters.day ?? ''}
          onChange={e => update({ day: e.target.value ? parseInt(e.target.value) : null })}
          className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 cursor-pointer min-w-[80px]"
        >
          <option value="">All Days</option>
          {days.map(d => (
            <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
          ))}
        </select>
      )}

      {/* Compare Year */}
      {showCompare && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <GitCompare size={14} className="text-slate-400" />
          <select
            value={filters.compare_year ?? ''}
            onChange={e => update({ compare_year: e.target.value ? parseInt(e.target.value) : null })}
            className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-500 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 cursor-pointer min-w-[100px]"
          >
            <option value="">No Compare</option>
            {YEARS.filter(y => y !== filters.year).map(y => (
              <option key={y} value={y}>vs {y}</option>
            ))}
          </select>
        </>
      )}

      {/* Active filter label */}
      <div className="flex-1" />
      <span className="text-[10px] font-mono text-slate-400 tracking-wide">{activeLabel}</span>

      {/* Reset */}
      <button
        onClick={reset}
        className="h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1 cursor-pointer transition"
        title="Reset filters"
      >
        <RotateCcw size={12} /> Reset
      </button>
    </div>
  );
}
