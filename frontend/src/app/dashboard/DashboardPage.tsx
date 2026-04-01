// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Executive Dashboard Page
// ═══════════════════════════════════════════════════════════════

'use client';
import React from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart
} from 'recharts';
import { TrendingUp, ShoppingCart, BarChart3, AlertTriangle, ArrowRight } from 'lucide-react';
import { KPICard, ChartCard, SeverityBadge } from '../../components/CoreUI';
import DateFilterBar, { FilterState } from '../../components/DateFilterBar';
import { fmtZAR, fmtPct, MONTH_SHORT } from '../../lib/formatters';

const COLORS = ['#00D4F5', '#2DD4A8', '#ED8936', '#9F7AEA', '#F56565', '#63B3ED'];

interface Props {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  companies: { id: number; name: string }[];
  // In production these come from API; using mock data shape here
  salesData?: any;
  exceptionsData?: any;
}

// Mock data generator (replace with API calls)
function getMockData(filters: FilterState) {
  const baseRev = [180000, 320000, 95000, 210000][filters.company_id - 1] || 150000;
  const growth = filters.year === 2026 ? 1.18 : filters.year === 2025 ? 1.08 : 1.0;

  const months = MONTH_SHORT.map((m, i) => {
    const seasonal = 1 + 0.15 * Math.sin((i - 2) * Math.PI / 6);
    const rev = Math.round(baseRev * growth * seasonal * (0.9 + Math.random() * 0.2));
    const prevGrowth = (filters.compare_year || 2025) === 2025 ? 1.08 : 1.0;
    const prevRev = Math.round(baseRev * prevGrowth * seasonal * (0.9 + Math.random() * 0.2));
    return { month: m, [filters.year]: rev, ...(filters.compare_year ? { [filters.compare_year]: prevRev } : {}), target: Math.round(baseRev * growth * 1.05) };
  });

  // Filter to selected month if applicable
  const filteredMonths = filters.month ? [months[filters.month - 1]] : months;
  const totalRev = filteredMonths.reduce((s, m) => s + (m[filters.year] || 0), 0);
  const totalPrev = filters.compare_year ? filteredMonths.reduce((s, m) => s + (m[filters.compare_year!] || 0), 0) : totalRev * 0.9;

  return {
    trendData: months,
    totalRevenue: totalRev,
    totalPrevRevenue: totalPrev,
    orders: Math.round(totalRev / 25000),
    margin: 38 + Math.random() * 8,
    openExceptions: 6 + Math.floor(Math.random() * 4),
    pipeline: [
      { stage: 'Quotation', count: 18, color: '#718096' },
      { stage: 'Confirmed', count: 24, color: '#00D4F5' },
      { stage: 'Delivered', count: 15, color: '#2DD4A8' },
      { stage: 'Invoiced', count: 12, color: '#63B3ED' },
      { stage: 'Paid', count: 9, color: '#48BB78' },
    ],
    categories: [
      { name: 'Solar', value: totalRev * 0.45 },
      { name: 'Services', value: totalRev * 0.25 },
      { name: 'Medical', value: totalRev * 0.18 },
      { name: 'Carbon', value: totalRev * 0.12 },
    ],
    exceptions: [
      { code: 'EX-SO-002', name: 'Missing Delivery', entity: 'SO1045', severity: 'critical' as const, detected: '28/03/2026' },
      { code: 'EX-SO-005', name: 'Overdue Invoice', entity: 'INV-0087', severity: 'critical' as const, detected: '25/03/2026' },
      { code: 'EX-ST-001', name: 'Stockout Risk', entity: 'SP-540W', severity: 'critical' as const, detected: '29/03/2026' },
      { code: 'EX-SO-001', name: 'Stale Quotation', entity: 'SO1023', severity: 'warning' as const, detected: '22/03/2026' },
      { code: 'EX-ST-005', name: 'Delivery SLA Breach', entity: 'WH/OUT/189', severity: 'warning' as const, detected: '27/03/2026' },
    ],
  };
}

export default function DashboardPage({ filters, onFiltersChange, companies }: Props) {
  const data = getMockData(filters);
  const revDelta = data.totalPrevRevenue > 0 ? ((data.totalRevenue - data.totalPrevRevenue) / data.totalPrevRevenue * 100) : 0;
  const totalPipeline = data.pipeline.reduce((s: number, p: any) => s + p.count, 0);

  return (
    <div className="flex flex-col gap-5">
      <DateFilterBar filters={filters} onChange={onFiltersChange} companies={companies} />

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard title="Revenue" value={fmtZAR(data.totalRevenue)} delta={revDelta} deltaLabel={filters.compare_year ? `vs ${filters.compare_year}` : 'vs prior'} icon={TrendingUp} color="#00D4F5" />
        <KPICard title="Orders" value={String(data.orders)} delta={8.3} deltaLabel="vs prior period" icon={ShoppingCart} color="#2DD4A8" />
        <KPICard title="Gross Margin" value={`${data.margin.toFixed(1)}%`} delta={2.1} icon={BarChart3} color="#9F7AEA" />
        <KPICard title="Open Exceptions" value={String(data.openExceptions)} delta={-15.4} icon={AlertTriangle} color="#F56565" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title={`Revenue Trend${filters.compare_year ? `: ${filters.year} vs ${filters.compare_year}` : ''}`} height={280}>
          <ResponsiveContainer>
            <ComposedChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#718096' }} />
              <YAxis tick={{ fontSize: 11, fill: '#718096' }} tickFormatter={(v: number) => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number, n: string) => [fmtZAR(v), n]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {filters.compare_year && (
                <Area dataKey={String(filters.compare_year)} fill="#A0AEC020" stroke="#A0AEC0" strokeDasharray="5 5" />
              )}
              <Line dataKey={String(filters.year)} stroke="#00D4F5" strokeWidth={2.5} dot={false} />
              <Line dataKey="target" stroke="#ED8936" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quote-to-Cash Pipeline" height={280}>
          <div className="flex items-center h-full px-2 gap-2">
            {data.pipeline.map((step: any, i: number) => {
              const pct = totalPipeline > 0 ? (step.count / totalPipeline * 100) : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center relative">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-2">{step.stage}</div>
                  <div
                    className="rounded-lg flex items-center justify-center transition-all"
                    style={{
                      width: `${Math.max(50, pct)}%`, minWidth: 48, height: 44,
                      background: `${step.color}22`, border: `2px solid ${step.color}`,
                    }}
                  >
                    <span className="text-lg font-extrabold font-mono" style={{ color: step.color }}>{step.count}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{pct.toFixed(0)}%</div>
                  {i < data.pipeline.length - 1 && (
                    <ArrowRight size={14} className="text-slate-300 absolute -right-2 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Revenue by Category" height={250}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data.categories} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#CBD5E0' }} style={{ fontSize: 11 }}
              >
                {data.categories.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtZAR(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Active Exceptions" height={250}>
          <div className="flex flex-col gap-2 overflow-auto h-full pr-1">
            {data.exceptions.map((ex: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                  background: ex.severity === 'critical' ? '#FED7D720' : '#FEFCBF20',
                }}>
                  <AlertTriangle size={14} style={{ color: ex.severity === 'critical' ? '#F56565' : '#ED8936' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">{ex.code}: {ex.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{ex.entity} · {ex.detected}</div>
                </div>
                <SeverityBadge severity={ex.severity} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
