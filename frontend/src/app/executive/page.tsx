// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Executive Dashboard Page
// Enhanced RBAC and visibility features for C-suite users
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { TrendingUp, ShoppingCart, BarChart3, AlertTriangle, Users, Building, 
  Target, DollarSign, Percent, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { KPICard, ChartCard, SeverityBadge } from '../../components/CoreUI';
import DateFilterBar, { FilterState } from '../../components/DateFilterBar';
import { fmtZAR, fmtPct, fmtNum, MONTH_SHORT } from '../../lib/formatters';
import { executiveApi } from '../../lib/api-client';

// Mock data for demonstration
const COLORS = ['#00D4F5', '#2DD4A8', '#ED8936', '#9F7AEA', '#F56565', '#63B3ED'];
const COMPANY_COLORS = ['#00D4F5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const TEAM_COLORS = ['#00D4F5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ExecutiveDashboard() {
  // Define companies data within the page
  // Updated to include a comment about standalone deployment
  const companies = [
    { id: 1, name: 'GONXT Technology' },
    { id: 2, name: 'TerraVolt Energy' },
    { id: 3, name: 'Fybatex Medical' },
    { id: 4, name: 'Envera Capital' },
  ];

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch executive dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await executiveApi.dashboard();
        setDashboardData(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load executive dashboard data');
        console.error('Executive dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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

  if (!dashboardData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-medium text-yellow-800">No Data Available</h3>
        </div>
        <p className="mt-2 text-yellow-700">Dashboard data is not available at this time.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          title="YTD Revenue"
          value={fmtZAR(dashboardData.kpis.ytd_revenue)}
          delta={dashboardData.kpis.revenue_growth}
          deltaLabel={`vs LY`}
          icon={DollarSign}
          color="#00D4F5"
        />
        <KPICard
          title="Orders"
          value={fmtNum(dashboardData.kpis.ytd_orders)}
          icon={ShoppingCart}
          color="#2DD4A8"
        />
        <KPICard
          title="Avg Order Value"
          value={fmtZAR(dashboardData.kpis.avg_order_value)}
          icon={Target}
          color="#ED8936"
        />
        <KPICard
          title="Gross Margin"
          value={`${dashboardData.kpis.gross_margin_pct}%`}
          icon={Percent}
          color="#9F7AEA"
        />
        <KPICard
          title="Gross Profit"
          value={fmtZAR(dashboardData.kpis.ytd_gross_profit)}
          icon={BarChart3}
          color="#F56565"
        />
      </div>

      {/* Revenue Trend Chart */}
      <ChartCard title="Revenue Trend (Last 12 Months)" height={350}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dashboardData.revenue_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.split('-')[1] ? `${MONTH_SHORT[parseInt(value.split('-')[1])-1]} ${value.split('-')[0].slice(2)}` : value}
            />
            <YAxis 
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => fmtZAR(value).replace('R ', '')}
            />
            <Tooltip 
              formatter={(value) => [fmtZAR(Number(value)), 'Revenue']}
              labelFormatter={(label) => `Period: ${label}`}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue" 
              stroke="#00D4F5" 
              fill="#00D4F5" 
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="order_count" 
              name="Orders" 
              stroke="#2DD4A8" 
              fill="#2DD4A8" 
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <ChartCard title="Top 10 Customers by Revenue" height={350}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboardData.top_customers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="partner_name" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => fmtZAR(value).replace('R ', '')}
              />
              <Tooltip 
                formatter={(value) => [fmtZAR(Number(value)), 'Revenue']}
                labelFormatter={(label) => `Customer: ${label}`}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#00D4F5">
                {dashboardData.top_customers.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Active Exceptions */}
        <ChartCard title="Active Exception Summary" height={350}>
          <div className="flex flex-col h-full justify-center">
            <div className="flex justify-around items-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-red-500">{dashboardData.active_exceptions.critical}</div>
                <div className="text-sm text-gray-500">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-500">{dashboardData.active_exceptions.warning}</div>
                <div className="text-sm text-gray-500">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-500">{dashboardData.active_exceptions.info}</div>
                <div className="text-sm text-gray-500">Info</div>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-center space-x-4">
                {[{type: 'critical', color: 'red'}, {type: 'warning', color: 'orange'}, {type: 'info', color: 'blue'}].map(({type, color}) => (
                  <div key={type} className="flex items-center">
                    <div className={`w-3 h-3 rounded-full bg-${color}-500 mr-2`}></div>
                    <span className="text-xs capitalize">{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Additional Insights */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-800">Business Intelligence Summary</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-cyan-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-cyan-600 mr-2" />
                <span className="font-medium text-cyan-800">Revenue Growth</span>
              </div>
              <p className="mt-2 text-sm text-cyan-700">
                YTD revenue growth of {dashboardData.kpis.revenue_growth.toFixed(1)}% indicates strong market performance.
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800">Customer Performance</span>
              </div>
              <p className="mt-2 text-sm text-green-700">
                Top customers contribute significantly to revenue with diverse order patterns.
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="font-medium text-red-800">Risk Mitigation</span>
              </div>
              <p className="mt-2 text-sm text-red-700">
                {dashboardData.active_exceptions.critical} critical exceptions require immediate attention to maintain compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}