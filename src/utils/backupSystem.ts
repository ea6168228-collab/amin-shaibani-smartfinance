// Backup & Restore System for Al-Shaibani Finance Core
import { addAuditLog } from './auditLogger';
import { isNativeCapacitor, saveAndShareBackup, saveToDeviceBackupFolder, blobToBase64 } from './capacitorAndroidHelper';
import JSZip from 'jszip';

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

export interface BackupHistoryLog {
  id: string;
  timestamp: string;
  fileName: string;
  fileSize: string;
  type: 'json_data' | 'zip_data' | 'zip_project';
  status: 'success' | 'failure';
  error?: string;
}

// Generates a current backup payload containing ALL data tables and custom workspaces
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

  const payload: any = {
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
    assocTransactions,
    data: {} // Holds ALL keys in localStorage for dynamic and future-proof recovery
  };

  // Dynamically grab all keys starting with amin_sh_
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('amin_sh_')) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          payload.data[key] = JSON.parse(val);
        }
      } catch (err) {
        payload.data[key] = localStorage.getItem(key);
      }
    }
  }

  return payload;
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

// Restores system data from a backup object with fallback mechanism
export function restoreSystemFromPayload(payload: any): { success: boolean; message: string } {
  const integrity = validateBackupIntegrity(payload);
  if (!integrity.isValid) {
    return { success: false, message: integrity.error || 'ملف بيانات تالف أو غير متوافق.' };
  }

  // Backup existing data in memory before overwrite, so we can roll back if anything goes wrong!
  const oldLocalStorage: { [key: string]: string | null } = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('amin_sh_')) {
      oldLocalStorage[key] = localStorage.getItem(key);
    }
  }

  try {
    // If we have dynamic data dictionary, restore ALL keys
    if (payload.data && typeof payload.data === 'object') {
      for (const [key, val] of Object.entries(payload.data)) {
        if (val !== undefined && val !== null) {
          localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
        }
      }
    } else {
      // Fallback to legacy structure
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

      if (payload.employees) localStorage.setItem(empKey, JSON.stringify(payload.employees));
      if (payload.transactions) localStorage.setItem(txKey, JSON.stringify(payload.transactions));
      if (payload.customCategories) localStorage.setItem(catKey, JSON.stringify(payload.customCategories));
      if (payload.appSettings) localStorage.setItem(setKey, JSON.stringify(payload.appSettings));
      
      if (payload.associations) localStorage.setItem(assocKey, JSON.stringify(payload.associations));
      if (payload.payments) localStorage.setItem(payKey, JSON.stringify(payload.payments));
      if (payload.members) localStorage.setItem(memKey, JSON.stringify(payload.members));
      if (payload.assocTransactions) localStorage.setItem(grpKey, JSON.stringify(payload.assocTransactions));
    }

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
    // Rollback if failed
    console.error('Error in restore, rolling back...', err);
    for (const [key, val] of Object.entries(oldLocalStorage)) {
      if (val !== null) {
        localStorage.setItem(key, val);
      } else {
        localStorage.removeItem(key);
      }
    }
    return { success: false, message: `خطأ أثناء الاستعادة: ${err?.message || 'خطأ داخلي، تم التراجع لحفظ البيانات الحالية دون تعديل'}` };
  }
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

    const updatedSnapshots = [snapshot, ...snapshots].slice(0, 30);
    localStorage.setItem('amin_sh_local_snapshots', JSON.stringify(updatedSnapshots));

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

// Backup History Log Manager
export function getBackupHistory(): BackupHistoryLog[] {
  try {
    const logStr = localStorage.getItem('amin_sh_backup_history') || '[]';
    const logs = JSON.parse(logStr);
    return Array.isArray(logs) ? logs : [];
  } catch {
    return [];
  }
}

