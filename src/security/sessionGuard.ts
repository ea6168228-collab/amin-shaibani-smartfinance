export function isSessionValid(session: any): boolean {
  if (!session) return false;
  if (!session.username || !session.fullName || !session.role) return false;
  
  // If session doesn't have permissions or tokenExpires, but is an admin, we can default it or allow it.
  // But let's check for standard fields requested:
  // username, fullName, role, permissions, tokenExpires, activeBranchId
  if (!Array.isArray(session.permissions)) return false;
  if (!session.activeBranchId) return false;
  if (!session.tokenExpires) return false;

  const expires = new Date(session.tokenExpires).getTime();
  return !Number.isNaN(expires) && expires > Date.now();
}
