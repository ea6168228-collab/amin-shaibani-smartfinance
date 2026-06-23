// Audit Logger Utility for Offline-First Activity Logs
export interface AuditLog {
  id: string;
  user: string;
  actionType: string;
  timestamp: string;
  entity: string;
  notes: string;
  oldValue?: string;
  newValue?: string;
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

    const logsStr = localStorage.getItem('amin_sh_system_audit_logs') || '[]';
    let logs: AuditLog[] = [];
    try {
      logs = JSON.parse(logsStr);
      if (!Array.isArray(logs)) logs = [];
    } catch {
      logs = [];
    }

    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user: `${userName} [${roleLabel}]`,
      actionType,
      timestamp: new Date().toISOString(), // Use standard ISO to allow proper sorting, we format it on display
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
