// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Frontend API Client
// ═══════════════════════════════════════════════════════════════

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nxt.vantax.co.za';

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000) { // 5 minutes default
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
  
  clear() {
    this.cache.clear();
  }
  
  clearPrefix(prefix: string) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

const apiCache = new SimpleCache();

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

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gonxt_token');
    window.location.href = '/login';
  }
}

async function refreshToken(): Promise<boolean> {
  // In a real implementation, this would refresh the token
  // For now, we'll just check if the token is still valid
  return false;
}

async function apiFetch<T>(path: string, options?: RequestInit & { cache?: boolean; cacheKey?: string; ttl?: number }): Promise<ApiResponse<T>> {
  const { cache = false, cacheKey, ttl = 5 * 60 * 1000, ...fetchOptions } = options || {};
  
  // Try to get from cache first
  if (cache && cacheKey) {
    const cached = apiCache.get<ApiResponse<T>>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('gonxt_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers: { ...headers, ...fetchOptions?.headers } });
  
  // Handle unauthorized responses
  if (res.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }
  
  const data = await res.json();

  if (!res.ok || !data.success) {
    if (data.error === 'Session expired or invalid') {
      redirectToLogin();
    }
    throw new Error(data.error || `API error: ${res.status}`);
  }

  // Cache the response if requested
  if (cache && cacheKey) {
    apiCache.set<ApiResponse<T>>(cacheKey, data, ttl);
  }

  return data;
}

// ── Helpers ──
function buildQuery(params: Record<string, any>): string {
  const qs = Object.entries(params)
    .filter(([_, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

// ── Auth ──
export const authApi = {
  login: (login: string, password: string) =>
    apiFetch<any>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  me: () => apiFetch<any>('/api/v1/auth/me'),
  switchCompany: (company_id: number) =>
    apiFetch<any>('/api/v1/auth/switch-company', { method: 'POST', body: JSON.stringify({ company_id }) }),
  logout: () =>
    apiFetch<any>('/api/v1/auth/logout', { method: 'POST' })
};

// ── Sales ──
export const salesApi = {
  overview: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/overview${buildQuery(p)}`, { cache: true, cacheKey: `sales-overview-${JSON.stringify(p)}`, ttl: 5 * 60 * 1000 }),
  revenueTrend: (p: DateParams & { granularity?: string }) =>
    apiFetch<any>(`/api/v1/sales/revenue-trend${buildQuery(p)}`, { cache: true, cacheKey: `revenue-trend-${JSON.stringify(p)}`, ttl: 5 * 60 * 1000 }),
  pipeline: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/pipeline${buildQuery(p)}`, { cache: true, cacheKey: `sales-pipeline-${JSON.stringify(p)}`, ttl: 5 * 60 * 1000 }),
  byProduct: (p: DateParams & { top_n?: number }) =>
    apiFetch<any>(`/api/v1/sales/by-product${buildQuery(p)}`, { cache: true, cacheKey: `sales-by-product-${JSON.stringify(p)}`, ttl: 10 * 60 * 1000 }),
  byPartner: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/by-partner${buildQuery(p)}`, { cache: true, cacheKey: `sales-by-partner-${JSON.stringify(p)}`, ttl: 10 * 60 * 1000 }),
  byTeam: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/by-team${buildQuery(p)}`, { cache: true, cacheKey: `sales-by-team-${JSON.stringify(p)}`, ttl: 10 * 60 * 1000 }),
  orders: (p: DateParams & { page?: number; per_page?: number; state?: string; search?: string }) =>
    apiFetch<any>(`/api/v1/sales/orders${buildQuery(p)}`),
  orderDetail: (id: number) =>
    apiFetch<any>(`/api/v1/sales/orders/${id}`),
  completionRate: (p: DateParams) =>
    apiFetch<any>(`/api/v1/sales/completion-rate${buildQuery(p)}`, { cache: true, cacheKey: `completion-rate-${JSON.stringify(p)}`, ttl: 5 * 60 * 1000 }),
};

// ── Stock ──
export const stockApi = {
  overview: (p: { company_id: number }) =>
    apiFetch<any>(`/api/v1/stock/overview${buildQuery(p)}`, { cache: true, cacheKey: `stock-overview-${p.company_id}`, ttl: 5 * 60 * 1000 }),
  onHand: (p: { company_id: number; warehouse?: string; status?: string; search?: string; category?: string; page?: number }) =>
    apiFetch<any>(`/api/v1/stock/on-hand${buildQuery(p)}`),
  movements: (p: DateParams & { move_type?: string; warehouse?: string; search?: string; page?: number }) =>
    apiFetch<any>(`/api/v1/stock/movements${buildQuery(p)}`),
  ageing: (p: { company_id: number }) =>
    apiFetch<any>(`/api/v1/stock/ageing${buildQuery(p)}`, { cache: true, cacheKey: `stock-ageing-${p.company_id}`, ttl: 10 * 60 * 1000 }),
  warehouses: (company_id: number) =>
    apiFetch<string[]>(`/api/v1/stock/warehouses?company_id=${company_id}`, { cache: true, cacheKey: `warehouses-${company_id}`, ttl: 30 * 60 * 1000 }),
  categories: (company_id: number) =>
    apiFetch<string[]>(`/api/v1/stock/categories?company_id=${company_id}`, { cache: true, cacheKey: `categories-${company_id}`, ttl: 30 * 60 * 1000 }),
  valuationTrend: (p: { company_id: number }) =>
    apiFetch<any>(`/api/v1/stock/valuation-trend${buildQuery(p)}`, { cache: true, cacheKey: `valuation-trend-${p.company_id}`, ttl: 10 * 60 * 1000 }),
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
  dashboard: () => apiFetch<any>('/api/v1/executive/dashboard', { cache: true, cacheKey: 'executive-dashboard', ttl: 10 * 60 * 1000 }), // 10 minutes
  financialPerformance: (p: { company_id?: number }) =>
    apiFetch<any>(`/api/v1/executive/financial-performance${buildQuery(p)}`, { cache: true, cacheKey: `financial-perf-${p.company_id || 'all'}`, ttl: 10 * 60 * 1000 }),
  customerIntelligence: (p: { company_id?: number; limit?: number }) =>
    apiFetch<any>(`/api/v1/executive/customer-intelligence${buildQuery(p)}`, { cache: true, cacheKey: `customer-intel-${p.company_id || 'all'}-${p.limit || 20}`, ttl: 10 * 60 * 1000 }),
  productPerformance: (p: { company_id?: number; limit?: number }) =>
    apiFetch<any>(`/api/v1/executive/product-performance${buildQuery(p)}`, { cache: true, cacheKey: `product-perf-${p.company_id || 'all'}-${p.limit || 20}`, ttl: 10 * 60 * 1000 }),
  companies: () => apiFetch<any>('/api/v1/executive/companies', { cache: true, cacheKey: 'executive-companies', ttl: 30 * 60 * 1000 }), // 30 minutes
  teamPerformance: () => apiFetch<any>('/api/v1/executive/team-performance', { cache: true, cacheKey: 'team-performance', ttl: 10 * 60 * 1000 }),
  operationalDaily: () => apiFetch<any>('/api/v1/executive/operational/daily-summary', { cache: true, cacheKey: 'operational-daily', ttl: 5 * 60 * 1000 }), // 5 minutes
  operationalExceptions: (p: { limit?: number; severity?: string; entity_type?: string }) =>
    apiFetch<any>(`/api/v1/executive/operational/exceptions${buildQuery(p)}`, { cache: true, cacheKey: `operational-exceptions-${JSON.stringify(p)}`, ttl: 5 * 60 * 1000 }),
  operationalExceptionAnalysis: () => apiFetch<any>('/api/v1/executive/operational/exception-analysis', { cache: true, cacheKey: 'operational-exception-analysis', ttl: 10 * 60 * 1000 }),
};

// ── Health ──
export const healthApi = {
  check: () => apiFetch<any>('/api/v1/health'),
  sync: () => apiFetch<any>('/api/v1/health/sync'),
};

// ── Cache Management ──
export const cacheManager = {
  clear: () => apiCache.clear(),
  clearPrefix: (prefix: string) => {
    apiCache.clearPrefix(prefix);
  }
};


