// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Core UI Components
// KPICard, Badge, DataTable, ChartCard, StateBadge, StockBadge
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronUp, ChevronDown, FileText, CheckCircle, XCircle, Truck, DollarSign, Clock, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── KPI Card ──
interface KPIProps {
  title: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  icon: LucideIcon;
  color?: string;
}

export function KPICard({ title, value, delta = 0, deltaLabel = 'vs prior period', icon: Icon, color = '#00D4F5' }: KPIProps) {
  const isUp = delta > 0;
  const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const deltaBg = isUp ? 'bg-emerald-50 text-emerald-700' : delta < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden hover:shadow-md transition-shadow">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 font-mono mb-1.5">{value}</div>
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${deltaBg}`}>
          <DeltaIcon size={11} />
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </span>
        <span className="text-[10px] text-slate-400">{deltaLabel}</span>
      </div>
    </div>
  );
}

// ── Badge ──
interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  size?: 'sm' | 'md';
}

export function Badge({ children, color = '#00D4F5', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-bold ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}
      style={{ background: `${color}18`, color }}
    >
      {children}
    </span>
  );
}

// ── State Badge (Sales Order lifecycle) ──
export function StateBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; color: string; icon: LucideIcon }> = {
    draft: { label: 'Quotation', color: '#718096', icon: FileText },
    quotation: { label: 'Quotation', color: '#718096', icon: FileText },
    sent: { label: 'Sent', color: '#9F7AEA', icon: FileText },
    sale: { label: 'Confirmed', color: '#00D4F5', icon: CheckCircle },
    confirmed: { label: 'Confirmed', color: '#00D4F5', icon: CheckCircle },
    delivering: { label: 'Delivering', color: '#ED8936', icon: Truck },
    delivered: { label: 'Delivered', color: '#2DD4A8', icon: Truck },
    invoiced: { label: 'Invoiced', color: '#63B3ED', icon: DollarSign },
    paid: { label: 'Paid', color: '#48BB78', icon: DollarSign },
    done: { label: 'Complete', color: '#2DD4A8', icon: CheckCircle },
    cancel: { label: 'Cancelled', color: '#F56565', icon: XCircle },
    cancelled: { label: 'Cancelled', color: '#F56565', icon: XCircle },
  };
  const s = map[state] || { label: state, color: '#718096', icon: AlertCircle };
  const IconComp = s.icon;
  return <Badge color={s.color}><IconComp size={10} />{s.label}</Badge>;
}

// ── Stock Status Badge ──
export function StockBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    stockout: { label: 'Stockout', color: '#F56565' },
    low: { label: 'Low Stock', color: '#ED8936' },
    healthy: { label: 'Healthy', color: '#2DD4A8' },
    overstock: { label: 'Overstock', color: '#9F7AEA' },
  };
  const s = map[status] || { label: status, color: '#718096' };
  return <Badge color={s.color}>{s.label}</Badge>;
}

// ── Severity Badge ──
export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = { critical: '#F56565', warning: '#ED8936', info: '#00D4F5' };
  return <Badge color={map[severity] || '#718096'}>{severity}</Badge>;
}

// ── Delivery Badge ──
export function DeliveryBadge({ state }: { state: string }) {
  if (state === 'complete') return <Badge color="#2DD4A8"><Truck size={10} />Complete</Badge>;
  if (state === 'partial') return <Badge color="#ED8936"><Truck size={10} />Partial</Badge>;
  return <Badge color="#718096"><Clock size={10} />Pending</Badge>;
}

// ── Chart Card ──
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  height?: number;
  action?: React.ReactNode;
}

export function ChartCard({ title, children, height = 300, action }: ChartCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-800">{title}</span>
        {action}
      </div>
      <div className="p-4" style={{ height }}>{children}</div>
    </div>
  );
}

// ── Data Table ──
interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  enableExport?: boolean;
  tableName?: string;
}

export function DataTable({ columns, data, onRowClick, emptyMessage = 'No data found', enableExport = false, tableName = 'data' }: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      const cmp = typeof av === 'number' ? av - bv : String(av || '').localeCompare(String(bv || ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  // Export to CSV function
  const exportToCSV = () => {
    if (data.length === 0) return;
    
    // Create CSV header
    const headers = columns.map(col => `"${col.label}"`).join(',');
    
    // Create CSV rows
    const csvRows = data.map(row => {
      return columns.map(col => {
        const value = col.render ? 
          // For rendered content, extract text (this is a simplified approach)
          (typeof col.render(row[col.key], row) === 'string' ? 
            `"${col.render(row[col.key], row)}"` : 
            `"${row[col.key] ?? ''}"`) : 
          `"${row[col.key] ?? ''}"`;
        return value;
      }).join(',');
    });
    
    const csvContent = [headers, ...csvRows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {enableExport && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
            aria-label="Export data to CSV"
          >
            <svg className="mr-1.5 h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h3.5" />
            </svg>
            Export CSV
          </button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && handleSort(col.key)}
                className={`px-3.5 py-2.5 bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b-2 border-slate-200 whitespace-nowrap select-none ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-100' : ''} text-${col.align || 'left'}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortCol === col.key && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-cyan-50/40`}
            >
              {columns.map(col => (
                <td key={col.key} className={`px-3.5 py-2.5 text-slate-700 whitespace-nowrap text-${col.align || 'left'}`}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
