// Backup & Restore System for Al-Shaibani Finance Core
import { addAuditLog } from './auditLogger';
import { isNativeCapacitor, saveAndShareBackup } from './capacitorAndroidHelper';

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  type: 'manual' | 'auto_login' | 'auto_logout';
  desc: string;
  employeesCount: number;
  transactionsCount: number;
  associationsCount: number;
  payload: string; // Stringified backup JSON
}

// Generates a current backup payload containing all data tables
export function generateBackupPayload(): any {
  const currentUserId = localStorage.getItem('amin_sh_user_id') || '';
  const isCustom = currentUserId && !['admin', 'accountant', 'viewer'].includes(currentUserId);
  
  const empKey = isCustom ? `amin_sh_employees_${currentUserId}` : 'amin_sh_employees';
  const txKey = isCustom ? `amin_sh_transactions_${currentUserId}` : 'amin_sh_transactions';
  const catKey = isCustom ? `amin_sh_categories_${currentUserId}` : 'amin_sh_categories';
  const setKey = isCustom ? `amin_sh_settings_${currentUserId}` : 'amin_sh_settings';
  
  const assocKey = isCustom ? `amin_sh_associations_${currentUserId}` : 'amin_sh_associations';
  const payKey = isCustom ? `amin_sh_payments_${currentUserId}` : 'amin_sh_payments';
  const memKey = isCustom ? `amin_sh_members_${currentUserId}` : 'amin_sh_members';
  const grpKey = isCustom ? `amin_sh_group_txs_${currentUserId}` : 'amin_sh_group_txs';

  const employees = JSON.parse(localStorage.getItem(empKey) || '[]');
  const transactions = JSON.parse(localStorage.getItem(txKey) || '[]');
  const customCategories = JSON.parse(localStorage.getItem(catKey) || '[]');
  const appSettings = JSON.parse(localStorage.getItem(setKey) || 'null');
  
  const associations = JSON.parse(localStorage.getItem(assocKey) || '[]');
  const payments = JSON.parse(localStorage.getItem(payKey) || '[]');
  const members = JSON.parse(localStorage.getItem(memKey) || '[]');
  const assocTransactions = JSON.parse(localStorage.getItem(grpKey) || '[]');

  return {
    system: 'Amin Al-Shaibani Finance Core v3.0',
    version: '3.1-Final',
    exportedAt: new Date().toISOString(),
    userSpace: currentUserId || 'system_shared',
    modules: ['employees', 'transactions', 'customCategories', 'appSettings', 'associations', 'payments', 'members', 'assocTransactions'],
    employees,
    transactions,
    customCategories,
    appSettings,
    associations,
    payments,
    members,
    assocTransactions
  };
}

// Creates a local backup snapshot and stores it in localStorage
export function createLocalSnapshot(type: 'manual' | 'auto_login' | 'auto_logout', description: string): BackupSnapshot | null {
  try {
    const payload = generateBackupPayload();
    
    const snapshot: BackupSnapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      desc: description,
      employeesCount: Array.isArray(payload.employees) ? payload.employees.length : 0,
      transactionsCount: Array.isArray(payload.transactions) ? payload.transactions.length : 0,
      associationsCount: Array.isArray(payload.associations) ? payload.associations.length : 0,
      payload: JSON.stringify(payload)
    };

    const snapshotsStr = localStorage.getItem('amin_sh_local_snapshots') || '[]';
    let snapshots: BackupSnapshot[] = [];
    try {
      snapshots = JSON.parse(snapshotsStr);
      if (!Array.isArray(snapshots)) snapshots = [];
    } catch {
      snapshots = [];
    }

    // Keep top 30 local snapshots
    const updatedSnapshots = [snapshot, ...snapshots].slice(0, 30);
    localStorage.setItem('amin_sh_local_snapshots', JSON.stringify(updatedSnapshots));

    // Also record this in the audit log
    addAuditLog(
      type === 'manual' ? 'إنشاء نسخة احتياطية يدوية' : type === 'auto_login' ? 'نسخة احتياطية تلقائية (دخول)' : 'نسخة احتياطية تلقائية (خروج)',
      'سجلات التدقيق',
      `تم إنشاء نسخة محلية بنجاح تحتوي على ${snapshot.employeesCount} موظف و ${snapshot.transactionsCount} حركة.`
    );

    return snapshot;
  } catch (err) {
    console.error('Failed to create local snapshot:', err);
    return null;
  }
}

// Gets all local snapshots in system
export function getLocalSnapshots(): BackupSnapshot[] {
  try {
    const snapshotsStr = localStorage.getItem('amin_sh_local_snapshots') || '[]';
    return JSON.parse(snapshotsStr);
  } catch {
    return [];
  }
}

