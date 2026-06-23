import React, { useState, useRef } from 'react';
import { isNativeCapacitor, saveAndShareBackup } from '../utils/capacitorAndroidHelper';
import { 
  Building2, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  PlusCircle, 
  Users, 
  Key, 
  Database,
  FileCheck2,
  AlertCircle,
  CheckCircle,
  FileDown,
  Palette,
  Shield,
  Activity,
  Lock,
  Unlock,
  RotateCcw,
  Sliders,
  Check,
  X,
  Eye,
  RefreshCcw,
  Search,
  HelpCircle,
  Calendar
} from 'lucide-react';
import { Employee, Transaction, AppSettings, UserRole } from '../types';
import { getAuditLogs, clearAuditLogs, addAuditLog, AuditLog } from '../utils/auditLogger';
import { getRolesConfig, saveRolesConfig, isAbsoluteOwner, isMonthLocked, RoleCode, RoleConfig, RolePermissions } from '../utils/permissions';
import { createLocalSnapshot, getLocalSnapshots, restoreSystemFromPayload, downloadBackupFile, BackupSnapshot } from '../utils/backupSystem';

interface SettingsViewProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  customCategories: string[];
  setCustomCategories: (categories: string[]) => void;
  currentUserRole: UserRole;
}

export default function SettingsView({
  appSettings,
  setAppSettings,
  employees,
  setEmployees,
  transactions,
  setTransactions,
  customCategories,
  setCustomCategories,
  currentUserRole
}: SettingsViewProps) {
  const [instName, setInstName] = useState(appSettings.institution.name);
  const [instLogoText, setInstLogoText] = useState(appSettings.institution.logoText);
  const [instPhone, setInstPhone] = useState(appSettings.institution.phone);
  const [instAddress, setInstAddress] = useState(appSettings.institution.address);
  const [newType, setNewType] = useState('');

  // System Security & Controls States
  const [settingsTab, setSettingsTab] = useState<'standard' | 'system_management'>('standard');
  const [activeRoleConfig, setActiveRoleConfig] = useState<RoleCode>('owner');
  const [sessionRole, setSessionRole] = useState<string>(localStorage.getItem('amin_sh_active_role') || 'owner');
  const [snapshotList, setSnapshotList] = useState<BackupSnapshot[]>(() => getLocalSnapshots());
  const [auditList, setAuditList] = useState<AuditLog[]>(() => getAuditLogs());
  const [searchAuditQuery, setSearchAuditQuery] = useState('');
  const [rolesConfig, setRolesConfigState] = useState(() => getRolesConfig());
  const [newMonthInput, setNewMonthInput] = useState('');
  const [lockedMonths, setLockedMonths] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('amin_sh_locked_months') || '[]');
    } catch {
      return [];
    }
  });

  const isReadOnly = !!appSettings.readonlyMode;

  // Drag-and-Drop File upload states
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'err', text: string } | null>(null);

  const isAdmin = currentUserRole === UserRole.ADMIN;

  const handleSaveInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن حفظ وتعديل ملف بيانات المؤسسة أثناء تفعيل وضع القراءة فقط.');
      return;
    }
    if (!isAdmin) {
      alert('⚠️ عذراً، يجب أن تمتلك صلاحية مدير النظام لحفظ الملف الإعدادي المؤسسي.');
      return;
    }
    setAppSettings({
      ...appSettings,
      institution: {
        name: instName,
        logoText: instLogoText,
        phone: instPhone,
        address: instAddress,
        currency: 'ر.ي'
      }
    });
    alert('✅ تم حفظ بيانات المؤسسة بنجاح وتحديث ترويسة الكشوفات.');
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن إضافة بنود قيود مخصصة أثناء تفعيل وضع القراءة فقط.');
      return;
    }
    const typed = newType.trim();
    if (!typed) return;
    if (customCategories.includes(typed)) {
      alert('البند متاح ومدرج مسبقاً.');
      return;
    }
    setCustomCategories([...customCategories, typed]);
    setNewType('');
  };

  const handleDeleteCustomCategory = (cat: string) => {
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن حذف البند أثناء تفعيل وضع القراءة فقط.');
      return;
    }
    if (window.confirm(`هل ترغب في تعطيل وحذف بند الصرف "${cat}" من القيود المخصصة؟`)) {
      setCustomCategories(customCategories.filter(item => item !== cat));
    }
  };

  // Database Backup (تصدير قاعدة البيانات)
  const handleExportDatabase = async () => {
    const backupPayload = {
      system: 'Amin Al-Shaibani Finance Core v3.0',
      exportedAt: new Date().toISOString(),
      employees,
      transactions,
      customCategories,
      appSettings
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const formattedDate = new Date().toISOString().slice(0, 10);
    const fileName = `نسخة_احتياطية_الشيباني_${formattedDate}.json`;

    if (isNativeCapacitor()) {
      await saveAndShareBackup(jsonString, fileName);
    } else {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  // Handle Drag / Drop events for DB Restore
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processImportedFile = (file: File) => {
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن استيراد قاعدة البيانات أو استعادتها أثناء تفعيل وضع القراءة فقط.');
      return;
    }
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = JSON.parse(e.target?.result as string);
        
        // Assert schema matching
        if (jsonContent.employees && jsonContent.transactions) {
          // Success load
          setEmployees(jsonContent.employees);
          setTransactions(jsonContent.transactions);
          if (jsonContent.customCategories) {
            setCustomCategories(jsonContent.customCategories);
          }
          if (jsonContent.appSettings) {
            setAppSettings(jsonContent.appSettings);
            setInstName(jsonContent.appSettings.institution.name);
            setInstPhone(jsonContent.appSettings.institution.phone);
            setInstAddress(jsonContent.appSettings.institution.address);
            setInstLogoText(jsonContent.appSettings.institution.logoText);
          }
          setRestoreMessage({
            type: 'success',
            text: `✅ تم استيراد واستعادة قاعدة البيانات بنجاح! تم تحميل (${jsonContent.employees.length}) سجل موظفين و (${jsonContent.transactions.length}) حركات دفترية مقيدة.`
          });
        } else {
          throw new Error('الملف لا يحتوي على البيانات المحاسبية المتوافقة مع النظام.');
        }
      } catch (err: any) {
        setRestoreMessage({
          type: 'err',
          text: `❌ خطأ في ترميز الملف: ${err?.message || 'يتطلب تحميل ملف نسخة احتياطية صالح بامتداد .json'}`
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImportedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImportedFile(e.target.files[0]);
    }
  };

  const handleTogglePermission = (roleId: RoleCode, permissionKey: keyof RolePermissions) => {
    if (!isAbsoluteOwner()) {
      alert('⚠️ عذراً، لا تمتلك الصلاحية الكافية لإعادة هيكلة وضبط صلاحيات المجموعات. هذه صلاحية المالك الحصري.');
      return;
    }
    const updated = { ...rolesConfig };
    updated[roleId].permissions[permissionKey] = !updated[roleId].permissions[permissionKey];
    setRolesConfigState(updated);
    saveRolesConfig(updated);
    addAuditLog('تعديل معايير الصلاحيات', updated[roleId].name, `تم تبديل صلاحية [ ${permissionKey} ] إلى الوضع [ ${updated[roleId].permissions[permissionKey] ? 'مفعل' : 'ملغي'} ]`);
  };

  const handleSessionRoleChange = (newRole: string) => {
    localStorage.setItem('amin_sh_active_role', newRole);
    setSessionRole(newRole);
    addAuditLog('تجسيد صلاحيات الدور الحركي للجلسة', 'صلاحيات النظام', `تم الانتقال وتجسيد صلاحيات الدور المحاسبي الجديد: ${newRole}`);
    alert(`🔄 تم نقل صلاحيتك الحالية في الجلسة بنجاح إلى: (${newRole}). \nكافة شاشات الإدخال والتصفح والتقارير ستتعامل معك طبقاً لصلاحيات هذا الدور الآن.`);
    // Force simple navigation refresh to enforce rules on rendering sidebar and locks
    window.location.reload();
  };

  const handleToggleMonthLock = (month: string) => {
    if (!isAbsoluteOwner()) {
      alert('⚠️ عذراً، إلغاء تجميد الحسابات أو إغلاقها يحتاج إلى صلاحية المالك الحصري لضمان سلامة الدفاتر.');
      return;
    }
    const isLocked = lockedMonths.includes(month);
    let updated;
    if (isLocked) {
      updated = lockedMonths.filter(m => m !== month);
      addAuditLog('فك إقفال حسابات شهري', month, `تم فتح الشهر ${month} مجدداً لاستقبال الحركات والعمليات المالية والرواتب.`);
      alert(`🔓 تم فك الإقفال والدفاتر لشهر ${month} بنجاح. العمليات متاحة للمعدلين حالياً.`);
    } else {
      updated = [...lockedMonths, month];
      addAuditLog('إقفال حسابات شهري', month, `تم قفل الدفاتر وإغلاق فترة عمليات شهر ${month} لحماية السجلات.`);
      alert(`🔒 تم إقفال حسابات شهر ${month} تماماً. تم تجميد حركة هذا الشهر ضد أي تعديل أو مساس.`);
    }
    setLockedMonths(updated);
    localStorage.setItem('amin_sh_locked_months', JSON.stringify(updated));
  };

  const handleAddMonthToLock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthInput.match(/^\d{4}-\d{2}$/)) {
      alert('الرجاء إدخال صيغة صحيحة للشهر، مثال: YYYY-MM (2026-06)');
      return;
    }
    if (lockedMonths.includes(newMonthInput)) {
      alert('هذا الشهر مضاف مسبقاً في قائمة التصفية.');
      return;
    }
    handleToggleMonthLock(newMonthInput);
    setNewMonthInput('');
  };

  const handleCreateManualSnapshot = () => {
    const snap = createLocalSnapshot('manual', 'نسخة مستقطعة يدوية من مركز حماية وضبط النظام');
    if (snap) {
      setSnapshotList(getLocalSnapshots());
      alert(`✅ تم إنشاء نقطة استعادة يدوية بنجاح! تم تضمين (${snap.employeesCount}) موظفين و(${snap.transactionsCount}) حركات مالية.`);
    } else {
      alert('❌ فشل إنشاء نقطة استعادة.');
    }
  };

  const handleRestoreSnapshotClick = (snap: BackupSnapshot) => {
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن استعادة السجلات أثناء تفعيل وضع القراءة فقط لحماية الملفات.');
      return;
    }
    if (window.confirm(`⚠️ تحذير صارم: هل أنت متأكد من رغبتك في استعادة قاعدة بيانات النظام بالكامل إلى نقطة الاستعادة المؤرخة بـ (${new Date(snap.timestamp).toLocaleString()})؟ \nسيؤدي هذا إلى الكتابة فوق السجلات النشطة الحالية بالبيانات التاريخية المسترجعة بالكامل.`)) {
      try {
        const payload = JSON.parse(snap.payload);
        const res = restoreSystemFromPayload(payload);
        if (res.success) {
          setEmployees(payload.employees || []);
          setTransactions(payload.transactions || []);
          alert(res.message);
          setSnapshotList(getLocalSnapshots());
          setAuditList(getAuditLogs());
        } else {
          alert('❌ فشلت الاستعادة المنهجية: ' + res.message);
        }
      } catch (err: any) {
        alert('❌ فشل فك بيانات الترميز للنسخة: ' + err?.message);
      }
    }
  };

  const handleClearAuditLogsClick = () => {
    if (!isAbsoluteOwner()) {
      alert('⚠️ عذراً، تفريغ أرشيف التدقيق الأمني هي صلاحية المالك الحصري فقط.');
      return;
    }
    if (window.confirm('⚠️ تحذير التدقيق: هل أنت متأكد من رغبتك في مسح كافة سجلات الأنشطة (Audit Logs) وتفريغ الأرشيف نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) {
      clearAuditLogs();
      setAuditList([]);
      addAuditLog('تصفير سجل التدقيق', 'سجل الرقابة', 'تم تصفير وتفريع أرشيف الأنشطة كلياً بواسطة المالك.');
      alert('🧹 تم مسح سجل التدقيق بالكامل وتحديث اللوحة.');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const filteredLogs = auditList.filter(log => {
    const q = searchAuditQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      log.username.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.role.toLowerCase().includes(q)
    );
  }).reverse();

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">إعدادات النظام وإدارة البيانات</h2>
        <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">إدارة النسخ الاحتياطية الدورية للمتجر، مواءمة بنود الإيرادات وعناصر الصلاحية المحاسبية.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-850 pb-1">
        <button
          type="button"
          onClick={() => setSettingsTab('standard')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg flex items-center gap-1.5 cursor-pointer ${
            settingsTab === 'standard'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/5 dark:bg-zinc-800/10'
              : 'border-transparent text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50'
          }`}
        >
          <Database size={14} />
          <span>إعدادات المؤسسة وبنود الحسابات</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSettingsTab('system_management');
            setSnapshotList(getLocalSnapshots());
            setAuditList(getAuditLogs());
          }}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 rounded-t-lg flex items-center gap-1.5 cursor-pointer ${
            settingsTab === 'system_management'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/5 dark:bg-zinc-800/10'
              : 'border-transparent text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50'
          }`}
        >
          <Shield size={14} className="text-emerald-500" />
          <span>🛡️ لوحة الرقابة وإدارة النظام (إصدار 3.0)</span>
        </button>
      </div>

      {/* Standard Settings Tab */}
      {settingsTab === 'standard' && (
        <>
          {/* Read-Only Mode Toggle Card */}
          <div className={`p-5 rounded-2xl border transition-all ${
            isReadOnly 
              ? 'bg-amber-500/10 dark:bg-amber-500/5 border-amber-500/30 text-amber-900 dark:text-amber-400' 
              : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-white pb-5 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl mt-0.5 ${isReadOnly ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'}`}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold flex items-center gap-2">
                    <span>وضع القراءة فقط المانع للتعديل (Read-Only Mode)</span>
                    {isReadOnly && (
                      <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">نشط ومحمي</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    عند تفعيل هذا الخيار يتم قفل الأزرار وحقول الإدخال عبر كافة شاشات وأقسام النظام، مما يقلل احتمالية حدوث أي خطأ بشري أثناء فحص السجلات أو الاستعراض لغير المختصين.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">{isReadOnly ? 'مقفل بالكامل' : 'مفتوح للعمليات'}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAdmin) {
                      alert('⚠️ عذراً، يجب أن تمتلك صلاحية مدير النظام لتغيير خيار وضع القراءة فقط.');
                      return;
                    }
                    const nextVal = !isReadOnly;
                    setAppSettings({
                      ...appSettings,
                      readonlyMode: nextVal
                    });
                    if (nextVal) {
                      alert('🛡️ تم تفعيل وضع القراءة فقط. كافة أقسام النظام ومستندات الموظفين مقفلة حالياً ضد أي تعديل.');
                    } else {
                      alert('🔓 تم إلغاء تفعيل وضع القراءة فقط. النظام جاهز مجدداً لتسجيل السندات.');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isReadOnly ? 'bg-amber-500' : 'bg-slate-200 dark:bg-zinc-800'
                  } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-250 ease-in-out ${
                      isReadOnly ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left column (Institution configurations) */}
            <div className="space-y-6">
              
              {/* Institution Setup */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-4">
                  <Building2 size={16} className="text-indigo-500" />
                  <span>تحديث ملف وبيانات المؤسسة التجارية</span>
                </h3>

                <form onSubmit={handleSaveInstitution} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 mb-1">اسم المنشأة / المحل</label>
                      <input
                        type="text"
                        value={instName}
                        onChange={(e) => setInstName(e.target.value)}
                        placeholder="مجموعة الشيباني للتجارة"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700/85 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={isReadOnly || !isAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 mb-1">الختم الحرفي المختصر (للشعار)</label>
                      <input
                        type="text"
                        value={instLogoText}
                        onChange={(e) => setInstLogoText(e.target.value)}
                        placeholder="أ.ش"
                        maxLength={3}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700/85 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-bold"
                        disabled={isReadOnly || !isAdmin}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 mb-1">هاتف التواصل العام</label>
                      <input
                        type="text"
                        value={instPhone}
                        onChange={(e) => setInstPhone(e.target.value)}
                        placeholder="777112233"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700/85 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        disabled={isReadOnly || !isAdmin}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 dark:text-zinc-500 mb-1">العنوان والمقر للمكتب</label>
                      <input
                        type="text"
                        value={instAddress}
                        onChange={(e) => setInstAddress(e.target.value)}
                        placeholder="الجمهورية اليمنية، صنعاء"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700/85 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={isReadOnly || !isAdmin}
                      />
                    </div>
                  </div>

                  {isAdmin ? (
                    <button
                      type="submit"
                      disabled={isReadOnly}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer active:scale-95 transition-all text-center pr-3 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Save size={14} />
                      <span>{isReadOnly ? 'وضع القراءة فقط مفعل' : 'حفظ وتعميد البيانات'}</span>
                    </button>
                  ) : (
                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                      * يرجى تبديل صلاحيات المستخدم إلى (مدير النظام Admin) لتفعيل تعديل إطارات العروض الرسمية.
                    </p>
                  )}
                </form>
              </div>

              {/* Theme primary color customization */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-4">
                  <Palette size={16} className="text-indigo-500" />
                  <span>تخصيص ثيم المظهر واللون الأساسي للتطبيق</span>
                </h3>

                <div className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                    اختر لون الهوية الأساسي للمنشأة لتخصيص محاور التبويبات، الأزرار، الكشوفات، الرسوم البيانية، ونظام الملاحة بالكامل في ثوانٍ.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'indigo', name: 'الأزرق الملكي', colorClass: 'bg-indigo-600' },
                      { id: 'emerald', name: 'الأخضر النبيل', colorClass: 'bg-emerald-600' },
                      { id: 'blue', name: 'الأزرق الكوني', colorClass: 'bg-blue-600' },
                      { id: 'violet', name: 'البنفسجي الجذاب', colorClass: 'bg-violet-600' },
                      { id: 'teal', name: 'الفيروزي المحاسبي', colorClass: 'bg-teal-600' },
                      { id: 'amber', name: 'الذهبي الدافئ', colorClass: 'bg-amber-500' },
                      { id: 'rose', name: 'الوردي المخملي', colorClass: 'bg-rose-600' },
                    ].map((color) => {
                      const isSelected = appSettings.primaryColor === color.id;
                      return (
                        <button
                          key={color.id}
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            if (isReadOnly) {
                              alert('⚠️ عذراً، لا يمكن تخصيص اللون أثناء وضع القراءة فقط.');
                              return;
                            }
                            if (!isAdmin) {
                              alert('⚠️ عذراً، يجب أن تمتلك صلاحية مدير النظام لتغيير ثيم اللون للرئيسية.');
                              return;
                            }
                            setAppSettings({
                              ...appSettings,
                              primaryColor: color.id
                            });
                          }}
                          className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/15 dark:bg-indigo-950/10 shadow-xs font-bold'
                              : 'border-slate-150 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                          } ${(isReadOnly || !isAdmin) ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${color.colorClass} ring-2 ring-white dark:ring-zinc-900 shadow-xs flex-shrink-0`} />
                          <span className="text-[11px] truncate">{color.name}</span>
                          {isSelected && (
                            <span className="absolute top-1.5 left-2 w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!isAdmin && (
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/40 dark:border-amber-900/20 rounded-xl flex items-center gap-2 mt-2">
                      <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-normal">
                        تغيير اللون الأساسي من الصلاحيات الإدارية لمدير النظام حصراً لرفع استقرار مظهر الكشوف المشتركة.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Roles specifications guide card */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-3">
                  <Users size={16} className="text-indigo-500" />
                  <span>دليل جدار الحماية والصلاحيات للمجموعات</span>
                </h3>
                
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-400">
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-zinc-800/40 items-center">
                    <span className="font-bold text-slate-900 dark:text-white">👑 مالك النظام الفائق (Owner)</span>
                    <span className="text-[10px] bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-bold">تحكم كلي ومطلق</span>
                  </div>
                  <p className="text-[11px] leading-relaxed mr-2">صلاحية لضبط الهيكل الإداري، الحذف النهائي للسجلات، قفل وفك الأشهر، وإدارة أرشيف التحقق.</p>
                  
                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-zinc-800/40 items-center mt-3">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">📊 محاسب المنشأة (Accountant)</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 font-bold">سندات وحسابات</span>
                  </div>
                  <p className="text-[11px] leading-relaxed mr-2">صلاحية تامة لتسجيل الحركات المالية، والرواتب، ودفتر اليومية. يُمنع من الحذف النهائي أو فك قفل الفترات المغلقة.</p>

                  <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-zinc-800/40 items-center mt-3">
                    <span className="font-bold text-teal-750 dark:text-teal-400">📝 مدخل بيانات (Data Entry)</span>
                    <span className="text-[10px] bg-teal-50 text-teal-700 rounded px-1.5 py-0.5 font-bold">إدخال محدود</span>
                  </div>
                  <p className="text-[11px] leading-relaxed mr-2">صلاحية لإضافة الموظفين وتدوين بيانات المعاملات. يُحظر عليه تعديل المبالغ أو الرواتب أو فحص حركات الأرشيف المالي الأعلى.</p>
                </div>
              </div>

            </div>

            {/* Right column (Backups & Categories) */}
            <div className="space-y-6">
              
              {/* Databases Export/Restore backups */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-2">
                  <Database size={16} className="text-indigo-500" />
                  <span>إجراءات النسخ الاحتياطي ومزامنة الملفات</span>
                </h3>

                {/* Success/Error indicator */}
                {restoreMessage && (
                  <div className={`p-3 rounded-lg text-xs font-bold border flex items-center gap-2 ${
                    restoreMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950' 
                      : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-950'
                  }`}>
                    <FileCheck2 size={16} />
                    <span>{restoreMessage.text}</span>
                  </div>
                )}

                {/* Direct Export anchor */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleExportDatabase}
                    className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all text-center flex-1"
                    title="تحميل السجل بالكامل كملف JSON"
                  >
                    <Download size={14} />
                    <span>تحميل واستخراج قاعدة البيانات (.JSON)</span>
                  </button>
                </div>

                {/* Drag and Drop Restore element */}
                <div className="space-y-2">
                  <span className="block text-2xs font-extrabold text-slate-400 dark:text-zinc-500">استيراد واستعادة كشوف قاعدة البيانات</span>
                  
                  <div
                    onDragEnter={isReadOnly ? undefined : handleDrag}
                    onDragOver={isReadOnly ? undefined : handleDrag}
                    onDragLeave={isReadOnly ? undefined : handleDrag}
                    onDrop={isReadOnly ? undefined : handleDrop}
                    onClick={isReadOnly ? undefined : triggerFileSelect}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isReadOnly 
                        ? 'border-slate-200 bg-slate-50/50 dark:bg-zinc-900/50 opacity-50 cursor-not-allowed'
                        : dragActive 
                          ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/15 cursor-pointer' 
                          : 'border-slate-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-slate-50/30 cursor-pointer'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    
                    <Upload size={24} className="text-slate-400 animate-pulse" />
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">اسحب ملف النسخة الاحتياطية هنا، أو انقر للتصفح</p>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">يقبل فقط ملفات التشفير الرسمية بامتداد .json المنزلة من النظام سابقاً.</span>
                  </div>
                </div>
              </div>

              {/* Categories configuration list */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-4">
                  <PlusCircle size={16} className="text-indigo-500" />
                  <span>إدارة أنواع وبنود القيود المعرفة من المستخدم</span>
                </h3>

                {/* Category Quick add */}
                <form onSubmit={handleAddCustomCategory} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder={isReadOnly ? "وضع القراءة فقط مفعل" : "مثال: قسط ملابس المدارس"}
                    disabled={isReadOnly}
                    className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isReadOnly}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs py-1.5 px-4 rounded-xl cursor-pointer"
                  >
                    أضف بنداً
                  </button>
                </form>

                <span className="block text-2xs font-bold text-slate-400 mb-2">البنود المضافة حالياً:</span>
                
                <div className="flex flex-wrap gap-2">
                  {customCategories.map(cat => (
                    <div key={cat} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-400 font-semibold select-none group">
                      <span>{cat}</span>
                      <button
                        type="button"
                        disabled={isReadOnly}
                        onClick={() => handleDeleteCustomCategory(cat)}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:hover:text-red-500 rounded transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}

                  {customCategories.length === 0 && (
                    <p className="text-2xs text-slate-400 italic">لا توجد بنود صرف مخصصة. يمكنك إضافتها عبر المربع بالأعلى لتتوفر في شاشات الإدخال.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        </>
      )}

      {/* System Management Dashboard Tab */}
      {settingsTab === 'system_management' && (
        <div className="space-y-6">
          
          {/* Top Info Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
            <Shield className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">لوحة حماية النظام والتدقيق الأمني والعمليات الموصدة</h3>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 mt-1 leading-normal">
                مرحباً بك في مركز الإدارة الموحد للإصدار الثالث من نظام أمين الشيباني المالي. تم تصميم هذه اللوحة لتوفير جدار رقابة كلي لحماية البيانات الحساسة وأرشفة المعاملات، تتبع أنشطة المحاسبين والمدخلين، وتقييد الفترات المحاسبية وإدارتها دون الحاجة للاتصال بالإنترنت مطلقاً.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Permissions & Emulation Panel */}
            <div className="space-y-6">
              
              {/* Group Permissions Config Card */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sliders size={16} className="text-indigo-600" />
                    <span>إرساء وصياغة صلاحيات المجموعات الإدارية</span>
                  </h3>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                    قواعد مخصصة
                  </span>
                </div>

                <p className="text-2xs text-slate-400 dark:text-zinc-500 leading-normal">
                  بصفتك المالك الحقيقي للنظام، يمكنك تفعيل أو حظر أي صلاحية فرعية عبر المجموعات المحاسبية بمجرد النقر على المعايير أدناه.
                </p>

                {/* Roles Code Buttons Row */}
                <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-zinc-850 p-1.5 rounded-xl">
                  {(Object.keys(rolesConfig) as RoleCode[]).map((rcode) => {
                    const r = rolesConfig[rcode];
                    const isSel = activeRoleConfig === rcode;
                    return (
                      <button
                        key={rcode}
                        type="button"
                        onClick={() => setActiveRoleConfig(rcode)}
                        className={`flex-1 px-2.5 py-1.5 rounded-lg text-center text-xs font-bold transition-all cursor-pointer ${
                          isSel
                            ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs border-b border-indigo-200 dark:border-zinc-700'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50'
                        }`}
                      >
                        <span>{r.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Permissions checkboxes grid of active config */}
                {activeRoleConfig && rolesConfig[activeRoleConfig] && (
                  <div className="bg-slate-50/50 dark:bg-zinc-850/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100/50 dark:border-zinc-800/40">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-zinc-300">
                        صلاحيات {rolesConfig[activeRoleConfig].name}:
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        معرفة بـ {Object.values(rolesConfig[activeRoleConfig].permissions).filter(Boolean).length} / 9 صلاحيات
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-3xs">
                      {([
                        { key: 'employees', title: 'تصفح وطلب ملفات الموظفين' },
                        { key: 'transactions', title: 'إدخال القيود المالية وتصفح المذكرات' },
                        { key: 'audit', title: 'فحص وفلترة كشوف التدقيق الأمني' },
                        { key: 'archive', title: 'أرشفة الموظفين والعمليات والجمعيات' },
                        { key: 'permanent_delete', title: 'الحذف النهائي الدائم للموظفين/القيود' },
                        { key: 'backup_restore', title: 'استعادة النسخ والباك آب والترميم' },
                        { key: 'workspace', title: 'تعديل مساحات العمل واللوحات الفرعية' },
                        { key: 'associations', title: 'إدارة وتأسيس الجمعيات وأقساط الأعضاء' },
                        { key: 'add', title: 'حفظ وتحديث السجلات الكلية للمؤسسة' }
                      ] as { key: keyof RolePermissions, title: string }[]).map((pitem) => {
                        const val = rolesConfig[activeRoleConfig].permissions[pitem.key];
                        return (
                          <button
                            key={pitem.key}
                            type="button"
                            onClick={() => handleTogglePermission(activeRoleConfig, pitem.key)}
                            className={`flex items-center justify-between p-2 rounded-lg border text-right transition-all cursor-pointer ${
                              val
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                                : 'bg-slate-50 border-slate-150 dark:bg-zinc-900/50 dark:border-zinc-805 text-slate-400'
                            }`}
                          >
                            <span className="text-[11px] font-semibold">{pitem.title}</span>
                            <div className={`p-0.5 rounded ${val ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700' : 'bg-slate-200 dark:bg-zinc-800 text-slate-400'}`}>
                              {val ? <Check size={12} /> : <X size={12} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {!isAbsoluteOwner() && (
                      <div className="text-center p-2 bg-amber-50 rounded-lg border border-amber-100 text-[10px] text-amber-700">
                        ⚠️ عرض فقط: لا يمكنك التعديل لعدم امتلاكك صلاحية مالك النظام الحقيقية.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Session Role Emulation Card */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-1">
                  <RefreshCcw size={16} className="text-emerald-500" />
                  <span>محاكاة وفحص صلاحيات الموظفين نشطة</span>
                </h3>

                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  تحتاج إلى اختبار كيف ستبدو واجهة المحاسب أو مدخل البيانات؟ يمكنك فوراً تجسيد هذا الدور للجلسة الحالية وعيش تجربة الموظف للتحقق من سلامة الأقفال وجدار الحماية:
                </p>

                <div className="flex gap-2 items-center bg-slate-50 dark:bg-zinc-850 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">الدور النشط للجلسة:</span>
                  <select
                    value={sessionRole}
                    onChange={(e) => handleSessionRoleChange(e.target.value)}
                    className="flex-1 text-xs font-bold leading-normal bg-white dark:bg-zinc-900 text-indigo-600 border border-slate-200 dark:border-zinc-750/90 rounded-lg p-1.5 focus:outline-none"
                  >
                    <option value="owner">👑 المالك الفائق (Owner)</option>
                    <option value="accountant">📊 محاسب المنشأة الرسمي</option>
                    <option value="entry">📝 مدخل ومقيد البيانات</option>
                    <option value="supervisor">🤝 مشرف وضابط الجمعيات بالقسم</option>
                    <option value="viewer">👁️ مستخدم عادي (للعرض والطباعة فقط)</option>
                  </select>
                </div>

                <div className="p-3 bg-indigo-50/10 border border-indigo-150/15 text-2xs text-indigo-700 dark:text-indigo-400 rounded-xl leading-normal">
                  * تنبيه: تدوير وتجسيد الأدوار يسهل تتبع الأمان. تذكر استعادة خيار (المالك الفائق Owner) لتستعيد كافة صلاحياتك الإدارية المعززة.
                </div>
              </div>

            </div>

            {/* Monthly Closing & Locks Center */}
            <div className="space-y-6">
              
              {/* Locked Months Card */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calendar size={16} className="text-amber-500" />
                    <span>📅 مركز إقفال حسابات الفترات والأشهر المحاسبية</span>
                  </h3>
                  <span className="text-2xs font-extrabold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded-full">
                    مغلق للعمليات
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal mb-2">
                  عند ترحيل رواتب الشهر أو إجراء الجرد الشهري، يوصى بقفل حركة الشهر بنجاح لمنع إقدام أي مستخدم آخر على تسجيل حركات تراجعية أو تعديل سلفيات قديمة لضمان الدقة وتفادي خلط الحسابات.
                </p>

                {/* Quick input field to add/lock new custom month value */}
                <form onSubmit={handleAddMonthToLock} className="flex gap-2 bg-slate-50 dark:bg-zinc-850 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800">
                  <input
                    type="text"
                    value={newMonthInput}
                    onChange={(e) => setNewMonthInput(e.target.value)}
                    placeholder="YYYY-MM (مثال: 2026-06)"
                    maxLength={7}
                    required
                    className="flex-1 text-center bg-white dark:bg-zinc-900 text-xs font-semibold px-2 py-1.5 placeholder-slate-400 text-slate-800 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-lg focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-605 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Lock size={12} />
                    <span>تأمين وقفل الشهر</span>
                  </button>
                </form>

                <span className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mt-2">الأشهر والشهور المغلقة محاسبياً حالياً:</span>

                <div className="space-y-1.5 pr-1 max-h-48 overflow-y-auto">
                  {lockedMonths.map((mcode) => (
                    <div key={mcode} className="flex justify-between items-center bg-slate-50 dark:bg-zinc-850 p-2 rounded-xl border border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <Lock className="text-amber-500" size={14} />
                        <span className="text-xs font-bold text-slate-805 dark:text-zinc-200 font-mono">{mcode}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold">
                          🔒 فترة مغلقة تماماً
                        </span>
                        {isAbsoluteOwner() ? (
                          <button
                            type="button"
                            onClick={() => handleToggleMonthLock(mcode)}
                            className="text-red-500 hover:text-red-650 hover:bg-red-50 text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer"
                          >
                            🔓 فك الإقفال المالي
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">محمي</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {lockedMonths.length === 0 && (
                    <div className="text-center p-4 bg-slate-50/50 dark:bg-zinc-850/10 rounded-xl">
                      <Unlock className="text-slate-350 mx-auto mb-1" size={18} />
                      <p className="text-2xs text-slate-400 italic">لا توجد أشهر مقفلة محاسبياً في الوقت الحالي. كافة الفترات والشهور مفتوحة ومتاحة للتقييد.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Core backup Snapshots Restoration list (سجل نقاط الاستعادة للنسخ الاحتياطي التلقائي واليدوي) */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Database size={16} className="text-indigo-600" />
                  <span>📥 أرشيف نقاط السجلات ومزامن النسخ الاحتياطي التلقائي (Snapshots)</span>
                </h3>
                <p className="text-2xs text-slate-500 dark:text-zinc-400 mt-1">يحتفظ النظام تلقائياً بنقاط استعادة مشفرة متطابقة عند تسجيل الدخول أو الخروج من حسابك.</p>
              </div>

              <button
                type="button"
                onClick={handleCreateManualSnapshot}
                className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95 transition-all text-center self-end sm:self-auto"
              >
                <PlusCircle size={14} />
                <span>💾 إنشاء نقطة استعادة يدوية حالاً</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-bold">
                    <th className="py-2.5 pr-2">تاريخ ووقت النسخ</th>
                    <th className="py-2.5 px-2">نوع نقطة الاستعادة</th>
                    <th className="py-2.5 px-2 text-center">الموظفين السجل</th>
                    <th className="py-2.5 px-2 text-center">القيود الدفترية</th>
                    <th className="py-2.5 px-2 text-center">سلامة الرمز الإحصائي</th>
                    <th className="py-2.5 pl-2 text-left">إجراء التعافي والترميم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-zinc-850">
                  {snapshotList.map((snap) => (
                    <tr key={snap.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-850/15">
                      <td className="py-3 pr-2 font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {new Date(snap.timestamp).toLocaleString('ar-YE', { hour12: true })}
                      </td>
                      <td className="py-3 px-2 font-semibold">
                        {snap.type === 'auto_login' && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-bold">
                            📥 تلقائي تسجيل دخول
                          </span>
                        )}
                        {snap.type === 'auto_logout' && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                            📤 تلقائي تسجيل خروج
                          </span>
                        )}
                        {snap.type === 'manual' && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                            💾 يدوي من التحكم
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-600 dark:text-zinc-400 font-mono">
                        {snap.employeesCount}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-400 font-mono">
                        {snap.transactionsCount}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black font-serif">
                          ✓ سليم (SHA1-OK)
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-left">
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshotClick(snap)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 mx-l-2"
                        >
                          <RotateCcw size={11} />
                          <span>فك وترميم السجلات</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {snapshotList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 dark:text-zinc-500 italic">
                        لا توجد نقاط نسخ احتياطي مسجلة محلياً في أرشيف السجلات حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Viewer Dashboard (سجل التدقيق والأنشطة كلياً) */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b border-slate-50 dark:border-zinc-800 pb-3 mb-1">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity size={16} className="text-purple-600" />
                  <span>📝 كشف التدقيق ومراجعة الأنشطة للعمليات الحساسة (Audit Log)</span>
                </h3>
                <p className="text-2xs text-slate-500 dark:text-zinc-400 mt-1">يتم تقييد وتسجيل كافة حركات التعديل والإدخال وفك الإقفال تلقائياً للتحقق والمحاسبة.</p>
              </div>

              {/* Log actions filters search field */}
              <div className="flex flex-col sm:flex-row gap-2 self-start md:self-auto w-full md:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchAuditQuery}
                    onChange={(e) => setSearchAuditQuery(e.target.value)}
                    placeholder="ابحث بالنظام، الموظف، المحاسب، أو المعيار..."
                    className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-850 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-750 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {isAbsoluteOwner() && (
                  <button
                    type="button"
                    onClick={handleClearAuditLogsClick}
                    className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-650 hover:text-red-750 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs border border-red-200/40"
                  >
                    <Trash2 size={12} />
                    <span>تصفير سجل الأنشطة</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable logs details box with custom formatted items */}
            <div className="overflow-y-auto max-h-96 pr-1 space-y-2 border border-slate-50 dark:border-zinc-850 rounded-xl p-3 bg-slate-50/25 dark:bg-zinc-900/10">
              {filteredLogs.map((log) => {
                const getActionColor = (act: string) => {
                  if (act.includes('حذف') || act.includes('إلغاء') || act.includes('تصفير')) return 'text-red-650 bg-red-500/5 border-red-500/20';
                  if (act.includes('إضافة') || act.includes('تسجيل') || act.includes('إنشاء')) return 'text-emerald-700 bg-emerald-500/5  border-emerald-500/20';
                  if (act.includes('تعديل') || act.includes('تحميل')) return 'text-indigo-600 bg-indigo-500/5 border-indigo-500/20';
                  return 'text-slate-700 bg-slate-500/5 border-slate-500/20';
                };

                return (
                  <div key={log.id} className="p-3 bg-white dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className={`px-2.5 py-1 rounded-lg border font-bold text-3xs flex-shrink-0 mt-0.5 ${getActionColor(log.action)}`}>
                        {log.action}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white">{log.target}</span>
                          <span className="text-3xs text-slate-400 font-bold">بواسطة</span>
                          <span className="font-semibold text-slate-600 dark:text-zinc-300">{log.username}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono font-black">{log.role}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{log.details}</p>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-400/80 font-mono font-bold flex-shrink-0 self-end sm:self-auto">
                      {new Date(log.timestamp).toLocaleString('ar-YE', { hour12: true })}
                    </div>
                  </div>
                );
              })}

              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic">
                  لا توجد سجلات مطابقة لمعايير الفلترة والتدقيق الحالية.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
