// packages/authz/src/index.ts
// Re-export everything so consuming apps import from '@insighthunter/authz'

export type { OrgRole, OrgPlan, Permission, SessionPrincipal, TenantContext, AuthContext, IHSession, AuthenticatedUser, JwtPayload, Jwk, JwksDocument, SessionRecord } from './types';

export { createSessionCookie, clearSessionCookie } from './session';
export { authGuard, apiAuthGuard, requireRole, requirePermission, getSession, getOrgId } from './middleware';
export { writeAuditLog, getAuditLog } from './audit';
export { sendEmail, createInAppNotification, getUnreadNotifications, markNotificationRead } from './notifications';
export { loadTenantContext, requireAuth, requirePermission as requirePermissionLegacy, writeAuditLog as writeAuditLogLegacy } from './legacy';

export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    'org:read','org:update','members:read','members:invite','members:update',
    'billing:read','billing:update','reports:read','reports:export',
    'forecast:read','forecast:write','transactions:read','transactions:write',
    'documents:read','documents:write','payroll:read','payroll:write',
    'bookkeeping:read','bookkeeping:write','audit:read','settings:read','settings:write',
  ],
  admin: [
    'org:read','org:update','members:read','members:invite','members:update',
    'reports:read','reports:export','forecast:read','forecast:write',
    'transactions:read','transactions:write','documents:read','documents:write',
    'payroll:read','payroll:write','bookkeeping:read','bookkeeping:write',
    'audit:read','settings:read','settings:write',
  ],
  finance_manager: [
    'org:read','members:read','reports:read','reports:export',
    'forecast:read','forecast:write','transactions:read','transactions:write',
    'documents:read','documents:write','payroll:read','payroll:write',
    'bookkeeping:read','bookkeeping:write','settings:read',
  ],
  analyst: [
    'org:read','members:read','reports:read','forecast:read',
    'transactions:read','documents:read','settings:read',
  ],
  bookkeeper: [
    'org:read','reports:read','transactions:read','transactions:write',
    'documents:read','documents:write','bookkeeping:read','bookkeeping:write','settings:read',
  ],
  viewer: [
    'org:read','reports:read','forecast:read','documents:read','settings:read',
  ],
};
