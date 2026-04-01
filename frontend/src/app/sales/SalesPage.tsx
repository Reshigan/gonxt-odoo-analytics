// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Sales Analytics Page
// Full quote-to-invoice traceability, YoY, month/day selectors
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FileText, CheckCircle, Truck, Receipt, DollarSign, Search, Download, Eye, Filter } from 'lucide-react';
import { KPICard, ChartCard, DataTable, StateBadge, DeliveryBadge, Badge } from '../../components/CoreUI';
import DateFilterBar, { FilterState } from '../../components/DateFilterBar';
import OrderDetail from '../../components/OrderDetail';
import { fmtZAR, fmtZARFull, MONTH_SHORT } from '../../lib/formatters';

interface Props {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  companies: { id: number; name: string }[];
}

// Mock data — replace with salesApi calls
function getMockOrders(filters: FilterState) {
  const partners = ['Coprex (Pty) Ltd','BevCo SA','Komatsu SA','Plascon','Goldrush Group','LTM Energies','Big Box Investments','FutureFit Corp','Lokal Distribution','Uptransit'];
  const products = [
    { name: 'Solar Panel 540W', sku: 'SP-540W', price: 8500 },
    { name: 'Inverter 8kW', sku: 'INV-8K', price: 32000 },
    { name: 'Battery 10kWh', sku: 'BAT-10K', price: 45000 },
    { name: 'Medical Curtain Rail', sku: 'MCR-3M', price: 1200 },
    { name: 'Antimicrobial Fabric 50m', sku: 'AMF-50', price: 3800 },
    { name: 'Carbon Credit (1t)', sku: 'CC-1T', price: 250 },
  ];
  const states = ['draft','sale','done','done','done','sale','draft','done','sale','done'] as const;
  const stages = ['quotation','confirmed','delivered','paid','invoiced','confirmed','quotation','paid','delivering','delivered'];

  const orders = Array.from({ length: 50 }, (_, i) => {
    const state = states[i % states.length];
    const stage = stages[i % stages.length];
    const month = filters.month || (1 + (i % 12));
    const day = filters.day || (1 + (i % 28));
    const partner = partners[i % partners.length];
    const lineCount = 1 + (i % 3);
    const lines = Array.from({ length: lineCount }, (_, j) => {
      const p = products[(i + j) % products.length];
      const qty = 2 + (i + j) % 15;
      const delivered = stage === 'paid' || stage === 'invoiced' || stage === 'delivered' ? qty : stage === 'delivering' ? Math.floor(qty * 0.6) : 0;
      const invoiced = stage === 'paid' || stage === 'invoiced' ? qty : 0;
      return { ...p, product_name: p.name, product_sku: p.sku, qty_ordered: qty, qty_delivered: delivered, qty_invoiced: invoiced, unit_price: p.price, discount_pct: 0, line_total: qty * p.price, line_cost: qty * p.price * 0.6, gross_margin: qty * p.price * 0.4 };
    });
    const total = lines.reduce((s, l) => s + l.line_total, 0);

    return {
      order_odoo_id: 1000 + i,
      order_name: `SO${String(1000 + i).padStart(4, '0')}`,
      partner_name: partner,
      partner_id: i + 1,
      date_key: `${filters.year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      order_state: state,
      amount_total: total,
      user_name: ['Reshigan G','Sarah M','Thabo N','Priya K'][i % 4],
      team_name: ['Direct Sales','Channel','Enterprise'][i % 3],
      company_id: filters.company_id,
      has_delivery: stage !== 'quotation' && stage !== 'confirmed' ? 1 : 0,
      delivery_state: stage === 'paid' || stage === 'invoiced' || stage === 'delivered' ? 'complete' : stage === 'delivering' ? 'partial' : 'none',
      has_invoice: stage === 'paid' || stage === 'invoiced' ? 1 : 0,
      invoice_state: stage === 'paid' || stage === 'invoiced' ? 'complete' : 'none',
      is_paid: stage === 'paid' ? 1 : 0,
      payment_state: stage === 'paid' ? 'paid' : 'not_paid',
      lifecycle_stage: stage,
      days_open: state === 'draft' ? 5 + i % 20 : 0,
      lines,
    };
  });

  return orders;
}

export default function SalesPage({ filters, onFiltersChange, companies }: Props) {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const allOrders = getMockOrders(filters);
  const orders = allOrders.filter(o => {
    if (stateFilter !== 'all' && o.order_state !== stateFilter) return false;
    if (search && !o.order_name.toLowerCase().includes(search.toLowerCase()) && !o.partner_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // KPI counts
  const quoted = allOrders.filter(o => o.lifecycle_stage === 'quotation').length;
  const confirmed = allOrders.filter(o => ['confirmed','delivering'].includes(o.lifecycle_stage)).length;
  const delivered = allOrders.filter(o => o.lifecycle_stage === 'delivered').length;
  const invoiced = allOrders.filter(o => o.lifecycle_stage === 'invoiced').length;
  const paid = allOrders.filter(o => o.lifecycle_stage === 'paid').length;

  // YoY chart data
  const chartData = MONTH_SHORT.map((m, i) => {
    const monthOrders = allOrders.filter(o => parseInt(o.date_key.split('-')[1]) === i + 1);
    const rev = monthOrders.reduce((s, o) => s + o.amount_total, 0);
    const base = rev * (filters.year === 2026 ? 0.85 : 1.1);
    return {
      month: m,
      [filters.year]: rev,
      ...(filters.compare_year ? { [filters.compare_year]: Math.round(base) } : {}),
    };
  });

  return (
    <div className="flex flex-col gap-5">
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          lines={selectedOrder.lines}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <DateFilterBar filters={filters} onChange={onFiltersChange} companies={companies} />

      {/* KPI Row — lifecycle stages */}
      <div className="grid grid-cols-5 gap-3">
        <KPICard title="Quoted" value={String(quoted)} delta={5.2} icon={FileText} color="#718096" />
        <KPICard title="Confirmed" value={String(confirmed)} delta={12.1} icon={CheckCircle} color="#00D4F5" />
        <KPICard title="Delivered" value={String(delivered)} delta={8.7} icon={Truck} color="#2DD4A8" />
        <KPICard title="Invoiced" value={String(invoiced)} delta={-3.2} icon={Receipt} color="#63B3ED" />
        <KPICard title="Paid" value={String(paid)} delta={15.0} icon={DollarSign} color="#48BB78" />
      </div>

      {/* YoY Chart */}
      <ChartCard title={`Monthly Revenue${filters.compare_year ? `: ${filters.year} vs ${filters.compare_year}` : ''}`} height={260}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#718096' }} />
            <YAxis tick={{ fontSize: 11, fill: '#718096' }} tickFormatter={(v: number) => `R${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtZAR(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {filters.compare_year && <Bar dataKey={String(filters.compare_year)} fill="#CBD5E0" radius={[4, 4, 0, 0]} />}
            <Bar dataKey={String(filters.year)} fill="#00D4F5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
          <span className="text-sm font-bold text-slate-800">Sales Orders — Full Traceability</span>
          <div className="flex gap-2.5 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search SO# or customer..."
                className="h-8 rounded-lg border border-slate-200 pl-8 pr-3 text-xs text-slate-700 w-52 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              />
            </div>
            <select
              value={stateFilter} onChange={e => setStateFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="all">All States</option>
              <option value="draft">Quotation</option>
              <option value="sale">Confirmed</option>
              <option value="done">Complete</option>
              <option value="cancel">Cancelled</option>
            </select>
            <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer">
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'order_name', label: 'Order #', render: (v: string) => <span className="font-bold font-mono text-cyan-600">{v}</span> },
            { key: 'partner_name', label: 'Customer' },
            { key: 'date_key', label: 'Date', render: (v: string) => { const [y,m,d] = v.split('-'); return `${d}/${m}/${y}`; } },
            { key: 'amount_total', label: 'Total', align: 'right', render: (v: number) => <span className="font-bold font-mono">{fmtZAR(v)}</span> },
            { key: 'lifecycle_stage', label: 'Stage', render: (v: string) => <StateBadge state={v} /> },
            { key: 'delivery_state', label: 'Delivery', render: (v: string) => <DeliveryBadge state={v} /> },
            { key: 'invoice_state', label: 'Invoice', render: (v: string) => (
              v === 'complete' ? <Badge color="#63B3ED"><Receipt size={10} />Created</Badge> :
              v === 'partial' ? <Badge color="#ED8936"><Receipt size={10} />Partial</Badge> :
              <Badge color="#718096">None</Badge>
            )},
            { key: 'is_paid', label: 'Payment', render: (v: number) => (
              v ? <Badge color="#48BB78"><DollarSign size={10} />Paid</Badge> :
              <Badge color="#ED8936">Outstanding</Badge>
            )},
            { key: 'order_odoo_id', label: '', sortable: false, render: () => <Eye size={13} className="text-cyan-500 cursor-pointer" /> },
          ]}
          data={orders}
          onRowClick={setSelectedOrder}
        />
      </div>
    </div>
  );
}
