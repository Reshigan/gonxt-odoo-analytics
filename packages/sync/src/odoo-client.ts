// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Odoo JSON-RPC Client
// Workers-compatible: uses native fetch(), no Node.js xmlrpc
// ═══════════════════════════════════════════════════════════════

import type { OdooRpcRequest, OdooRpcResponse } from '../../shared/src/types';

export class OdooClient {
  private url: string;
  private db: string;
  private username: string;
  private password: string;
  private uid: number | null = null;
  private requestId = 0;

  constructor(url: string, db: string, username: string, password: string) {
    this.url = url.replace(/\/$/, '');
    this.db = db;
    this.username = username;
    this.password = password;
  }

  private async rpc(service: 'common' | 'object', method: string, args: any[]): Promise<any> {
    this.requestId++;

    const payload: OdooRpcRequest = {
      jsonrpc: '2.0',
      method: 'call',
      id: this.requestId,
      params: { service, method, args },
    };

    const response = await fetch(`${this.url}/jsonrpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Odoo HTTP error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OdooRpcResponse;

    if (data.error) {
      const msg = data.error.data?.message || data.error.message || 'Unknown Odoo error';
      throw new Error(`Odoo RPC error: ${msg}`);
    }

    return data.result;
  }

  async authenticate(): Promise<number> {
    if (this.uid) return this.uid;

    const uid = await this.rpc('common', 'authenticate', [
      this.db, this.username, this.password, {},
    ]);

    if (!uid || uid === false) {
      throw new Error('Odoo authentication failed — check credentials');
    }

    this.uid = uid as number;
    return this.uid;
  }

  async searchRead(
    model: string,
    domain: any[][],
    fields: string[],
    options: { limit?: number; offset?: number; order?: string } = {}
  ): Promise<any[]> {
    const uid = await this.authenticate();

    const kwargs: Record<string, any> = { fields };
    if (options.limit) kwargs.limit = options.limit;
    if (options.offset) kwargs.offset = options.offset;
    if (options.order) kwargs.order = options.order;

    return this.rpc('object', 'execute_kw', [
      this.db, uid, this.password,
      model, 'search_read',
      [domain],
      kwargs,
    ]);
  }

  async searchCount(model: string, domain: any[][]): Promise<number> {
    const uid = await this.authenticate();

    return this.rpc('object', 'execute_kw', [
      this.db, uid, this.password,
      model, 'search_count',
      [domain],
    ]);
  }

  async read(model: string, ids: number[], fields: string[]): Promise<any[]> {
    const uid = await this.authenticate();

    return this.rpc('object', 'execute_kw', [
      this.db, uid, this.password,
      model, 'read',
      [ids],
      { fields },
    ]);
  }

  /**
   * Incremental sync — fetches records modified since lastSync
   * Paginates automatically in batches of `batchSize`
   */
  async syncModel(
    model: string,
    fields: string[],
    lastSync: string,
    batchSize: number = 200,
    companyId?: number
  ): Promise<{ records: any[]; total: number }> {
    const domain: any[][] = [['write_date', '>', lastSync]];
    if (companyId) domain.push(['company_id', '=', companyId]);

    const total = await this.searchCount(model, domain);
    const records: any[] = [];
    let offset = 0;

    while (offset < total) {
      const batch = await this.searchRead(model, domain, fields, {
        limit: batchSize,
        offset,
        order: 'write_date asc',
      });
      records.push(...batch);
      offset += batchSize;
    }

    return { records, total };
  }

  /**
   * Resolve many2one field — Odoo returns [id, name] or false
   */
  static resolveMany2one(value: any): { id: number | null; name: string } {
    if (!value || value === false) return { id: null, name: '' };
    if (Array.isArray(value)) return { id: value[0], name: value[1] || '' };
    return { id: value, name: '' };
  }

  /**
   * Resolve many2many field — Odoo returns array of IDs
   */
  static resolveMany2many(value: any): number[] {
    if (!value || !Array.isArray(value)) return [];
    return value;
  }
}
