// ═══════════════════════════════════════════════════════════════
// GONXT Analytics — Main App Entry (Next.js App Router)
// Composes layout + pages with shared filter state
// ═══════════════════════════════════════════════════════════════

'use client';
import React, { useState } from 'react';
import AppLayout from '../components/AppLayout';
import DashboardPage from './dashboard/DashboardPage';
import SalesPage from './sales/SalesPage';
import StockPage from './stock/StockPage';
import ExceptionsPage from './exceptions/ExceptionsPage';
import type { FilterState } from '../components/DateFilterBar';

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

  return (
    <AppLayout
      activePage={page}
      onNavigate={setPage}
      companies={COMPANIES}
      activeCompanyId={filters.company_id}
      onCompanyChange={(id) => setFilters(f => ({ ...f, company_id: id }))}
      userName="Reshigan Govender"
    >
      {page === 'dashboard' && (
        <DashboardPage filters={filters} onFiltersChange={setFilters} companies={COMPANIES} />
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
