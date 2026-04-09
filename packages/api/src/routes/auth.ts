// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — Auth Routes
// Login via Odoo JSON-RPC, JWT issuance, company switching
// ═══════════════════════════════════════════════════════════════

import { Hono } from 'hono';
import type { Env } from '../../../shared/src/types';
import { OdooClient } from '../../../sync/src/odoo-client';

type HonoEnv = { Bindings: Env };
export const authRoutes = new Hono<HonoEnv>();

// POST /auth/login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ login: string; password: string }>();
  const { login, password } = body;

  if (!login || !password) {
    return c.json({ success: false, error: 'Login and password required' }, 400);
  }

  try {
    // Authenticate against Odoo
    const client = new OdooClient(c.env.ODOO_URL, c.env.ODOO_DB, login, password);
    const uid = await client.authenticate();

    // Fetch user details from Odoo
    const users = await client.read('res.users', [uid], [
      'name', 'login', 'sale_team_id', 'company_id', 'company_ids', 'groups_id'
    ]);
    const user = users[0];

    const company = OdooClient.resolveMany2one(user.company_id);
    const team = OdooClient.resolveMany2one(user.sale_team_id);
    const companyIds = OdooClient.resolveMany2many(user.company_ids);
    const groupIds = OdooClient.resolveMany2many(user.groups_id);

    // Fetch company names
    let companies: any[] = [];
    if (companyIds.length > 0) {
      const compClient = new OdooClient(c.env.ODOO_URL, c.env.ODOO_DB, c.env.ODOO_USER, c.env.ODOO_PASSWORD);
      companies = await compClient.read('res.company', companyIds, ['name']);
    }

    // Generate session ID and store session data securely
    const sessionId = crypto.randomUUID(); // Requires Web Crypto API
    
    // Build session payload (not exposed to client)
    const sessionPayload = {
      uid: uid,
      odoo_uid: uid,
      login: user.login,
      name: user.name,
      team_id: team.id,
      company_ids: companyIds,
      active_company_id: company.id || companyIds[0] || 1,
      companies: companies.map((co: any) => ({ id: co.id, name: co.name })),
      roles: determineRoles(groupIds),
      created_at: Date.now(),
      expires_at: Date.now() + 900000, // 15 minutes
    };

    // Store session securely in KV with session ID as key
    await c.env.CACHE.put(`session:${sessionId}`, JSON.stringify(sessionPayload), { 
      expirationTtl: 900 
    });

    // Return access token (session ID) and user info to client
    return c.json({
      success: true,
      data: {
        access_token: sessionId, // This is the session ID, not JWT
        user: {
          uid: sessionPayload.uid,
          name: sessionPayload.name,
          login: sessionPayload.login,
          roles: sessionPayload.roles,
          companies: sessionPayload.companies,
          active_company_id: sessionPayload.active_company_id,
          team_id: sessionPayload.team_id,
        },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: `Authentication failed: ${err.message}` }, 401);
  }
});

// POST /auth/switch-company
authRoutes.post('/switch-company', async (c) => {
  const body = await c.req.json<{ company_id: number }>();
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) return c.json({ success: false, error: 'No token' }, 401);

  const session = await c.env.CACHE.get(`session:${token}`);
  if (!session) return c.json({ success: false, error: 'Session expired' }, 401);

  const sessionPayload = JSON.parse(session);

  if (!sessionPayload.company_ids.includes(body.company_id)) {
    return c.json({ success: false, error: 'Access denied to this company' }, 403);
  }

  sessionPayload.active_company_id = body.company_id;
  sessionPayload.expires_at = Date.now() + 900000; // Extend session
  
  await c.env.CACHE.put(`session:${token}`, JSON.stringify(sessionPayload), { 
    expirationTtl: 900 
  });

  return c.json({ 
    success: true, 
    data: { 
      active_company_id: body.company_id,
      refreshed_at: Date.now()
    } 
  });
});

// GET /auth/me
authRoutes.get('/me', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ success: false, error: 'No token' }, 401);

  const session = await c.env.CACHE.get(`session:${token}`);
  if (!session) return c.json({ success: false, error: 'Session expired' }, 401);

  const sessionPayload = JSON.parse(session);
  
  // Check if session has expired based on our internal timestamp
  if (sessionPayload.expires_at < Date.now()) {
    await c.env.CACHE.delete(`session:${token}`);
    return c.json({ success: false, error: 'Session expired' }, 401);
  }

  // Return minimal user information (don't expose internal session details)
  return c.json({
    success: true,
    data: {
      uid: sessionPayload.uid,
      name: sessionPayload.name,
      login: sessionPayload.login,
      roles: sessionPayload.roles,
      companies: sessionPayload.companies,
      active_company_id: sessionPayload.active_company_id,
      team_id: sessionPayload.team_id,
      refreshed_at: Date.now()
    }
  });
});

// POST /auth/logout
authRoutes.post('/logout', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ success: false, error: 'No token' }, 401);

  // Delete session from KV store
  await c.env.CACHE.delete(`session:${token}`);
  
  return c.json({ 
    success: true, 
    data: { 
      message: 'Logged out successfully' 
    } 
  });
});

function determineRoles(groupIds: number[]): string[] {
  // Map Odoo group IDs to GONXT roles
  // In production, resolve group XML IDs from Odoo
  const roles: string[] = ['analyst']; // base role

  // Heuristic: higher group IDs typically mean more access
  // Proper implementation would resolve group XML IDs
  if (groupIds.length > 20) roles.push('executive');
  if (groupIds.some(g => g > 50)) roles.push('sales_head');
  if (groupIds.some(g => g > 40)) roles.push('ops_head');

  return roles;
}
