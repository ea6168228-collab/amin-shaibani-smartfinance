import { ROLE_PERMISSIONS } from './permissions';

export function normalizeRole(role?: string): string {
  const r = (role || 'viewer').toLowerCase().trim();
  if (r === 'admin' || r === 'owner') return 'admin';
  if (r === 'accountant') return 'accountant';
  return 'viewer';
}

export function canAccess(role: string | undefined, permission: string): boolean {
  const normalized = normalizeRole(role) as keyof typeof ROLE_PERMISSIONS;
  const permissions = ROLE_PERMISSIONS[normalized] || ROLE_PERMISSIONS.viewer;
  return permissions.includes(permission as any);
}
