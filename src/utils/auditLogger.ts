// Audit Logger Utility for Offline-First Activity Logs
import { buildAuditLog } from './audit/auditLogger';

export interface AuditLog {
  id: string;
  user: string;
  actionType: string;
  timestamp: string;
  entity: string;
  notes: string;
  oldValue?: string;
  newValue?: string;
  username?: string;
  action?: string;
  module?: string;
  details?: string;
  deviceType?: string;
}

export function addAuditLog(actionType: string, entity: string, notes: string, oldValue?: string, newValue?: string) {
  try {
    const userName = localStorage.getItem('amin_sh_logged_user') || 'مستخدم غير معروف';
    const activeRole = localStorage.getItem('amin_sh_active_role') || 'owner';
    
    const roleLabels: Record<string, string> = {
      owner: 'المالك',
      accountant: 'المحاسب',
      data_entry: 'مدخل بيانات',
      supervisor: 'مشرف جمعية',
      view_only: 'مستخدم عرض فقط'
    };
    const roleLabel = roleLabels[activeRole] || activeRole;
    const fullUserLabel = `${userName} [${roleLabel}]`;

    const logsStr = localStorage.getItem('amin_sh_system_audit_logs') || '[]';
    let logs: AuditLog[] = [];
    try {
      logs = JSON.parse(logsStr);
      if (!Array.isArray(logs)) logs = [];
    } catch {
      logs = [];
    }

    const unifiedLog = buildAuditLog(userName, entity, actionType, notes);

    const newLog: AuditLog = {
      ...unifiedLog,
      user: fullUserLabel,
      actionType,
      entity,
      notes,
      oldValue,
      newValue
    };

    // Keep top 500 logs to prevent exceeding localStorage capacity
    const updated = [newLog, ...logs].slice(0, 500);
    localStorage.setItem('amin_sh_system_audit_logs', JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function getAuditLogs(): AuditLog[] {
  try {
    const logsStr = localStorage.getItem('amin_sh_system_audit_logs') || '[]';
    return JSON.parse(logsStr);
  } catch {
    return [];
  }
}

export function clearAuditLogs() {
  localStorage.setItem('amin_sh_system_audit_logs', '[]');
}