export function addBackupHistoryLog(
  fileName: string,
  fileSize: string,
  type: 'json_data' | 'zip_data' | 'zip_project',
  status: 'success' | 'failure',
  error?: string
) {
  try {
    const logs = getBackupHistory();
    const newLog: BackupHistoryLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      fileName,
      fileSize,
      type,
      status,
      error
    };
    const updated = [newLog, ...logs].slice(0, 50); // Keep last 50 entries
    localStorage.setItem('amin_sh_backup_history', JSON.stringify(updated));
  } catch (err) {
    console.error('Error adding backup history log:', err);
  }
}

// Generate client-side JSON file data
export function generateClientDataJson(): { jsonString: string; fileName: string } {
  const payload = generateBackupPayload();
  const jsonString = JSON.stringify(payload, null, 2);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const fileName = `AminSmartFinance_${year}-${month}-${day}_${hours}-${minutes}.json`;
  return { jsonString, fileName };
}

// Generate client-side ZIP file (containing backup.json) with high compression
export async function generateClientDataZip(progressCallback?: (percent: number) => void): Promise<{ blob: Blob; fileName: string }> {
  if (progressCallback) progressCallback(10);
  const payload = generateBackupPayload();
  if (progressCallback) progressCallback(30);
  const jsonString = JSON.stringify(payload, null, 2);
  if (progressCallback) progressCallback(50);
  
  const zip = new JSZip();
  zip.file('backup.json', jsonString);
  
  if (progressCallback) progressCallback(70);
  
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  }, (metadata) => {
    if (progressCallback) {
      progressCallback(70 + Math.round(metadata.percent * 0.3));
    }
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const fileName = `AminSmartFinance_${year}-${month}-${day}_${hours}-${minutes}.zip`;

  return { blob, fileName };
}

// Extracts backup payload from either a selected ZIP or JSON file
export async function extractPayloadFromFile(file: File, progressCallback?: (percent: number) => void): Promise<any> {
  if (file.name.endsWith('.zip')) {
    if (progressCallback) progressCallback(20);
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    if (progressCallback) progressCallback(60);
    
    const jsonFile = Object.keys(loadedZip.files).find(name => name.endsWith('.json'));
    if (!jsonFile) {
      throw new Error('لم يتم العثور على ملف البيانات الصالحة (backup.json) داخل ملف الـ ZIP المختار.');
    }
    
    if (progressCallback) progressCallback(80);
    const jsonContent = await loadedZip.files[jsonFile].async('string');
    if (progressCallback) progressCallback(100);
    return JSON.parse(jsonContent);
  } else if (file.name.endsWith('.json')) {
    if (progressCallback) progressCallback(50);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('فشل قراءة ملف الـ JSON المختار.'));
      reader.onload = (e) => {
        try {
          if (progressCallback) progressCallback(100);
          resolve(JSON.parse(e.target?.result as string));
        } catch (err) {
          reject(new Error('تنسيق ملف الـ JSON غير صالح أو تالف.'));
        }
      };
      reader.readAsText(file);
    });
  } else {
    throw new Error('تنسيق الملف غير مدعوم! يرجى اختيار ملف ZIP أو JSON.');
  }
}

// Trigger standard browser download of JSON file
export async function downloadBackupFile() {
  try {
    const { jsonString, fileName } = generateClientDataJson();
    const sizeInKb = (jsonString.length / 1024).toFixed(1) + ' KB';

    if (isNativeCapacitor()) {
      const success = await saveAndShareBackup(jsonString, fileName);
      if (success) {
        addBackupHistoryLog(fileName, sizeInKb, 'json_data', 'success');
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
    
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }, 100);

    addBackupHistoryLog(fileName, sizeInKb, 'json_data', 'success');
    addAuditLog('إنشاء نسخة احتياطية', 'قاعدة البيانات', 'تم استخراج وتنزيل ملف النسخة الاحتياطية بنجاح.');
  } catch (e: any) {
    console.error('Failed to download backup:', e);
    addBackupHistoryLog('Error_Backup.json', '0 KB', 'json_data', 'failure', e.message || String(e));
  }
}

// Run automatic backup check on login
export function runAutoLoginBackupIfNeeded() {
  try {
    const snapshots = getLocalSnapshots();
    let shouldBackup = false;

    if (snapshots.length === 0) {
      shouldBackup = true;
    } else {
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