// Function to validate the integrity of any backup file/object before restoring it
export function validateBackupIntegrity(data: any): { isValid: boolean; error?: string } {
  if (!data) {
    return { isValid: false, error: 'الملف أو البيانات فارغة.' };
  }
  if (data.system !== 'Amin Al-Shaibani Finance Core v3.0' && data.system !== 'Amin Al-Shaibani Finance Core' && !data.employees) {
    return { isValid: false, error: 'تنسيق الملف غير متوافق مع نظام أمين الشيباني المعتمد.' };
  }
  // Validate that employees and transactions are valid arrays
  if (data.employees && !Array.isArray(data.employees)) {
    return { isValid: false, error: 'قائمة بيانات الموظفين تالفة أو غير صالحة.' };
  }
  if (data.transactions && !Array.isArray(data.transactions)) {
    return { isValid: false, error: 'سجل الحركات المالية المرفق غير صالح.' };
  }
  return { isValid: true };
}

// Trigger browser download of custom JSON backup
export async function downloadBackupFile() {
  try {
    const payload = generateBackupPayload();
    const jsonString = JSON.stringify(payload, null, 2);
    const formattedDate = new Date().toISOString().slice(0, 10);
    const fileName = `نسخة_احتياطية_الشيباني_${formattedDate}.json`;

    if (isNativeCapacitor()) {
      const success = await saveAndShareBackup(jsonString, fileName);
      if (success) {
        addAuditLog('إنشاء نسخة احتياطية', 'قاعدة البيانات', 'تم استخراج ومشاركة النسخة الاحتياطية بنجاح عبر أندرويد للهواتف.');
        return;
      }
    }

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    // Cleanup URL
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }, 100);

    addAuditLog('إنشاء نسخة احتياطية', 'قاعدة البيانات', 'تم استخراج وتنزيل ملف النسخة الاحتياطية بنجاح باحتياطية كاملة وتوافق عربي 100%');
  } catch (e: any) {
    console.error('Failed to download backup:', e);
  }
}

// Restores system data from a backup object
export function restoreSystemFromPayload(payload: any): { success: boolean; message: string } {
  const integrity = validateBackupIntegrity(payload);
  if (!integrity.isValid) {
    return { success: false, message: integrity.error || 'ملف بيانات تالف.' };
  }

  try {
    const currentUserId = localStorage.getItem('amin_sh_user_id') || '';
    const isCustom = currentUserId && !['admin', 'accountant', 'viewer'].includes(currentUserId);
    
    const empKey = isCustom ? `amin_sh_employees_${currentUserId}` : 'amin_sh_employees';
    const txKey = isCustom ? `amin_sh_transactions_${currentUserId}` : 'amin_sh_transactions';
    const catKey = isCustom ? `amin_sh_categories_${currentUserId}` : 'amin_sh_categories';
    const setKey = isCustom ? `amin_sh_settings_${currentUserId}` : 'amin_sh_settings';
    
    const assocKey = isCustom ? `amin_sh_associations_${currentUserId}` : 'amin_sh_associations';
    const payKey = isCustom ? `amin_sh_payments_${currentUserId}` : 'amin_sh_payments';
    const memKey = isCustom ? `amin_sh_members_${currentUserId}` : 'amin_sh_members';
    const grpKey = isCustom ? `amin_sh_group_txs_${currentUserId}` : 'amin_sh_group_txs';

    // Set lists inside localStorage
    if (payload.employees) localStorage.setItem(empKey, JSON.stringify(payload.employees));
    if (payload.transactions) localStorage.setItem(txKey, JSON.stringify(payload.transactions));
    if (payload.customCategories) localStorage.setItem(catKey, JSON.stringify(payload.customCategories));
    if (payload.appSettings) localStorage.setItem(setKey, JSON.stringify(payload.appSettings));
    
    if (payload.associations) localStorage.setItem(assocKey, JSON.stringify(payload.associations));
    if (payload.payments) localStorage.setItem(payKey, JSON.stringify(payload.payments));
    if (payload.members) localStorage.setItem(memKey, JSON.stringify(payload.members));
    if (payload.assocTransactions) localStorage.setItem(grpKey, JSON.stringify(payload.assocTransactions));

    // Add Audit Log
    addAuditLog(
      'استعادة نسخة احتياطية',
      'قاعدة البيانات',
      `تم استعادة النظام بالكامل لكافة الموظفين (${payload.employees?.length || 0}) والعمليات بنجاح.`
    );

    return {
      success: true,
      message: `تمت استعادة البيانات بنجاح! تم تحميل (${payload.employees?.length || 0}) موظف و(${payload.transactions?.length || 0}) حركة محاسبية.`
    };
  } catch (err: any) {
    return { success: false, message: `خطأ أثناء الاستعادة: ${err?.message || 'خطأ داخلي'}` };
  }
}

// Automatic backup trigger on login (check if no snapshots exist or if the latest is old)
export function runAutoLoginBackupIfNeeded() {
  try {
    const snapshots = getLocalSnapshots();
    let shouldBackup = false;

    if (snapshots.length === 0) {
      shouldBackup = true;
    } else {
      // Check if latest backup is older than 1 day (86400000 ms)
      const latest = snapshots[0];
      const timeElapsed = Date.now() - new Date(latest.timestamp).getTime();
      if (timeElapsed > 86400000) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      createLocalSnapshot('auto_login', 'نسخة احتياطية تلقائية دورية عند بدء تسجيل الدخول اليومي');
    }
  } catch (err) {
    console.warn('Auto login backup skipped:', err);
  }
}
