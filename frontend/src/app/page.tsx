// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Main App Entry (Next.js App Router)
// Composes layout + pages with shared filter state
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import AppLayout from '../components/AppLayout';
import DashboardPage from './dashboard/DashboardPage';
import SalesPage from './sales/SalesPage';
import StockPage from './stock/StockPage';
import ExceptionsPage from './exceptions/ExceptionsPage';
import ExecutiveDashboard from './executive/page';
import OperationsDashboard from './operations/page';
import type { FilterState } from '../components/DateFilterBar';
import { AlertCircle } from 'lucide-react';

const COMPANIES = [
  { id: 1, name: 'GONXT Technology' },
  { id: 2, name: 'TerraVolt Energy' },
  { id: 3, name: 'Fybatex Medical' },
  { id: 4, name: 'Envera Capital' },
];

export default function Home() {
  const [page, setPage] = useState('dashboard');
  const [filters, setFilters] = useState<FilterState>({
    company_id: 1,
    year: 2026,
    month: null,
    day: null,
    compare_year: 2025,
  });
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200 max-w-md text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-slate-600 mb-6">Please sign in to access the dashboard.</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      activePage={page}
      onNavigate={setPage}
      companies={COMPANIES}
      activeCompanyId={filters.company_id}
      onCompanyChange={(id) => setFilters(f => ({ ...f, company_id: id }))}
      userName={user.name}
    >
      {page === 'dashboard' && (
        <DashboardPage filters={filters} onFiltersChange={setFilters} companies={COMPANIES} />
      )}
      {page === 'executive' && (
        <ExecutiveDashboard />
      )}
      {page === 'operations' && (
        <OperationsDashboard />
      )}
      {page === 'sales' && (
        <SalesPage filters={filters} onFiltersChange={setFilters} companies={COMPANIES} />
      )}
      {page === 'stock' && (
        <StockPage filters={filters} onFiltersChange={setFilters} companies={COMPANIES} />
      )}
      {page === 'exceptions' && (
        <ExceptionsPage filters={filters} onFiltersChange={setFilters} companies={COMPANIES} />
      )}
    </AppLayout>
  );
}
