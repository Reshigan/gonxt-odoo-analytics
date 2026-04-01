// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Order Detail Modal
// Full quote-to-invoice traceability with visual timeline
// ═══════════════════════════════════════════════════════════════

'use client';
import React from 'react';
import { X, FileText, CheckCircle, Truck, Receipt, DollarSign, ArrowRight } from 'lucide-react';
import { fmtZARFull } from '../lib/formatters';
import { StateBadge, Badge, DataTable } from './CoreUI';

interface Order {
  order_odoo_id: number;
  order_name: string;
  partner_name: string;
  date_order?: string;
  date_key?: string;
  order_state: string;
  amount_total: number;
  has_delivery: number;
  delivery_state: string;
  has_invoice: number;
  invoice_state: string;
  is_paid: number;
  lifecycle_stage: string;
  user_name?: string;
  team_name?: string;
}

interface Line {
  product_name: string;
  product_sku: string;
  qty_ordered: number;
  qty_delivered: number;
  qty_invoiced: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
}

interface Props {
  order: Order;
  lines: Line[];
  onClose: () => void;
}

const TIMELINE_STEPS = [
  { key: 'quotation', label: 'Quotation', icon: FileText },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'delivered', label: 'Delivered', icon: Truck },
  { key: 'invoiced', label: 'Invoiced', icon: Receipt },
  { key: 'paid', label: 'Paid', icon: DollarSign },
];

const STAGE_ORDER = ['quotation', 'confirmed', 'delivering', 'delivered', 'invoiced', 'paid'];

export default function OrderDetail({ order, lines, onClose }: Props) {
  const currentIdx = STAGE_ORDER.indexOf(order.lifecycle_stage);

  const totalOrdered = lines.reduce((s, l) => s + l.qty_ordered, 0);
  const totalDelivered = lines.reduce((s, l) => s + l.qty_delivered, 0);
  const totalInvoiced = lines.reduce((s, l) => s + l.qty_invoiced, 0);
  const deliveryPct = totalOrdered > 0 ? (totalDelivered / totalOrdered * 100) : 0;
  const invoicePct = totalOrdered > 0 ? (totalInvoiced / totalOrdered * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 font-mono">{order.order_name}</h2>
            <p className="text-sm text-slate-500">{order.partner_name} · {order.date_key || order.date_order}</p>
            {order.user_name && <p className="text-xs text-slate-400 mt-0.5">Rep: {order.user_name} · Team: {order.team_name || '—'}</p>}
          </div>
          <div className="flex items-center gap-3">
            <StateBadge state={order.lifecycle_stage} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-6 py-5">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Quote to Invoice Traceability</h3>
          <div className="flex items-start justify-between relative">
            {/* Connector line */}
            <div className="absolute top-5 left-8 right-8 h-[3px] bg-slate-200 z-0" />
            <div
              className="absolute top-5 left-8 h-[3px] bg-emerald-400 z-0 transition-all duration-500"
              style={{ width: `${Math.max(0, (currentIdx / (TIMELINE_STEPS.length - 1)) * 100 - 5)}%` }}
            />

            {TIMELINE_STEPS.map((step, i) => {
              const stepIdx = STAGE_ORDER.indexOf(step.key);
              const done = currentIdx >= stepIdx;
              const isCurrent = order.lifecycle_stage === step.key;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex flex-col items-center z-10 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 ${
                    done
                      ? 'bg-emerald-400 border-emerald-400'
                      : isCurrent
                      ? 'bg-amber-400 border-amber-400'
                      : 'bg-white border-slate-200'
                  }`}>
                    <Icon size={16} className={done || isCurrent ? 'text-white' : 'text-slate-300'} />
                  </div>
                  <span className={`text-[10px] font-bold mt-2 ${done ? 'text-slate-700' : 'text-slate-400'}`}>{step.label}</span>
                  {isCurrent && !done && (
                    <span className="text-[8px] font-bold text-amber-500 uppercase mt-0.5">Current</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Order Total</div>
            <div className="text-xl font-extrabold text-slate-900 font-mono">{fmtZARFull(order.amount_total)}</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Delivered</div>
            <div className={`text-xl font-extrabold font-mono ${deliveryPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {deliveryPct.toFixed(0)}%
            </div>
            <div className="text-[10px] text-slate-400">{totalDelivered} / {totalOrdered} units</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Invoiced</div>
            <div className={`text-xl font-extrabold font-mono ${invoicePct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {invoicePct.toFixed(0)}%
            </div>
            <div className="text-[10px] text-slate-400">{totalInvoiced} / {totalOrdered} units</div>
          </div>
        </div>

        {/* Order Lines */}
        <div className="px-6 pb-6">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Order Lines</h3>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <DataTable
              columns={[
                { key: 'product_name', label: 'Product' },
                { key: 'product_sku', label: 'SKU', render: v => <span className="font-mono text-cyan-600 text-xs">{v || '—'}</span> },
                { key: 'qty_ordered', label: 'Ordered', align: 'right', render: v => <span className="font-mono font-bold">{v}</span> },
                { key: 'qty_delivered', label: 'Delivered', align: 'right', render: (v, r) => (
                  <span className={`font-mono font-bold ${v >= r.qty_ordered ? 'text-emerald-600' : v > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {v} / {r.qty_ordered}
                  </span>
                )},
                { key: 'qty_invoiced', label: 'Invoiced', align: 'right', render: (v, r) => (
                  <span className={`font-mono font-bold ${v >= r.qty_ordered ? 'text-emerald-600' : v > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {v} / {r.qty_ordered}
                  </span>
                )},
                { key: 'unit_price', label: 'Unit Price', align: 'right', render: v => fmtZARFull(v) },
                { key: 'line_total', label: 'Total', align: 'right', render: v => <span className="font-bold font-mono">{fmtZARFull(v)}</span> },
              ]}
              data={lines}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
