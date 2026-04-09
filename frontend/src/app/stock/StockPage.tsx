// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Stock & Inventory Page
// Full stock visibility, ageing, warehouse breakdown
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Package, DollarSign, TrendingUp, AlertTriangle, AlertCircle, Search, Download } from 'lucide-react';
import { KPICard, ChartCard, DataTable, StockBadge, Badge } from '../../components/CoreUI';
import DateFilterBar, { FilterState } from '../../components/DateFilterBar';
import { fmtZAR, fmtNum } from '../../lib/formatters';

const COLORS = ['#00D4F5', '#2DD4A8', '#ED8936', '#9F7AEA', '#F56565'];

interface Props {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  companies: { id: number; name: string }[];
}

function getMockStock(filters: FilterState) {
  const items = [
    { sku: 'SP-540W', name: 'Solar Panel 540W', category: 'Solar', cost: 4200, price: 8500 },
    { sku: 'INV-8K', name: 'Inverter 8kW', category: 'Solar', cost: 18000, price: 32000 },
    { sku: 'BAT-10K', name: 'Battery 10kWh', category: 'Solar', cost: 28000, price: 45000 },
    { sku: 'MCR-3M', name: 'Medical Curtain Rail 3m', category: 'Medical', cost: 650, price: 1200 },
    { sku: 'AMF-50', name: 'Antimicrobial Fabric 50m', category: 'Medical', cost: 2100, price: 3800 },
    { sku: 'CC-1T', name: 'Carbon Credit (1t CO2e)', category: 'Carbon', cost: 120, price: 250 },
    { sku: 'SRU-42', name: 'Server Rack Unit', category: 'IT', cost: 8500, price: 15000 },
    { sku: 'NS-48P', name: 'Network Switch 48p', category: 'IT', cost: 6200, price: 12000 },
    { sku: 'UPS-3K', name: 'UPS 3kVA', category: 'IT', cost: 4800, price: 8500 },
    { sku: 'CT-3M', name: 'Cable Tray 3m', category: 'Infrastructure', cost: 350, price: 680 },
  ];
  const warehouses = ['Lanseria Main', 'JHB Distribution', 'Cape Town'];

  return items.map((item, i) => {
    const onHand = [45, 12, 8, 120, 65, 500, 3, 18, 22, 200][i];
    const reserved = Math.floor(onHand * [0.2, 0.5, 0.75, 0.1, 0.15, 0.05, 0.67, 0.3, 0.1, 0.02][i]);
    const reorderPoint = [20, 5, 5, 30, 15, 100, 5, 10, 10, 50][i];
    const incoming = [30, 0, 10, 50, 0, 200, 5, 0, 15, 0][i];
    const lastMove = [5, 35, 12, 3, 22, 1, 95, 8, 45, 120][i];

    return {
      ...item, id: i + 1,
      warehouse_name: warehouses[i % warehouses.length],
      qty_on_hand: onHand,
      qty_reserved: reserved,
      qty_available: onHand - reserved,
      reorder_point: reorderPoint,
      qty_incoming: incoming,
      valuation_cost: onHand * item.cost,
      valuation_list: onHand * item.price,
      last_move_days: lastMove,
      status: onHand === 0 ? 'stockout' : onHand <= reorderPoint ? 'low' : onHand > reorderPoint * 4 ? 'overstock' : 'healthy',
      category_name: item.category,
      product_name: item.name,
      product_sku: item.sku,
    };
  });
}

