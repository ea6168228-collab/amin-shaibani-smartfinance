import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Archive, 
  ArchiveRestore,
  UserCheck,
  UserX,
  Phone,
  Calendar,
  DollarSign,
  AlertCircle,
  X,
  CheckCircle2,
  Coins,
  FileText,
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Printer,
  Scale
} from 'lucide-react';
import { Employee, UserRole, Transaction } from '../types';
import { addAuditLog } from '../utils/auditLogger';
import { hasSystemPermission, isAbsoluteOwner } from '../utils/permissions';
import { 
  computeEmployeeFinancialSummary, 
  calculateMonthlyStatsForSettlement, 
  MonthlySettlement, 
  EmployeeFinancialSummary 
} from '../utils/employeeFinance';

interface EmployeesViewProps {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  currentUserRole: UserRole;
  isReadOnly?: boolean;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
}

export default function EmployeesView({
  employees,
  setEmployees,
  currentUserRole,
  isReadOnly = false,
  transactions,
  setTransactions
}: EmployeesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'archived'>('active');
  
  // Custom smart sub-tabs
  const [subTab, setSubTab] = useState<'directory' | 'finance'>('directory');
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  
  // Monthly settlements state loaded from local storage
  const [settlements, setSettlements] = useState<MonthlySettlement[]>(() => {
    const cached = localStorage.getItem('amin_sh_monthly_settlements');
    return cached ? JSON.parse(cached) : [];
  });

  // Save settlements state automatically (offline)
  const saveSettlements = (updated: MonthlySettlement[]) => {
    setSettlements(updated);
    localStorage.setItem('amin_sh_monthly_settlements', JSON.stringify(updated));
  };

  // Settlement creation form modal states
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementYear, setSettlementYear] = useState<number>(new Date().getFullYear());
  const [settlementMonth, setSettlementMonth] = useState<number>(new Date().getMonth() + 1);
  const [settlementError, setSettlementError] = useState('');
  
  // Print PDF mapping state
  const [activePrintSettlement, setActivePrintSettlement] = useState<MonthlySettlement | null>(null);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    jobTitle: '',
    salary: 0,
    hireDate: new Date().toISOString().split('T')[0],
    phone: '',
    notes: ''
  });

  const [formError, setFormError] = useState('');

  // Permission Checks (granular Role-based access control layer)
  const canAddOrEdit = (hasSystemPermission('add') || hasSystemPermission('edit')) && !isReadOnly;
  const canDeleteOrArchive = hasSystemPermission('archive') && !isReadOnly;

  // Search and Filter logic
  const filteredEmployees = employees.filter(emp => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Active/Archived filter match
      const matchesStatus = 
        filterMode === 'all' ||
        (filterMode === 'active' && !emp.isArchived) ||
        (filterMode === 'archived' && emp.isArchived);
      return matchesStatus;
    }

    // Direct multi-factor match check across all parameters
    const matchesName = (emp.name || '').toLowerCase().includes(query);
    const matchesId = (emp.id || '').toLowerCase().includes(query);
    const matchesJob = (emp.jobTitle || '').toLowerCase().includes(query);
    const matchesPhone = (emp.phone || '').includes(query);
    const matchesNotes = emp.notes && (emp.notes || '').toLowerCase().includes(query);
    const matchesDate = (emp.hireDate || '').includes(query);
    const matchesSalary = (emp.salary || '').toString().includes(query);

    // Advanced search syntax support for numeric inequality (e.g., ">3000" or "3000<")
    let matchesAdvancedSalary = false;
    if (query.startsWith('>') || query.startsWith('<')) {
      const value = parseFloat(query.substring(1));
      if (!isNaN(value)) {
        if (query.startsWith('>')) {
          matchesAdvancedSalary = emp.salary > value;
        } else {
          matchesAdvancedSalary = emp.salary < value;
        }
      }
    }

    const matchesSearch = 
      matchesName || 
      matchesId || 
      matchesJob || 
      matchesPhone || 
      (matchesNotes ?? false) || 
      matchesDate || 
      matchesSalary ||
      matchesAdvancedSalary;

    // Active/Archived filter match
    const matchesStatus = 
      filterMode === 'all' ||
      (filterMode === 'active' && !emp.isArchived) ||
      (filterMode === 'archived' && emp.isArchived);

    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    if (!canAddOrEdit) {
      alert('⚠️ عذراً، لا تملك الصلاحية الكافية لإضافة موظف جديد.');
      return;
    }
    // Auto generate ID
    const nextNum = employees.length + 101;
    const generatedId = `EMP-${nextNum}`;

    setFormData({
      id: generatedId,
      name: '',
      jobTitle: '',
      salary: 3000,
      hireDate: new Date().toISOString().split('T')[0],
      phone: '',
      notes: ''
    });
    setFormError('');
    setModalType('add');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    if (!canAddOrEdit) {
      alert('⚠️ عذراً، لا تملك الصلاحية لتعديل بيانات الموظفين.');
      return;
    }
    setFormData({
      id: emp.id,
      name: emp.name,
      jobTitle: emp.jobTitle,
      salary: emp.salary,
      hireDate: emp.hireDate,
      phone: emp.phone,
      notes: emp.notes
    });
    setEditingEmployeeId(emp.id);
    setFormError('');
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن حفظ ملفات الموظفين أثناء وضع القراءة فقط لحماية البيانات.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('يرجى إدخال اسم الموظف كاملاً.');
      return;
    }
    if (!formData.jobTitle.trim()) {
      setFormError('يرجى تحديد وظيفة الموظف.');
      return;
    }
    if (formData.salary <= 0) {
      setFormError('الراتب الأساسي يجب أن يكون أكبر من الصفر.');
      return;
    }

    if (modalType === 'add') {
      // Check if ID already exists
      if (employees.some(emp => emp.id === formData.id)) {
        setFormError('رقم الموظف مكرر، يرجى تغيير الرقم.');
        return;
      }
      const newEmp: Employee = {
        id: formData.id,
        name: formData.name,
        jobTitle: formData.jobTitle,
        salary: Number(formData.salary),
        hireDate: formData.hireDate,
        phone: formData.phone,
        notes: formData.notes,
        isArchived: false
      };
      setEmployees([...employees, newEmp]);
      addAuditLog('إضافة موظف', formData.name, `تم تسجيل موظف جديد بمرتب قدره ${formData.salary} ر.ي ووظيفة ${formData.jobTitle}`);
    } else {
      // Edit mode
      setEmployees(employees.map(emp => 
        emp.id === editingEmployeeId 
          ? { 
              ...emp, 
              name: formData.name, 
              jobTitle: formData.jobTitle, 
              salary: Number(formData.salary), 
              hireDate: formData.hireDate, 
              phone: formData.phone, 
              notes: formData.notes 
            }
          : emp
      ));
      addAuditLog('تعديل موظف', formData.name, `تم تعديل وتحديث ملف الموظف ${formData.name}`);
    }
    setIsModalOpen(false);
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    if (isAbsoluteOwner()) {
      if (window.confirm(`⚠️ تنبيه المالك: هل أنت متأكد من رغبتك في حذف الموظف "${name}" نهائياً ومسح كافة حساباته؟ \nموافق = حذف نهائي، إلغاء = تحويل للأرشيف.`)) {
        setEmployees(employees.filter(emp => emp.id !== id));
        addAuditLog('حذف نهائي موظف', name, `تم حذف تفاصيل الموظف ${name} نهائياً بواسطة المالك.`);
        alert('✅ تم حذف الموظف نهائياً من السجلات.');
      } else {
        // Soft archive instead of delete
        setEmployees(employees.map(emp => 
          emp.id === id ? { ...emp, isArchived: true } : emp
        ));
        addAuditLog('أرشفة موظف', name, `تم أرشفة الموظف ${name} بدلاً من الحذف.`);
        alert('📥 تم أرشفة الموظف بنجاح (يمكنك استرجاعه في أي وقت).');
      }
    } else if (hasSystemPermission('archive')) {
      if (window.confirm(`⚠️ لا تمتلك صلاحية المالك الفائقة للحذف النهائي.\nسيتم أرشفة سجل الموظف "${name}" وتجميد وضعه بأمان.`)) {
        setEmployees(employees.map(emp => 
          emp.id === id ? { ...emp, isArchived: true } : emp
        ));
        addAuditLog('أرشفة موظف', name, `تمت أرشفة الموظف ${name} لنقص صلاحيات الحذف النهائي.`);
        alert('📥 تم إرسال الموظف إلى الأرشيف بنجاح.');
      }
    } else {
      alert('⚠️ صلاحياتك الحالية (محاسب / مستخدم عادي / مشرف) لا تسمح لك بالحذف أو الأرشفة للموظفين.');
    }
  };

  const toggleArchiveEmployee = (id: string) => {
    if (!hasSystemPermission('archive')) {
      alert('⚠️ عذراً، لا تمتلك الصلاحية الكافية لأرشفة أو فك أرشفة الموظفين.');
      return;
    }
    const targetEmp = employees.find(emp => emp.id === id);
    if (!targetEmp) return;
    const nextState = !targetEmp.isArchived;

    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, isArchived: nextState } : emp
    ));

    addAuditLog(
      nextState ? 'أرشفة موظف' : 'استرجاع موظف',
      targetEmp.name,
      `تم ${nextState ? 'أرشفة الموظف' : 'فك أرشفة واستعادة الموظف'} ${targetEmp.name}`
    );
    alert(nextState ? '📥 تم نقل الموظف إلى الأرشيف بنجاح.' : '📤 تم استرجاع الموظف بنجاح من الأرشيف.');
  };

  return (
    <div className="space-y-6">
      {/* View Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">إدارة ملفات وسجلات الموظفين</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">تعديل بيانات الرواتب وإضافة ملفات التعيين الجدد، أو أرشفة الموظفين المجمدة مستنداتهم.</p>
        </div>
        
        {canAddOrEdit && (
          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer self-start sm:self-auto font-sans"
          >
            <Plus size={16} />
            <span>تعريف موظف جديد</span>
          </button>
        )}
      </div>

      {/* Sub-view switcher tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-850 pb-px gap-1">
        <button
          onClick={() => setSubTab('directory')}
          className={`pb-3 px-5 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-2 min-h-[44px] ${
            subTab === 'directory'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
          }`}
        >
          <UserCheck size={15} />
          <span>دليل وسجلات الموظفين ({employees.length})</span>
        </button>
        <button
          onClick={() => {
            setSubTab('finance');
            if (employees.length > 0 && !selectedEmpId) {
              setSelectedEmpId(employees[0].id);
            }
          }}
          className={`pb-3 px-5 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-2 min-h-[44px] ${
            subTab === 'finance'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
          }`}
        >
          <Coins size={15} />
          <span>المركز المالي والتسويات الشهرية للرواتب</span>
        </button>
      </div>

      {subTab === 'directory' ? (
        <>
          {/* Control filters & Search Row - Smart Search Container */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-3 text-slate-400 dark:text-zinc-500" size={15} />
            <input
              type="text"
              placeholder="البحث الذكي (بالاسم، المعرف، الوظيفة، الهاتف، راتب >3000...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700/60 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tab-like Archive Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-zinc-800/80 rounded-xl self-start">
            <button
              onClick={() => setFilterMode('active')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'active'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <UserCheck size={14} />
                <span>النشطين ({employees.filter(e => !e.isArchived).length})</span>
              </span>
            </button>
            <button
              onClick={() => setFilterMode('archived')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'archived'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <UserX size={14} />
                <span>المؤرشفين ({employees.filter(e => e.isArchived).length})</span>
              </span>
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
              }`}
            >
              <span>الكل ({employees.length})</span>
            </button>
          </div>
        </div>

        {/* Smart Search Tips & Direct query helper pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-50 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-bold dark:text-zinc-500">مفاتيح تصفية سريعة:</span>
          {[
            { label: '🔍 الراتب > 4000', query: '>4000' },
            { label: '🔍 الراتب < 3000', query: '<3000' },
            { label: '📅 تعيين 2026', query: '2026' },
            { label: '👤 مهندس', query: 'مهندس' },
            { label: '💼 مدير', query: 'مدير' },
            { label: '📞 رقم هاتف', query: '07' }
          ].map((pill, idx) => (
            <button
              key={idx}
              onClick={() => setSearchQuery(pill.query)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer border ${
                searchQuery === pill.query
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-slate-50 border-slate-200/50 text-slate-500 hover:bg-slate-100 dark:bg-zinc-800 dark:border-zinc-700/50 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
          {searchQuery && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mr-auto">
              ✓ تم فرز {filteredEmployees.length} نتيجة مطابقة.
            </span>
          )}
        </div>
      </div>

      {/* Employees Directory List */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/70 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500 font-bold border-b border-slate-100 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3.5">رقم الموظف</th>
                <th className="px-4 py-3.5">الاسم الكامل</th>
                <th className="px-4 py-3.5">الوظيفة / المسمى</th>
                <th className="px-4 py-3.5 text-left">الراتب الأساسي</th>
                <th className="px-4 py-3.5">تاريخ التوظيف</th>
                <th className="px-4 py-3.5">رقم الهاتف</th>
                <th className="px-4 py-3.5 text-center">الحالة</th>
                <th className="px-4 py-3.5 text-center">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50 text-slate-700 dark:text-zinc-300">
              {filteredEmployees.map((emp) => (
                <tr 
                  key={emp.id} 
                  className={`hover:bg-slate-50/40 dark:hover:bg-zinc-800/10 transition-colors ${
                    emp.isArchived ? 'opacity-65 bg-slate-50/10 dark:bg-zinc-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-3.5 font-bold font-mono tracking-wider text-slate-900 dark:text-white">{emp.id}</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                    <div className="flex flex-col">
                      <span>{emp.name}</span>
                      {emp.notes && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal mt-0.5 line-clamp-1">{emp.notes}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium">{emp.jobTitle}</td>
                  <td className="px-4 py-3.5 text-left font-bold text-slate-950 dark:text-zinc-100 font-mono">
                    {emp.salary.toLocaleString()} ر.ي
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-500">{emp.hireDate}</td>
                  <td className="px-4 py-3.5 font-mono">
                    {emp.phone ? (
                      <a href={`tel:${emp.phone}`} className="flex items-center gap-1 justify-start hover:text-indigo-600 transition-colors">
                        <Phone size={10} className="text-slate-400" />
                        <span>{emp.phone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {emp.isArchived ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">مؤرشف</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">نشط</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800 p-1 rounded-lg">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        disabled={!canAddOrEdit}
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded transition-all disabled:opacity-30 disabled:hover:text-slate-500"
                        title="تعديل الموظف"
                      >
                        <Edit2 size={14} />
                      </button>

                      {/* Archive Button */}
                      <button
                        onClick={() => toggleArchiveEmployee(emp.id)}
                        disabled={!canDeleteOrArchive}
                        className={`p-1 rounded transition-all ${
                          emp.isArchived 
                            ? 'text-slate-500 hover:text-emerald-600' 
                            : 'text-slate-500 hover:text-amber-600'
                        } disabled:opacity-30`}
                        title={emp.isArchived ? "استعادة من الأرشيف" : "أرشفة الموظف"}
                      >
                        {emp.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        disabled={!canDeleteOrArchive}
                        className="p-1 text-slate-500 hover:text-red-600 rounded transition-all disabled:opacity-30"
                        title="حذف الموظف نهائياً"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 dark:text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={28} className="text-slate-300" />
                      <p className="font-medium text-xs">لم نجد أي موظف مطابق للبحث الحالي.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        /* Financial Sub-tab: Employee Portfolio & Smart Settlement Hub */
        <div className="space-y-6 animate-fadeIn">
          {/* Employee Selector Bar */}
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-205 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-black text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 whitespace-nowrap">
                <Coins size={18} className="text-indigo-650" />
                <span>الملف الشخصي للموظف:</span>
              </span>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="px-3.5 py-2 w-full sm:w-72 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-550"
              >
                <option value="">-- اختر موظف من السجلات --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} (رقم: {emp.id})</option>
                ))}
              </select>
            </div>
            
            {selectedEmpId && (
              <button
                onClick={() => {
                  setSettlementYear(new Date().getFullYear());
                  setSettlementMonth(new Date().getMonth() + 1);
                  setSettlementError('');
                  setIsSettlementModalOpen(true);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-slate-700 text-white transition-all rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer self-start sm:self-auto font-sans"
              >
                <Plus size={15} />
                <span>إنشاء تسوية شهرية جديدة</span>
              </button>
            )}
          </div>

          {(() => {
            const activeEmp = employees.find(e => e.id === selectedEmpId);
            if (!activeEmp) {
              return (
                <div className="p-12 text-center bg-white dark:bg-zinc-900 border rounded-2xl text-slate-400 font-bold text-xs">
                  الرجاء اختيار ملف موظف من القائمة أعلاه لعرض كشف الحساب والركائز المالية التلقائية.
                </div>
              );
            }

            const summary = computeEmployeeFinancialSummary(activeEmp.id, transactions);
            const empSettlements = settlements.filter(s => s.employeeId === activeEmp.id);

            return (
              <div className="space-y-6">
                {/* 1. المركز المالي للموظف */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3 gap-2 text-right">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Scale size={16} className="text-indigo-600" />
                        <span>المركز المالي الذكي للموظف: {activeEmp.name}</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">يتم احتساب وتحليل هذه المركزية المالية تلقائياً بالكامل من واقع سجل الحركات المعتمدة.</p>
                    </div>
                    
                    {/* حالة الموظف المالية */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold">الحالة المالية للموظف:</span>
                      <span className={`px-2.5 py-1 rounded text-[10px] font-black leading-normal ${
                        summary.status === 'due_to_them' 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-100/40' 
                          : summary.status === 'obligated' 
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 border border-rose-100/40' 
                          : 'bg-slate-50 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200'
                      }`}>
                        {summary.status === 'due_to_them' ? 'مستحق له (دائن)' : summary.status === 'obligated' ? 'عليه التزامات (مدين)' : 'متوازن'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-right">
                    {/* الرصيد الافتتاحي */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">الرصيد الافتتاحي</span>
                      <span className="text-xs font-black text-slate-700 dark:text-zinc-300 font-mono">0 ر.ي</span>
                    </div>

                    {/* إجمالي الرواتب */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">إجمالي الرواتب المصروفة</span>
                      <span className="text-xs font-black text-emerald-600 font-mono">{summary.totalSalaries.toLocaleString()} ر.ي</span>
                    </div>

                    {/* إجمالي السلف */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">إجمالي السلف</span>
                      <span className="text-xs font-black text-rose-600 font-mono">{summary.totalAdvances.toLocaleString()} ر.ي</span>
                    </div>

                    {/* إجمالي الخصومات */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">إجمالي الخصومات والغياب</span>
                      <span className="text-xs font-black text-red-650 font-mono">{summary.totalDeductions.toLocaleString()} ر.ي</span>
                    </div>

                    {/* إجمالي الأقساط */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">إجمالي الأقساط</span>
                      <span className="text-xs font-black text-orange-600 font-mono">{summary.totalInstallments.toLocaleString()} ر.ي</span>
                    </div>

                    {/* إجمالي المكافآت */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">إجمالي المكافآت والبدلات</span>
                      <span className="text-xs font-black text-teal-610 font-mono">{summary.totalBonuses.toLocaleString()} ر.ي</span>
                    </div>

                    {/* إجمالي العهد */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">إجمالي العهد المالية</span>
                      <span className="text-xs font-black text-slate-600 dark:text-slate-400 font-mono">{summary.totalCustody.toLocaleString()} ر.ي</span>
                    </div>

                    {/* إجمالي العهد المستردة */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800/60 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">العهد المستردة</span>
                      <span className="text-xs font-black text-sky-600 font-mono">{summary.totalCustodyReturn.toLocaleString()} ر.ي</span>
                    </div>

                    {/* صافي المستحق الحالي */}
                    <div className={`p-3 border rounded-xl col-span-2 flex flex-col justify-center ${
                      summary.netDue > 0 
                        ? 'bg-emerald-50/50 border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-900/30' 
                        : summary.netDue < 0
                        ? 'bg-rose-50/50 border-rose-250 dark:bg-rose-950/20 dark:border-rose-900/30'
                        : 'bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:border-zinc-700'
                    }`}>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-bold mb-0.5">صافي المستحق الحالي للراتب المصفّى</span>
                      <span className={`text-sm font-black font-mono ${
                        summary.netDue > 0 ? 'text-emerald-700 dark:text-emerald-400' : summary.netDue < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-zinc-400'
                      }`}>
                        {summary.netDue.toLocaleString()} ر.ي
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right">
                  {/* 2. آخر 10 حركات مالية */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 flex flex-col min-h-[350px]">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText size={15} className="text-indigo-600" />
                        <span>آخر 10 حركات مالية للموظف</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal font-mono">الدفتر التفصيلي المالي</span>
                    </h4>
                    
                    <div className="overflow-x-auto flex-1 mt-4">
                      {summary.lastTransactions.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs pb-10">
                          لا توجد أي حركات مالية مسجلة في هذا الملف.
                        </div>
                      ) : (
                        <table className="w-full text-right text-[11px] leading-relaxed">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-bold">
                              <th className="py-2">تاريخ القيد</th>
                              <th>نوع الحركة</th>
                              <th>التفاصيل والبيان</th>
                              <th className="text-left font-sans">مدين (-)</th>
                              <th className="text-left font-sans">دائن (+)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.lastTransactions.map((tx) => (
                              <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/40 dark:border-zinc-800/20 dark:hover:bg-zinc-800/10">
                                <td className="py-2.5 font-mono text-slate-550 whitespace-nowrap">{tx.date}</td>
                                <td className="font-bold text-indigo-650 dark:text-indigo-400">{tx.type}</td>
                                <td className="font-bold max-w-[140px] truncate" title={tx.statement}>{tx.statement}</td>
                                <td className="text-left font-mono text-red-600 font-bold">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</td>
                                <td className="text-left font-mono text-emerald-600 font-bold">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* 3. وحدة التسوية الشهرية الذكية */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-205 dark:border-zinc-800 flex flex-col min-h-[350px]">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp size={15} className="text-indigo-650" />
                        <span>نظام التسوية الشهرية الذكية والرقابة</span>
                      </span>
                      <span className="text-[10px] text-teal-600 font-bold">مسودات معتمدة</span>
                    </h4>
                    
                    <div className="overflow-x-auto flex-1 mt-4">
                      {empSettlements.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 font-bold text-xs pb-10">
                          <AlertCircle size={28} className="text-slate-300" />
                          <p>لا توجد تسويات مالية لهذا الموظف.</p>
                          <button
                            onClick={() => {
                              setSettlementYear(new Date().getFullYear());
                              setSettlementMonth(new Date().getMonth() + 1);
                              setSettlementError('');
                              setIsSettlementModalOpen(true);
                            }}
                            className="bg-slate-50 border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 py-1.5 px-3 rounded-lg text-2xs hover:bg-slate-100 transition-colors cursor-pointer text-indigo-650 font-bold"
                          >
                            + إنشاء مسودة تسوية فوراً
                          </button>
                        </div>
                      ) : (
                        <table className="w-full text-right text-[11px] leading-relaxed">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-bold">
                              <th className="py-2">الشهر/الفترة</th>
                              <th className="text-left font-sans">الأساسي</th>
                              <th className="text-left font-sans text-red-600">المستقطع</th>
                              <th className="text-left font-sans text-emerald-600">البدلات</th>
                              <th className="text-left font-sans text-indigo-650 dark:text-indigo-400">الصافي</th>
                              <th className="text-center">الحالة</th>
                              <th className="text-center">العمليات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empSettlements.map((s) => {
                              const totalDeductionsAll = s.totalAdvances + s.totalDeductions + s.totalInstallments;
                              const totalBonusesAll = s.totalBonuses + s.totalAllowances;
                              const isApproved = s.status === 'approved';

                              return (
                                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/40 dark:border-zinc-800/10">
                                  <td className="py-3 font-extrabold font-mono text-slate-700 dark:text-zinc-300">{s.year}/{s.month.toString().padStart(2, '0')}</td>
                                  <td className="text-left font-mono font-bold">{s.baseSalary.toLocaleString()}</td>
                                  <td className="text-left font-mono text-rose-600">-{totalDeductionsAll.toLocaleString()}</td>
                                  <td className="text-left font-mono text-emerald-600">+{totalBonusesAll.toLocaleString()}</td>
                                  <td className="text-left font-mono font-black text-slate-900 dark:text-white">{s.finalNet.toLocaleString()}</td>
                                  <td className="text-center">
                                    {isApproved ? (
                                      <span className="inline-flex flex-col items-center text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 px-1.5 py-0.5 rounded border border-emerald-100" title={`معتمد من: ${s.approvedBy} في ${s.approvedDate}`}>
                                        <span className="font-bold">مكتمل✓</span>
                                      </span>
                                    ) : (
                                      <span className="inline-block text-[9px] bg-slate-50 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded border border-slate-200">
                                        مسودة
                                      </span>
                                    )}
                                  </td>
                                  <td className="text-center">
                                    <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded">
                                      {/* Approve Action */}
                                      {!isApproved ? (
                                        <button
                                          onClick={() => {
                                            const confirmApp = confirm(`هل أنت متأكد من اعتماد تسوية رواتب شهر ${s.month}/${s.year} للموظف ${activeEmp.name}؟\nبعد الاعتماد، سيتم إقفال التسوية تزامناً مع منع التعديل لحماية السجل المالي.`);
                                            if (confirmApp) {
                                              const updated = settlements.map(item => {
                                                if (item.id === s.id) {
                                                  return {
                                                    ...item,
                                                    status: 'approved' as const,
                                                    approvedBy: localStorage.getItem('amin_sh_logged_user') || 'مسؤول النظام المالي',
                                                    approvedDate: new Date().toISOString().split('T')[0]
                                                  };
                                                }
                                                return item;
                                              });
                                              saveSettlements(updated);
                                              addAuditLog(
                                                'اعتماد ورواتب شهري',
                                                activeEmp.name,
                                                `رواتب وقفل شهر ${s.month}/${s.year} بمبلغ صافي ${s.finalNet.toLocaleString()} ر.ي`
                                              );
                                              alert('✓ تم اعتماد التسوية بصورة رسمية بنجاح.');
                                            }
                                          }}
                                          className="p-1 hover:text-emerald-600 rounded cursor-pointer"
                                          title="اعتماد التسوية والراتب بصورة نهائية"
                                        >
                                          <CheckCircle2 size={12} />
                                        </button>
                                      ) : (
                                        <Lock size={10} className="text-slate-400 mx-1" title="مقفلة ومعتمدة من المحاسبة" />
                                      )}

                                      {/* Print Action */}
                                      <button
                                        onClick={() => {
                                          setActivePrintSettlement(s);
                                        }}
                                        className="p-1 hover:text-indigo-600 text-slate-500 rounded cursor-pointer"
                                        title="عرض وطباعة السند بصيغة PDF"
                                      >
                                        <Printer size={12} />
                                      </button>

                                      {/* Delete Action (only permitted if draft or has special absolute role) */}
                                      {(!isApproved || currentUserRole === UserRole.ADMIN || isAbsoluteOwner()) ? (
                                        <button
                                          onClick={() => {
                                            const confirmDel = confirm(`هل أنت متأكد تماماً من حذف وإلغاء هذه التسوية للموظف؟`);
                                            if (confirmDel) {
                                              saveSettlements(settlements.filter(item => item.id !== s.id));
                                              addAuditLog('حذف تسوية', activeEmp.name, `تم إلغاء وحذف تسوية رواتب الموظف لشهر ${s.month}/${s.year}`);
                                            }
                                          }}
                                          className="p-1 text-slate-500 hover:text-red-500 rounded cursor-pointer"
                                          title="حذف القيد المالي"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* Employee CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg border border-slate-100 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {modalType === 'add' ? 'إضافة وتعريف موظف جديد بالنظام' : 'تعديل بيانات الملف الوظيفي'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEmployee} className="p-5 space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-bold leading-relaxed flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">رقم الموظف (تلقائي)</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                    placeholder="EMP-..."
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none"
                    disabled={modalType === 'edit'} // Lock ID edit to prevent constraints breaks
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    <span>تاريخ التوظيف</span>
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({...formData, hireDate: e.target.value})}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">الاسم الكامل للموظف</label>
                <input
                  type="text"
                  placeholder="مثال: أمين ناصر أحمد الشيباني"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* jobTitle */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">المسمى الوظيفي / المهنة</label>
                  <input
                    type="text"
                    placeholder="مثال: حارس مالي"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
                    <DollarSign size={12} className="text-slate-400" />
                    <span>الراتب الأساسي (ر.ي)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.salary || ''}
                    onChange={(e) => setFormData({...formData, salary: e.target.value === '' ? 0 : Number(e.target.value)})}
                    placeholder="00"
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-left"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1">
                  <Phone size={12} className="text-slate-400" />
                  <span>رقم الهاتف الجوال</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: 777123456"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">ملاحظات وشروط استثنائية للموظف</label>
                <textarea
                  placeholder="شروط الاستحقاق، طريقة سداد الأقساط، أو أي معلومات ضرورية أخرى..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-150 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                  <CheckCircle2 size={14} />
                  <span>{modalType === 'add' ? 'إضافة الموظف' : 'تأكيد التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Settlement Creation Modal */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md border border-slate-100 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between text-right">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp size={16} className="text-indigo-650" />
                <span>إصدار وإنشاء تسوية شهرية للراتب</span>
              </h3>
              <button onClick={() => setIsSettlementModalOpen(false)} className="text-slate-400 hover:text-slate-705 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>

            {(() => {
              const activeEmp = employees.find(e => e.id === selectedEmpId);
              if (!activeEmp) return null;

              // Pre-calculate on the fly for Year/Month Chosen
              const totals = calculateMonthlyStatsForSettlement(activeEmp, settlementYear, settlementMonth, transactions);
              const exists = settlements.some(s => s.employeeId === activeEmp.id && s.year === settlementYear && s.month === settlementMonth);

              const handleCreateSettlement = (e: React.FormEvent) => {
                e.preventDefault();
                if (exists) {
                  setSettlementError(`⚠️ عذراً، هذا الموظف لديه تسوية مسبقة ومسجلة بالفعل تحت فترة ${settlementMonth}/${settlementYear}.`);
                  return;
                }

                const newSettle: MonthlySettlement = {
                  id: `SET-${Date.now()}`,
                  employeeId: activeEmp.id,
                  employeeName: activeEmp.name,
                  year: settlementYear,
                  month: settlementMonth,
                  baseSalary: totals.baseSalary,
                  totalAdvances: totals.totalAdvances,
                  totalDeductions: totals.totalDeductions,
                  totalInstallments: totals.totalInstallments,
                  totalBonuses: totals.totalBonuses,
                  totalAllowances: totals.totalAllowances,
                  finalNet: totals.finalNet,
                  status: 'draft'
                };

                saveSettlements([newSettle, ...settlements]);
                setIsSettlementModalOpen(false);
                addAuditLog('إنشاء تسوية رواتب', activeEmp.name, `تم إنشاء مسودة تسوية للرواتب لشهر ${settlementMonth}/${settlementYear} بصافي مستحق ${totals.finalNet.toLocaleString()} ر.ي`);
                alert('✓ تم حفظ مسودة التسوية الشهرية بنجاح.');
              };

              return (
                <form onSubmit={handleCreateSettlement} className="p-5 space-y-4 text-right text-xs">
                  {settlementError && (
                    <div className="p-3 bg-red-50 text-red-755 rounded-lg text-xs font-bold leading-normal">
                      {settlementError}
                    </div>
                  )}

                  {exists && (
                    <div className="p-3 bg-amber-50 text-amber-705 rounded-lg text-xs font-bold leading-normal">
                      ⚠️ تنبيه: توجد تسوية مصدرة مسبقاً لهذه الفترة. تكرار التسويات قد يؤدي لارتباك محاسبي.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 mb-1 font-bold">الفترة الزمنية (السنة):</label>
                      <select 
                        value={settlementYear}
                        onChange={(e) => {
                          setSettlementYear(Number(e.target.value));
                          setSettlementError('');
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-805 border rounded font-mono font-bold text-center"
                      >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1 font-bold">الشهر المحاسبي:</label>
                      <select 
                        value={settlementMonth}
                        onChange={(e) => {
                          setSettlementMonth(Number(e.target.value));
                          setSettlementError('');
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-805 border rounded font-mono font-bold text-center"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m} ({new Date(0, m - 1).toLocaleString('ar-EG', { month: 'long' })})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-zinc-850 p-4 rounded-xl border space-y-2 border-slate-150">
                    <span className="font-black text-indigo-600 block border-b pb-1.5 mb-2">تقدير استحقاق الرواتب الذكي (للشهر):</span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">الراتب الأساسي للملف:</span>
                      <span className="font-bold underline text-slate-700 dark:text-zinc-300 font-mono">{totals.baseSalary.toLocaleString()} ر.ي</span>
                    </div>

                    <div className="flex items-center justify-between text-red-650">
                      <span className="text-slate-400">سلفيات الشهر المستقطعة:</span>
                      <span className="font-bold font-mono">-{totals.totalAdvances.toLocaleString()} ر.ي</span>
                    </div>

                    <div className="flex items-center justify-between text-red-500">
                      <span className="text-slate-400">خصميات / غيابات الشهر:</span>
                      <span className="font-bold font-mono">-{totals.totalDeductions.toLocaleString()} ر.ي</span>
                    </div>

                    <div className="flex items-center justify-between text-orange-605">
                      <span className="text-slate-400">أقساط السداد لهذا الشهر:</span>
                      <span className="font-bold font-mono">-{totals.totalInstallments.toLocaleString()} ر.ي</span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-600">
                      <span className="text-slate-400">المكافآت التقديرية الحالية:</span>
                      <span className="font-bold font-mono">+{totals.totalBonuses.toLocaleString()} ر.ي</span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-600">
                      <span className="text-slate-400">البدلات والمزايا المسجلة:</span>
                      <span className="font-bold font-mono">+{totals.totalAllowances.toLocaleString()} ر.ي</span>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between text-slate-900 dark:text-white font-black text-xs">
                      <span>الصافي الفعلي المستحق الحالي:</span>
                      <span className="font-mono underline decoration-indigo-505 decoration-2">{totals.finalNet.toLocaleString()} ر.ي</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button type="button" onClick={() => setIsSettlementModalOpen(false)} className="px-3.5 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 rounded">تراجع</button>
                    <button type="submit" disabled={exists} className="px-5 py-1.5 bg-indigo-600 disabled:opacity-50 text-white rounded font-black shadow-sm ">اصدار وحفظ كمسودة</button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 3. Printable PDF-Receipt Preview Modal */}
      {activePrintSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal actions panel */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-850 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5 leading-none">
                <Printer size={16} className="text-indigo-600 animate-pulse" />
                <span>معاينة مستند تسوية راتب موظف - PDF للطباعة المباشرة</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>طباعة فورية</span>
                </button>
                <button onClick={() => setActivePrintSettlement(null)} className="p-1 rounded hover:bg-slate-200">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Area content */}
            <div className="p-8 bg-white text-slate-900 text-xs text-right leading-relaxed space-y-6 print-area font-sans animate-fadeIn" id={`settlement-print-${activePrintSettlement.id}`}>
              {/* Header logo/institutional detail */}
              <div className="text-center space-y-2 border-b pb-4">
                <span className="text-indigo-600 font-extrabold tracking-wider text-sm block font-sans">مؤسسة أمين الشيباني للتجارة العامة</span>
                <span className="text-xs font-black text-slate-700 block">سند كشف تصفية وتسوية راتب شهري معتمد</span>
                <div className="text-[10px] text-slate-400 font-bold">تاريخ إصدار السند: {new Date().toLocaleDateString('ar-EG')} | رقم القيد: {activePrintSettlement.id}</div>
              </div>

              {/* Patient/Employee profile details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-450 block font-bold">اسم الموظف المستفيد:</span>
                  <span className="font-black text-xs">{activePrintSettlement.employeeName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block font-bold">رقم الملف الوظيفي:</span>
                  <span className="font-mono text-slate-650 font-bold">{activePrintSettlement.employeeId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block font-bold">الفترة المالية للتسوية:</span>
                  <span className="font-bold font-mono">شهر {activePrintSettlement.month} / سنة {activePrintSettlement.year}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block font-bold text-emerald-600">حالة الاعتماد المحاسبي:</span>
                  <span className="font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]">
                    {activePrintSettlement.status === 'approved' ? 'معتمدة وناجزة✓' : 'مسودة غير نهائية'}
                  </span>
                </div>
              </div>

              {/* Financial Sheet breakdown */}
              <div className="space-y-3.5">
                <span className="font-black text-indigo-700 block border-r-4 border-indigo-600 pr-2 pb-px text-right">البنود المالية وإجمالي الاستحقاقات والاستقطاعات:</span>
                <table className="w-full text-right border border-slate-200">
                  <thead className="bg-slate-50 font-bold">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-right">البند المالي والتبويب</th>
                      <th className="px-3 py-2 text-left">مستقطع (Debit -)</th>
                      <th className="px-3 py-2 text-left">مستحق (Credit +)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold font-mono text-right">
                    <tr>
                      <td className="px-3 py-2 font-bold text-right">الراتب الأساسي الشهري</td>
                      <td className="px-3 py-2 text-left font-mono">-</td>
                      <td className="px-3 py-2 text-left font-mono text-slate-900 font-bold">{activePrintSettlement.baseSalary.toLocaleString()} ر.ي</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-right">مكافآت التميز والتحفيز</td>
                      <td className="px-3 py-2 text-left font-mono">-</td>
                      <td className="px-3 py-2 text-left font-mono text-emerald-600">+{activePrintSettlement.totalBonuses.toLocaleString()} ر.ي</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-right">البدلات والمزايا والتعويضات</td>
                      <td className="px-3 py-2 text-left font-mono">-</td>
                      <td className="px-3 py-2 text-left font-mono text-emerald-600">+{activePrintSettlement.totalAllowances.toLocaleString()} ر.ي</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-right text-red-650">السلف والمستقطعات الخارجية</td>
                      <td className="px-3 py-2 text-left font-mono text-red-650">-{activePrintSettlement.totalAdvances.toLocaleString()} ر.ي</td>
                      <td className="px-3 py-2 text-left font-mono">-</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-right text-red-650">الخصميات والعقوبات والغياب</td>
                      <td className="px-3 py-2 text-left font-mono text-red-500">-{activePrintSettlement.totalDeductions.toLocaleString()} ر.ي</td>
                      <td className="px-3 py-2 text-left font-mono">-</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-right text-orange-600">الأقساط المجدولة المقتطعة تلقائياً</td>
                      <td className="px-3 py-2 text-left font-mono text-orange-600">-{activePrintSettlement.totalInstallments.toLocaleString()} ر.ي</td>
                      <td className="px-3 py-2 text-left font-mono">-</td>
                    </tr>
                    <tr className="bg-slate-50 border-t font-black">
                      <td className="px-3 py-2.5 text-indigo-700 text-right">الصافي النهائي المستحق للصرف الفعلي</td>
                      <td colSpan={2} className="px-3 py-2.5 text-left text-xs bg-indigo-50 font-mono text-indigo-700 underline underline-offset-4">
                        {activePrintSettlement.finalNet.toLocaleString()} ر.ي
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Verification & Approvals */}
              <div className="grid grid-cols-2 gap-8 pt-10 border-t">
                <div className="space-y-4">
                  <span className="font-bold text-slate-500 block">توقيع المستلم المالي (الموظف):</span>
                  <div className="h-10 border-b border-dashed border-slate-300 w-3/4"></div>
                  <span className="text-[10px] text-slate-400 block">أقر أنا الموظف أعلاه باستلامي كامل المبلغ المذكور بعد التصفية.</span>
                </div>
                <div className="space-y-4 text-left">
                  <span className="font-bold text-slate-500 block text-right">اعتماد وتوقيع الإدارة المالية:</span>
                  <span className="font-extrabold text-xs text-slate-700 block text-right">المعتمد: {activePrintSettlement.approvedBy || 'مسؤول النظام المالي الذكي'}</span>
                  <span className="text-[10px] text-slate-400 block text-right font-sans">التاريخ: {activePrintSettlement.approvedDate || new Date().toISOString().split('T')[0]}</span>
                  <div className="h-6 w-3/4 border-b border-dashed border-slate-300 mr-auto font-sans"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
