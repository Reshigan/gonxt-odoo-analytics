// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Operations Dashboard Page
// Operational visibility for day-to-day management
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Clock, CheckCircle, AlertCircle, Package, Truck, FileText, Calendar, 
  AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { KPICard, ChartCard, DataTable, SeverityBadge } from '../../components/CoreUI';
import DateFilterBar, { FilterState } from '../../components/DateFilterBar';
import { fmtZAR, fmtNum } from '../../lib/formatters';
import { executiveApi } from '../../lib/api-client';

// Colors for charts
const COLORS = ['#00D4F5', '#2DD4A8', '#ED8936', '#9F7AEA', '#F56565', '#63B3ED'];

export default function OperationsDashboard() {
  // Define companies data within the page
  const companies = [
    { id: 1, name: 'GONXT Technology' },
    { id: 2, name: 'TerraVolt Energy' },
    { id: 3, name: 'Fybatex Medical' },
    { id: 4, name: 'Envera Capital' },
  ];

  const [dailyData, setDailyData] = useState<any>(null);
  const [exceptionData, setExceptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch operations data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch daily summary
        const dailyResponse = await executiveApi.operationalDaily();
        setDailyData(dailyResponse.data);
        
        // Fetch exceptions
        const exceptionResponse = await executiveApi.operationalExceptions();
        setExceptionData(exceptionResponse.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load operations dashboard data');
        console.error('Operations dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
          <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
        </div>
        <p className="mt-2 text-red-700">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const todayStats = dailyData?.today_summary || {};
  const pendingItems = dailyData?.pending_items || {};

  // Prepare exception table data
  const exceptionColumns = [
    { key: 'exception_type', label: 'Code', render: (val: string) => <span className="font-mono text-xs">{val}</span> },
    { key: 'entity_name', label: 'Entity' },
    { key: 'severity', label: 'Severity', render: (val: string) => <SeverityBadge severity={val} /> },
    { key: 'description', label: 'Description', render: (val: string) => <span className="text-xs">{val}</span> },
    { key: 'detected_at', label: 'Detected', render: (val: string) => new Date(val).toLocaleDateString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Daily Operational Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Confirmed Today"
          value={fmtNum(todayStats.confirmed_today || 0)}
          icon={CheckCircle}
          color="#00D4F5"
        />
        <KPICard
          title="Delivered Today"
          value={fmtNum(todayStats.delivered_today || 0)}
          icon={Truck}
          color="#2DD4A8"
        />
        <KPICard
          title="Paid Today"
          value={fmtNum(todayStats.paid_today || 0)}
          icon={FileText}
          color="#ED8936"
        />
        <KPICard
          title="Pipeline Items"
          value={fmtNum(todayStats.pipeline_items || 0)}
          icon={Clock}
          color="#9F7AEA"
        />
      </div>

      {/* Pending Items Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Late Deliveries</h3>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600">{pendingItems.late_deliveries || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Orders past delivery date</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Unpaid Invoices</h3>
            <FileText className="h-5 w-5 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-600">{pendingItems.unpaid_invoices || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Invoices overdue 30+ days</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700">Overdue Quotes</h3>
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{pendingItems.overdue_quotes || 0}</div>
          <p className="text-xs text-slate-500 mt-1">Quotes older than 30 days</p>
        </div>
      </div>

      {/* Active Exceptions */}
      <ChartCard title="Active Business Exceptions" height={400}>
        <DataTable 
          columns={exceptionColumns}
          data={exceptionData?.exceptions || []}
          emptyMessage="No active exceptions"
        />
      </ChartCard>

      {/* Operations Intelligence */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-800">Operations Intelligence</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-cyan-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-cyan-600 mr-2" />
                <span className="font-medium text-cyan-800">Daily Performance</span>
              </div>
              <p className="mt-2 text-sm text-cyan-700">
                Today's confirmations, deliveries, and payments indicate normal operational flow. 
                Monitor pending items for potential bottlenecks.
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="font-medium text-red-800">Risk Assessment</span>
              </div>
              <p className="mt-2 text-sm text-red-700">
                {pendingItems.late_deliveries || 0} late deliveries and {pendingItems.unpaid_invoices || 0} 
                unpaid invoices require immediate attention to maintain customer satisfaction.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}