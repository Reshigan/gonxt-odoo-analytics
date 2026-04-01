// ═══════════════════════════════════════════════════════════════
// GONXT Odoo 18 Analytics — RBAC Middleware
// Role-based access control for API endpoints
// ═══════════════════════════════════════════════════════════════

import { Context } from 'hono';
import type { Env, AuthPayload } from '../../../shared/src/types';

type HonoEnv = { Bindings: Env };

// Define the roles and their permissions
export const ROLE_PERMISSIONS = {
  analyst: ['read:sales', 'read:stock', 'read:exceptions'],
  operations: ['read:sales', 'read:stock', 'read:exceptions', 'write:transactions'],
  sales_head: ['read:sales', 'read:stock', 'read:exceptions', 'write:transactions', 'manage:sales'],
  ops_head: ['read:sales', 'read:stock', 'read:exceptions', 'write:transactions', 'manage:operations'],
  executive: ['read:*', 'view:metrics', 'view:reports'],
  admin: ['read:*', 'write:*', 'manage:*', 'admin:*']
};

// Define executive visibility enhancements
export const EXECUTIVE_PERMISSIONS = [
  'view:executive_kpis',
  'view:revenue_trends',
  'view:operational_efficiency',
  'view:financial_metrics'
];

// Define operational visibility enhancements
export const OPERATIONAL_PERMISSIONS = [
  'view:daily_operations',
  'view:transaction_pipeline',
  'view:exception_tracking',
  'view:team_performance'
];

export function requireAuth() {
  return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const session = await c.env.CACHE.get(`session:${token}`);
    if (!session) {
      return c.json({ success: false, error: 'Session expired or invalid' }, 401);
    }

    const payload: AuthPayload = JSON.parse(session);
    c.set('user', payload);
    
    await next();
  };
}

export function requireRole(requiredRoles: string[]) {
  return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const userRoles = user.roles || [];
    const hasPermission = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return c.json({ success: false, error: `Access denied. Required roles: ${requiredRoles.join(', ')}` }, 403);
    }

    await next();
  };
}

export function requirePermission(requiredPermissions: string[]) {
  return async (c: Context<HonoEnv>, next: () => Promise<void>) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const userRoles = user.roles || [];
    let userPermissions: string[] = [];

    // Aggregate permissions from all user roles
    userRoles.forEach(role => {
      if (ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
        userPermissions = [...userPermissions, ...ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]];
      }
    });

    // Check if user has required permissions (wildcard support)
    const hasPermission = requiredPermissions.every(permission => {
      return userPermissions.some(userPerm => {
        if (userPerm === '*:*') return true;
        if (userPerm.endsWith(':*')) {
          const basePerm = userPerm.slice(0, -2); // Remove ':*'
          return permission.startsWith(basePerm);
        }
        return userPerm === permission;
      });
    });

    if (!hasPermission) {
      return c.json({ 
        success: false, 
        error: `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
        user_permissions: userPermissions 
      }, 403);
    }

    await next();
  };
}

// Enhanced visibility middlewares
export function requireExecutiveVisibility() {
  return requireRole(['executive', 'admin']);
}

export function requireOperationalVisibility() {
  return requireRole(['operations', 'sales_head', 'ops_head', 'executive', 'admin']);
}