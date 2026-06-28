import { AuditLog } from '../../types';
import { Capacitor } from '@capacitor/core';

export function buildAuditLog(
  username: string,
  module: string,
  action: string,
  details: string
): AuditLog {
  const platform = typeof window !== 'undefined' ? Capacitor.getPlatform() : 'web';
  return {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    username,
    action,
    module,
    details,
    deviceType: platform,
    // Provide backwards compatible fields as well
    user: username,
    actionType: action,
    entity: module,
    notes: details
  };
}