export default function StockPage({ filters, onFiltersChange, companies }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [whFilter, setWhFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');

  const allStock = getMockStock(filters);
  const stock = allStock.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (whFilter !== 'all' && s.warehouse_name !== whFilter) return false;
    if (catFilter !== 'all' && s.category !== catFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.sku.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalOnHand = stock.reduce((s, p) => s + p.qty_on_hand, 0);
  const totalValCost = stock.reduce((s, p) => s + p.valuation_cost, 0);
  const totalValList = stock.reduce((s, p) => s + p.valuation_list, 0);
  const stockouts = stock.filter(s => s.status === 'stockout').length;
  const lowStock = stock.filter(s => s.status === 'low').length;

  // Category chart
  const catMap: Record<string, number> = {};
  stock.forEach(s => { catMap[s.category] = (catMap[s.category] || 0) + s.qty_on_hand; });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  // Warehouse pie
  const whMap: Record<string, number> = {};
  allStock.forEach(s => { whMap[s.warehouse_name] = (whMap[s.warehouse_name] || 0) + s.valuation_cost; });
  const whData = Object.entries(whMap).map(([name, value]) => ({ name, value }));

  // Ageing
  const ageingData = [
    { range: '0-30 days', value: stock.filter(s => s.last_move_days <= 30).reduce((a, s) => a + s.valuation_cost, 0), color: '#2DD4A8' },
    { range: '31-60 days', value: stock.filter(s => s.last_move_days > 30 && s.last_move_days <= 60).reduce((a, s) => a + s.valuation_cost, 0), color: '#00D4F5' },
    { range: '61-90 days', value: stock.filter(s => s.last_move_days > 60 && s.last_move_days <= 90).reduce((a, s) => a + s.valuation_cost, 0), color: '#ED8936' },
    { range: '90+ days', value: stock.filter(s => s.last_move_days > 90).reduce((a, s) => a + s.valuation_cost, 0), color: '#F56565' },
  ];

  const warehouses = [...new Set(allStock.map(s => s.warehouse_name))];
  const categories = [...new Set(allStock.map(s => s.category))];

  return (
    <div className="flex flex-col gap-5">
      <DateFilterBar filters={filters} onChange={onFiltersChange} companies={companies} showCompare={false} />

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        <KPICard title="Total On Hand" value={fmtNum(totalOnHand)} delta={3.2} icon={Package} color="#00D4F5" />
        <KPICard title="Valuation (Cost)" value={fmtZAR(totalValCost)} delta={5.8} icon={DollarSign} color="#2DD4A8" />
        <KPICard title="Valuation (List)" value={fmtZAR(totalValList)} delta={7.1} icon={TrendingUp} color="#9F7AEA" />
        <KPICard title="Stockouts" value={String(stockouts)} delta={stockouts > 0 ? 10 : -100} icon={AlertTriangle} color="#F56565" />
        <KPICard title="Low Stock" value={String(lowStock)} delta={lowStock > 2 ? 15 : -20} icon={AlertCircle} color="#ED8936" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard title="Stock by Category" height={230}>
          <ResponsiveContainer>
            <BarChart data={catData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#718096' }} />
              <YAxis tick={{ fontSize: 11, fill: '#718096' }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="#00D4F5" name="Qty On Hand" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Warehouse Distribution (by Value)" height={230}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={whData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value"
                label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`} style={{ fontSize: 10 }}>
                {whData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtZAR(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stock Ageing (by Value)" height={230}>
          <ResponsiveContainer>
            <BarChart data={ageingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#718096' }} />
              <YAxis tick={{ fontSize: 11, fill: '#718096' }} tickFormatter={(v: number) => `R${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtZAR(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                {ageingData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center flex-wrap gap-3">
          <span className="text-sm font-bold text-slate-800">Full Stock Visibility</span>
          <div className="flex gap-2.5 items-center">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or SKU..."
                className="h-8 rounded-lg border border-slate-200 pl-8 pr-3 text-xs text-slate-700 w-48 focus:outline-none focus:ring-2 focus:ring-cyan-400/40" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 cursor-pointer">
              <option value="all">All Status</option>
              <option value="stockout">Stockout</option>
              <option value="low">Low Stock</option>
              <option value="healthy">Healthy</option>
              <option value="overstock">Overstock</option>
            </select>
            <select value={whFilter} onChange={e => setWhFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 cursor-pointer">
              <option value="all">All Warehouses</option>
              {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 cursor-pointer">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer">
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'product_sku', label: 'SKU', render: (v: string) => <span className="font-bold font-mono text-cyan-600">{v}</span> },
            { key: 'product_name', label: 'Product' },
            { key: 'category_name', label: 'Category', render: (v: string) => <Badge color="#9F7AEA">{v}</Badge> },
            { key: 'warehouse_name', label: 'Warehouse' },
            { key: 'qty_on_hand', label: 'On Hand', align: 'right', render: (v: number) => <span className="font-mono font-bold">{v}</span> },
            { key: 'qty_reserved', label: 'Reserved', align: 'right', render: (v: number) => <span className="font-mono text-amber-600">{v}</span> },
            { key: 'qty_available', label: 'Available', align: 'right', render: (v: number) => <span className={`font-mono font-bold ${v > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{v}</span> },
            { key: 'reorder_point', label: 'Reorder Pt', align: 'right' },
            { key: 'qty_incoming', label: 'Incoming', align: 'right', render: (v: number) => v > 0 ? <span className="text-cyan-600">{v}</span> : <span className="text-slate-300">—</span> },
            { key: 'valuation_cost', label: 'Value', align: 'right', render: (v: number) => <span className="font-mono">{fmtZAR(v)}</span> },
            { key: 'last_move_days', label: 'Last Move', align: 'right', render: (v: number) => <span className={v > 90 ? 'text-red-500 font-bold' : v > 30 ? 'text-amber-600' : 'text-slate-600'}>{v}d</span> },
            { key: 'status', label: 'Status', render: (v: string) => <StockBadge status={v} /> },
          ]}
          data={stock}
          enableExport={true}
          tableName="inventory"
        />
      </div>
    </div>
  );
}
