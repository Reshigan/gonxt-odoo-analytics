// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Frontend API Client
// ═══════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nxt.vantax.co.za';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: Record<string, any>;
  error?: string;
}

interface DateParams {
  company_id: number;
  year: number;
  month?: number | null;
  day?: number | null;
  compare_year?: number | null;
}

function buildQuery(params: Record<string, any>): string {
  const qs = Object.entries(params)
    .filter(([_, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gonxt_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
}

// ── Auth ──
export const authApi = {
  login: (login: string, password: string) =>
    apiFetch<any>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  me: () => apiFetch<any>('/api/v1/auth/me'),
  switchCompany: (company_id: number) =>
    apiFetch<any>('/api/v1/auth/switch-company', { method: 'POST', body: JSON.stringify({ company_id }) }),
};

// ── Sales ──
export const salesApi = {
  overview: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/overview${buildQuery(p)}`),
  revenueTrend: (p: DateParams & { granularity?: string }) =>
    apiFetch<any>(`/api/v1/sales/revenue-trend${buildQuery(p)}`),
  pipeline: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/pipeline${buildQuery(p)}`),
  byProduct: (p: DateParams & { top_n?: number }) =>
    apiFetch<any>(`/api/v1/sales/by-product${buildQuery(p)}`),
  byPartner: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/by-partner${buildQuery(p)}`),
  byTeam: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/by-team${buildQuery(p)}`),
  orders: (p: DateParams & { page?: number; per_page?: number; state?: string; search?: string }) =>
    apiFetch<any>(`/api/v1/sales/orders${buildQuery(p)}`),
  orderDetail: (id: number) =>
    apiFetch<any>(`/api/v1/sales/orders/${id}`),
  completionRate: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/completion-rate${buildQuery(p)}`),
};

// ── Stock ──
export const stockApi = {
  overview: (p: { company_id: number }) =>
    apiFetch<any>(`/api/v1/stock/overview${buildQuery(p)}`),
  onHand: (p: { company_id: number; warehouse?: string; status?: string; search?: string; category?: string; page?: number }) =>
    apiFetch<any>(`/api/v1/stock/on-hand${buildQuery(p)}`),
  movements: (p: DateParams & { move_type?: string; warehouse?: string; search?: string; page?: number }) =>
    apiFetch<any>(`/api/v1/stock/movements${buildQuery(p)}`),
  ageing: (p: { company_id: number }) =>
    apiFetch<any>(`/api/v1/stock/ageing${buildQuery(p)}`),
  warehouses: (company_id: number) =>
    apiFetch<string[]>(`/api/v1/stock/warehouses?company_id=${company_id}`),
  categories: (company_id: number) =>
    apiFetch<string[]>(`/api/v1/stock/categories?company_id=${company_id}`),
  valuationTrend: (p: { company_id: number }) =>
    apiFetch<any>(`/api/v1/stock/valuation-trend${buildQuery(p)}`),
};

// ── Exceptions ──
export const exceptionsApi = {
  active: (p: { company_id: number; severity?: string; type?: string }) =>
    apiFetch<any>(`/api/v1/exceptions/active${buildQuery(p)}`),
  summary: (company_id: number) =>
    apiFetch<any>(`/api/v1/exceptions/summary?company_id=${company_id}`),
  resolve: (id: number, notes: string, by: string) =>
    apiFetch<any>(`/api/v1/exceptions/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolution_notes: notes, resolved_by: by }),
    }),
  completeness: (company_id: number) =>
    apiFetch<any>(`/api/v1/exceptions/transactions/completeness?company_id=${company_id}`),
};

// ── Executive Visibility ──
export const executiveApi = {
  dashboard: () => apiFetch<any>('/api/v1/executive/dashboard'),
  financialPerformance: (p: { company_id?: number }) =>
    apiFetch<any>(`/api/v1/executive/financial-performance${buildQuery(p)}`),
  customerIntelligence: (p: { company_id?: number; limit?: number }) =>
    apiFetch<any>(`/api/v1/executive/customer-intelligence${buildQuery(p)}`),
  productPerformance: (p: { company_id?: number; limit?: number }) =>
    apiFetch<any>(`/api/v1/executive/product-performance${buildQuery(p)}`),
  companies: () => apiFetch<any>('/api/v1/executive/companies'),
  teamPerformance: () => apiFetch<any>('/api/v1/executive/team-performance'),
  operationalDaily: () => apiFetch<any>('/api/v1/executive/operational/daily-summary'),
  operationalExceptions: (p: { limit?: number; severity?: string; entity_type?: string }) =>
    apiFetch<any>(`/api/v1/executive/operational/exceptions${buildQuery(p)}`),
  operationalExceptionAnalysis: () => apiFetch<any>('/api/v1/executive/operational/exception-analysis'),
};

// ── Health ──
export const healthApi = {
  check: () => apiFetch<any>('/api/v1/health'),
  sync: () => apiFetch<any>('/api/v1/health/sync'),
};


