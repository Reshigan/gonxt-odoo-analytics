// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Exceptions Page
// Active exceptions, severity breakdown, resolution workflow
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { KPICard, ChartCard, DataTable, SeverityBadge, Badge } from '../../components/CoreUI';
import DateFilterBar, { FilterState } from '../../components/DateFilterBar';

interface Props {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  companies: { id: number; name: string }[];
}

const MOCK_EXCEPTIONS = [
  { id: 1, exception_type: 'EX-SO-001', exception_name: 'Stale Quotation', entity_id: 'SO1023', entity_name: 'SO1023 - Coprex', severity: 'warning', detected_at: '22/03/2026', description: 'Quotation open for 12 days', is_active: 1, resolved_at: null },
  { id: 2, exception_type: 'EX-SO-002', exception_name: 'Missing Delivery', entity_id: 'SO1045', entity_name: 'SO1045 - BevCo SA', severity: 'critical', detected_at: '28/03/2026', description: 'Confirmed 3 days ago, no picking created', is_active: 1, resolved_at: null },
  { id: 3, exception_type: 'EX-SO-004', exception_name: 'Uninvoiced Delivery', entity_id: 'SO1051', entity_name: 'SO1051 - Komatsu SA', severity: 'critical', detected_at: '25/03/2026', description: 'Fully delivered, no invoice after 6 days', is_active: 1, resolved_at: null },
  { id: 4, exception_type: 'EX-SO-005', exception_name: 'Overdue Invoice', entity_id: 'INV-2026-0087', entity_name: 'INV-0087 - Plascon', severity: 'critical', detected_at: '15/03/2026', description: 'R145,000 outstanding, 35 days overdue', is_active: 1, resolved_at: null },
  { id: 5, exception_type: 'EX-ST-001', exception_name: 'Stockout Risk', entity_id: 'SP-540W', entity_name: 'Solar Panel 540W', severity: 'critical', detected_at: '29/03/2026', description: 'Only 3 units remaining, reorder point is 20', is_active: 1, resolved_at: null },
  { id: 6, exception_type: 'EX-ST-002', exception_name: 'Receipt Overdue', entity_id: 'WH/IN/00234', entity_name: 'PO receipt from Longi Solar', severity: 'warning', detected_at: '27/03/2026', description: 'Scheduled 2 days ago, not yet received', is_active: 1, resolved_at: null },
  { id: 7, exception_type: 'EX-ST-004', exception_name: 'Slow-Moving Stock', entity_id: 'CT-3M', entity_name: 'Cable Tray 3m', severity: 'info', detected_at: '20/03/2026', description: 'No outbound movement for 120 days', is_active: 1, resolved_at: null },
  { id: 8, exception_type: 'EX-ST-005', exception_name: 'Delivery SLA Breach', entity_id: 'WH/OUT/00189', entity_name: 'Delivery to Goldrush', severity: 'warning', detected_at: '27/03/2026', description: 'Delivery 2 days late vs SLA', is_active: 1, resolved_at: null },
  { id: 9, exception_type: 'EX-SO-003', exception_name: 'Partial Delivery Stuck', entity_id: 'SO1032', entity_name: 'SO1032 - LTM Energies', severity: 'warning', detected_at: '18/03/2026', description: 'Partial delivery done, no backorder', is_active: 0, resolved_at: '25/03/2026' },
  { id: 10, exception_type: 'EX-ST-003', exception_name: 'Large Variance', entity_id: 'ADJ-41', entity_name: 'Stock Adjustment #41', severity: 'critical', detected_at: '10/03/2026', description: 'Variance of R28,000 on inventory count', is_active: 0, resolved_at: '12/03/2026' },
];

export default function ExceptionsPage({ filters, onFiltersChange, companies }: Props) {
  const [viewFilter, setViewFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [sevFilter, setSevFilter] = useState('all');

  const exceptions = MOCK_EXCEPTIONS.filter(e => {
    if (viewFilter === 'active' && !e.is_active) return false;
    if (viewFilter === 'resolved' && e.is_active) return false;
    if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
    return true;
  });

  const active = MOCK_EXCEPTIONS.filter(e => e.is_active);
  const critical = active.filter(e => e.severity === 'critical').length;
  const warning = active.filter(e => e.severity === 'warning').length;
  const info = active.filter(e => e.severity === 'info').length;
  const resolved = MOCK_EXCEPTIONS.filter(e => !e.is_active).length;

  return (
    <div className="flex flex-col gap-5">
      <DateFilterBar filters={filters} onChange={onFiltersChange} companies={companies} showCompare={false} />

      <div className="grid grid-cols-4 gap-3">
        <KPICard title="Active Exceptions" value={String(active.length)} delta={-8} icon={AlertTriangle} color="#F56565" />
        <KPICard title="Critical" value={String(critical)} delta={-15} icon={AlertCircle} color="#F56565" />
        <KPICard title="Warnings" value={String(warning)} delta={-5} icon={AlertCircle} color="#ED8936" />
        <KPICard title="Resolved (30d)" value={String(resolved)} delta={22} icon={CheckCircle} color="#2DD4A8" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
          <span className="text-sm font-bold text-slate-800">Exception Queue</span>
          <div className="flex gap-2.5 items-center">
            <select value={viewFilter} onChange={e => setViewFilter(e.target.value as any)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 cursor-pointer">
              <option value="all">All</option>
              <option value="active">Active Only</option>
              <option value="resolved">Resolved</option>
            </select>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 cursor-pointer">
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'exception_type', label: 'Code', render: (v: string) => <span className="font-mono font-bold text-xs">{v}</span> },
            { key: 'exception_name', label: 'Exception' },
            { key: 'entity_id', label: 'Entity', render: (v: string) => <span className="font-mono text-cyan-600">{v}</span> },
            { key: 'description', label: 'Description' },
            { key: 'severity', label: 'Severity', render: (v: string) => <SeverityBadge severity={v} /> },
            { key: 'detected_at', label: 'Detected' },
            { key: 'is_active', label: 'Status', render: (v: number, r: any) => (
              v ? <Badge color="#F56565"><Clock size={10} />Open</Badge> :
              <Badge color="#2DD4A8"><CheckCircle size={10} />Resolved {r.resolved_at}</Badge>
            )},
          ]}
          data={exceptions}
          emptyMessage="No exceptions matching filters"
        />
      </div>
    </div>
  );
}
