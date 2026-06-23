import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Copy, 
  Edit2, 
  Trash2, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calculator,
  AlertCircle,
  X,
  PlusCircle,
  HelpCircle,
  Coins,
  History
} from 'lucide-react';
import { Employee, Transaction, TransactionType, UserRole } from '../types';
import { addAuditLog } from '../utils/auditLogger';
import { hasSystemPermission, isAbsoluteOwner, isMonthLocked } from '../utils/permissions';

interface TransactionsLogViewProps {
  employees: Employee[];
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
  currentUserRole: UserRole;
  customCategories: string[];
  setCustomCategories: (categories: string[]) => void;
  isReadOnly?: boolean;
}

export default function TransactionsLogView({
  employees,
  transactions,
  setTransactions,
  currentUserRole,
  customCategories,
  setCustomCategories,
  isReadOnly = false
}: TransactionsLogViewProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Modal triggers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Quick custom category field
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'advance',
    statement: '',
    debit: 0,
    credit: 0,
    notes: ''
  });

  const [formError, setFormError] = useState('');

  // Permission Checks (granular Role-based authorization layers)
  const canModify = hasSystemPermission('transactions') && !isReadOnly;
  const isAdmin = isAbsoluteOwner() && !isReadOnly;

  // Sync Form Debit/Credit fields based on Type to prevent accounting mistakes
  useEffect(() => {
    // Auto-complete or assist debit/credit input based on transaction types
    const isDebitType = [
      TransactionType.ADVANCE, 
      TransactionType.THURSDAY_ADVANCE, 
      TransactionType.DEDUCTION, 
      TransactionType.ABSENCE, 
      TransactionType.INSTALLMENT,
      TransactionType.CUSTODY
    ].includes(formData.type as TransactionType);

    const isCreditType = [
      TransactionType.SALARY, 
      TransactionType.BONUS, 
      TransactionType.TRANSPORT, 
      TransactionType.HOUSING,
      TransactionType.CUSTODY_RETURN,
      TransactionType.FROZEN_DEBT
    ].includes(formData.type as TransactionType);

    if (isDebitType && formData.credit > 0) {
      setFormData(prev => ({ ...prev, credit: 0 }));
    } else if (isCreditType && formData.debit > 0) {
      setFormData(prev => ({ ...prev, debit: 0 }));
    }
  }, [formData.type]);

  // Handle Quick Custom category creation
  const handleAddCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newCustomCategoryInput.trim();
    if (!cleaned) return;
    if (customCategories.includes(cleaned)) {
      alert('هذا النوع مضاف مسبقاً في النظام.');
      return;
    }
    setCustomCategories([...customCategories, cleaned]);
    setFormData(prev => ({ ...prev, type: cleaned }));
    setNewCustomCategoryInput('');
    setIsAddingCustomType(false);
  };

  // Helper lists
  const defaultCategories: { value: string; label: string }[] = [
    { value: TransactionType.SALARY, label: 'راتب شهري (Credit)' },
    { value: TransactionType.ADVANCE, label: 'سلفة مالية (Debit)' },
    { value: TransactionType.THURSDAY_ADVANCE, label: 'سلفة الخميس (Debit)' },
    { value: TransactionType.INSTALLMENT, label: 'قسط شهري مستقطع (Debit)' },
    { value: TransactionType.DEDUCTION, label: 'خصمية وعقوبة (Debit)' },
    { value: TransactionType.ABSENCE, label: 'غياب أيام (Debit)' },
    { value: TransactionType.BONUS, label: 'مكافأة تميز (Credit)' },
    { value: TransactionType.TRANSPORT, label: 'بدل مواصلات (Credit)' },
    { value: TransactionType.HOUSING, label: 'بدل سكن (Credit)' },
    { value: TransactionType.CUSTODY, label: 'عهدة مالية (Debit)' },
    { value: TransactionType.CUSTODY_RETURN, label: 'استرداد عهدة (Credit)' },
    { value: TransactionType.EID_CLOTHES, label: 'ملابس العيد (Debit)' },
    { value: TransactionType.FROZEN_DEBT, label: 'مديونية مجمدة ومعدلة (Credit)' },
    { value: TransactionType.OTHER, label: 'مصروفات أخرى (Debit)' }
  ];

  const getCombinedCategories = () => {
    const list = [...defaultCategories];
    customCategories.forEach(cat => {
      // Avoid duplicate labels
      if (!list.some(item => item.value === cat)) {
        list.push({ value: cat, label: `${cat} (نوع مخصص)` });
      }
    });
    return list;
  };

  const getArabicTypeName = (type: string) => {
    const match = getCombinedCategories().find(item => item.value === type);
    return match ? match.label.split(' (')[0] : type;
  };

  // Compute chronologically calculated balances dynamically FOR THE SELECTED FILTER
  // If we filter, we want to view balances starting from employee's historical state.
  // Perfect chronological sorting is key to running balance.
  const getProcessedTransactions = () => {
    // Sort transactions chronologically
    const sorted = [...transactions].sort((a,b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.id.localeCompare(b.id);
    });

    // Compute running balance PER EMPLOYEE
    const empBalanceMap = new Map<string, number>();

    // We calculate balances based on Employee totals
    const withBalances = sorted.map(tx => {
      // Fetch employee basic salary if this is their first credit ever,
      // but in typical ledger, starting balance is 0, then credit adds and debit subtracts.
      // Let's use starting balance = 0, credit adds, debit subtracts.
      const prevBal = empBalanceMap.get(tx.employeeId) || 0;
      const currentBal = prevBal + (tx.credit || 0) - (tx.debit || 0);
      empBalanceMap.set(tx.employeeId, currentBal);
      
      return {
        ...tx,
        balance: currentBal
      };
    });

    // Finally apply filters
    return withBalances.filter(tx => {
      const matchesEmployeeFilter = selectedEmployeeId === 'all' || tx.employeeId === selectedEmployeeId;
      const matchesTypeFilter = typeFilter === 'all' || tx.type === typeFilter;
      
      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        return matchesEmployeeFilter && matchesTypeFilter;
      }

      // Check if employee match
      const emp = employees.find(e => e.id === tx.employeeId);
      const matchesEmpName = emp ? emp.name.toLowerCase().includes(query) : false;
      const matchesEmpId = tx.employeeId.toLowerCase().includes(query);

      // Check if type matches Arabic representation or English name
      const arabicType = getArabicTypeName(tx.type).toLowerCase();
      const matchesType = tx.type.toLowerCase().includes(query) || arabicType.includes(query);

      // Date match
      const matchesDate = tx.date.includes(query);

      // Statement & notes match
      const matchesStatement = tx.statement.toLowerCase().includes(query);
      const matchesNotes = tx.notes && tx.notes.toLowerCase().includes(query);

      // ID match
      const matchesId = tx.id.toLowerCase().includes(query);

      // Value match
      const matchesAmount = tx.debit.toString().includes(query) || tx.credit.toString().includes(query);

      // Advanced numerical matching (e.g. >1000 or <500)
      let matchesAdvancedAmount = false;
      if (query.startsWith('>') || query.startsWith('<')) {
        const val = parseFloat(query.substring(1));
        if (!isNaN(val)) {
          if (query.startsWith('>')) {
            matchesAdvancedAmount = tx.credit > val || tx.debit > val;
          } else {
            const nonZeroCredit = tx.credit > 0 && tx.credit < val;
            const nonZeroDebit = tx.debit > 0 && tx.debit < val;
            matchesAdvancedAmount = nonZeroCredit || nonZeroDebit;
          }
        }
      }

      const matchesSearch = 
        matchesEmpName ||
        matchesEmpId ||
        matchesType ||
        matchesDate ||
        matchesStatement ||
        (matchesNotes ?? false) ||
        matchesId ||
        matchesAmount ||
        matchesAdvancedAmount;

      return matchesEmployeeFilter && matchesTypeFilter && matchesSearch;
    }).reverse(); // Reverse so latest transaction is shown first on top of table
  };

  const handleOpenAddModal = (empId?: string) => {
    if (!canModify) {
      alert('⚠️ عذراً، يجب تسجيل الدخول بحساب محاسب أو مدير لإضافة حركات مالية.');
      return;
    }
    if (employees.length === 0) {
      alert('يرجى إضافة موظف واحد على الأقل أولاً.');
      return;
    }
    setFormData({
      employeeId: empId || employees[0].id,
      date: new Date().toISOString().split('T')[0],
      type: TransactionType.ADVANCE,
      statement: '',
      debit: 0,
      credit: 0,
      notes: ''
    });
    setFormError('');
    setModalType('add');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    if (!canModify) {
      alert('⚠️ لا تملك صلاحية لتعديل القيود المالية.');
      return;
    }
    if (isMonthLocked(tx.date)) {
      if (!isAbsoluteOwner()) {
        alert(`⚠️ عذراً، هذا القيد يقع في شهر مغلق محاسبياً (${tx.date.slice(0, 7)}). لا يمكنك تعديله إلا بإذن المالك.`);
        return;
      }
    }
    setFormData({
      employeeId: tx.employeeId,
      date: tx.date,
      type: tx.type,
      statement: tx.statement,
      debit: tx.debit,
      credit: tx.credit,
      notes: tx.notes || ''
    });
    setEditingTxId(tx.id);
    setFormError('');
    setModalType('edit');
    setIsModalOpen(true);
  };

  const handleCopyTransaction = (tx: Transaction) => {
    if (!canModify) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (isMonthLocked(todayStr)) {
      if (!isAbsoluteOwner()) {
        alert('⚠️ عذراً، لا يمكن نسخ القيود لليوم الحالي لأن الشهر الحالي مقفل محاسبياً.');
        return;
      } else {
        const proceedBypass = window.confirm('⚠️ تنبيه المالك: الشهر الحالي مقفل محاسبياً، هل تود نسخ القيد بالرغم من هذا القفل؟');
        if (!proceedBypass) return;
      }
    }

    const nextNum = transactions.length + 1001;
    const copiedTx: Transaction = {
      ...tx,
      id: `TX-${nextNum}`,
      date: todayStr,
      statement: `${tx.statement} (نسخة مكررة)`,
    };
    setTransactions([copiedTx, ...transactions]);
    addAuditLog('تكرار حركة مالية', tx.statement, `تكرار ونسخ القيد المالي بقيمة مدين ${tx.debit} / دائن ${tx.credit} لليوم الحالي`);
    alert('✅ تم نسخ وتكرار الحركة المالية تلقائياً باليوم الحالي.');
  };

  const handleDeleteTransaction = (id: string, statement: string) => {
    if (!canModify) {
      alert('⚠️ لا تملك الصلاحيات الكافية لحذف الحركات المالية.');
      return;
    }
    const targetTx = transactions.find(t => t.id === id);
    if (targetTx && isMonthLocked(targetTx.date)) {
      if (!isAbsoluteOwner()) {
        alert(`⚠️ عذراً، لا يمكن حذف القيود المالية في شهر مقفل محاسبياً (${targetTx.date.slice(0, 7)}).`);
        return;
      } else {
        const bypass = window.confirm(`⚠️ تنبيه المالك: القيد يتبع لشهر مقفل محاسبياً (${targetTx.date.slice(0, 7)}).\nهل أنت متأكد من رغبتك في الحذف وتجاوز الحظر؟`);
        if (!bypass) return;
      }
    }

    if (window.confirm(`هل أنت متأكد من رغبتك في حذف القيد المالي "${statement}"؟ \nسيؤثر هذا على احتساب الأرصدة التراكمية للموظف.`)) {
      setTransactions(transactions.filter(t => t.id !== id));
      addAuditLog('حذف قيد مالي', statement, `تم حذف الحركة المالية بالكامل (مدين: ${targetTx?.debit || 0} / دائن: ${targetTx?.credit || 0})`);
      alert('✅ تم حذف الحركة المالية بنجاح.');
    }
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن حفظ القيود أو الحركات المالية أثناء وضع القراءة فقط لحماية البيانات.');
      return;
    }
    if (!formData.employeeId) {
      setFormError('يرجى اختيار الموظف التابعة له الحركة.');
      return;
    }
    if (!formData.statement.trim()) {
      setFormError('يرجى كتابة بيان القيد أو العملية بالتفصيل.');
      return;
    }
    if (formData.debit <= 0 && formData.credit <= 0) {
      setFormError('يجب إدخال قيمة مالية أكبر من الصفر في خانة المدين أو الدائن.');
      return;
    }

    // Verify Month Lockdown
    if (isMonthLocked(formData.date)) {
      if (!isAbsoluteOwner()) {
        alert(`⚠️ عذراً، الشهر المحدد (${formData.date.slice(0, 7)}) مغلق محاسبياً.\nلا يمكن تعديل أو إضافة حركات لهذا الشهر إلا من خلال حساب المالك.`);
        return;
      } else {
        const proceedBypass = window.confirm(`⚠️ تنبيه المالك: التاريخ المحدد يتبع لشهر مقفل محاسبياً (${formData.date.slice(0, 7)}). هل تود تخطي الحظر بالرغم من ذلك؟`);
        if (!proceedBypass) return;
      }
    }

    if (modalType === 'add') {
      const nextNum = transactions.length + 1010;
      const newTx: Transaction = {
        id: `TX-${nextNum}`,
        employeeId: formData.employeeId,
        date: formData.date,
        type: formData.type,
        statement: formData.statement,
        debit: Number(formData.debit),
        credit: Number(formData.credit),
        balance: 0, // Recalculated on display
        notes: formData.notes
      };
      setTransactions([newTx, ...transactions]);
      addAuditLog('تسجيل حركة مالية', formData.statement, `تم تسجيل قيد جديد للموظف ذو المعرف ${formData.employeeId} (مدين: ${formData.debit} / دائن: ${formData.credit})`);
    } else {
      // edit mode
      if (editingTxId) {
        const originalTx = transactions.find(t => t.id === editingTxId);
        if (originalTx && isMonthLocked(originalTx.date)) {
          if (!isAbsoluteOwner()) {
            alert(`⚠️ عذراً، القيد الأصلي يتبع لشهر مقفل محاسبياً (${originalTx.date.slice(0, 7)}) ولا يملك أحد تعديله سوى المالك.`);
            return;
          }
        }
      }
      setTransactions(transactions.map(t => 
        t.id === editingTxId 
          ? {
              ...t,
              employeeId: formData.employeeId,
              date: formData.date,
              type: formData.type,
              statement: formData.statement,
              debit: Number(formData.debit),
              credit: Number(formData.credit),
              notes: formData.notes
            }
          : t
      ));
      addAuditLog('تعديل قيد مالي', formData.statement, `تعديل بيانات القيد ${editingTxId} (مدين: ${formData.debit} / دائن: ${formData.credit})`);
    }
    setIsModalOpen(false);
  };

  const processedList = getProcessedTransactions();

  // Aggregate stats of filtered set
  const filteredDebitSum = processedList.reduce((sum, tx) => sum + tx.debit, 0);
  const filteredCreditSum = processedList.reduce((sum, tx) => sum + tx.credit, 0);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">شاشة السحوبات الشهرية والأستاذ العام</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">تتبع سحب السلف، أقساط المديونيات، صرف الأجور، واستخلاص موازين الموظفين.</p>
        </div>
        
        {canModify && (
          <button
            onClick={() => handleOpenAddModal()}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>تسجيل قيد مالي جديد</span>
          </button>
        )}
      </div>

      {/* Database Quick filters row - Smart Search & Filter Area */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Employee selector */}
          <div className="md:col-span-4">
            <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5">تصفية حسب ملف الموظف</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800/80 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold transition-all"
            >
              <option value="all">📁 جميع الموظفين وسجل العام</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  👤 {emp.name} ({emp.id}) {emp.isArchived ? '[مؤرشف]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Type Category Filter */}
          <div className="md:col-span-4">
            <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5">حسب نوع القيد المالي</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800/80 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-semibold transition-all"
            >
              <option value="all">🔍 جميع أنواع العمليات</option>
              {getCombinedCategories().map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Smart Search Input with Clear Button */}
          <div className="md:col-span-4">
            <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1.5">البحث الذكي المتقدم</label>
            <div className="relative">
              <Search className="absolute right-3.5 top-3 text-slate-400 dark:text-zinc-500" size={14} />
              <input
                type="text"
                placeholder="ابحث بالاسم، التاريخ، المبلغ، نوع القيد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 p-1 rounded-full text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic capsules & quick search pills for easier navigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-50 dark:border-zinc-800">
          <span className="text-[10px] text-zinc-400 font-bold dark:text-zinc-500">حركات ذكية شائعة:</span>
          {[
            { label: '💰 مبالغ > 5000', query: '>5000' },
            { label: '💸 مبالغ < 2000', query: '<2000' },
            { label: '💳 راتب', query: 'راتب' },
            { label: '⏳ سلفة', query: 'سلفة' },
            { label: '📆 يونيو 2026', query: '2026-06' },
            { label: '❌ مديونية مجمدة', query: 'مديونية' }
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
              ✓ عثرنا على {processedList.length} مستند قيد مالي حالياً.
            </span>
          )}
        </div>

        {/* Ledger Summary Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-xl flex flex-wrap gap-4 items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Calculator className="text-indigo-500" size={18} />
            <span className="font-bold text-slate-800 dark:text-zinc-200">الخلاصة المختارة الحالية:</span>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">إجمالي مدين (سحوبات/خصم):</span>
              <span className="font-bold text-red-600 dark:text-red-400 font-mono">{filteredDebitSum.toLocaleString()} ر.ي</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">إجمالي دائن (رواتب/مكافآت):</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{filteredCreditSum.toLocaleString()} ر.ي</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">فارق الرصيد المحتسب:</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                filteredCreditSum - filteredDebitSum >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
              }`}>
                {(filteredCreditSum - filteredDebitSum).toLocaleString()} ر.ي
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/70 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500 font-bold border-b border-slate-100 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3.5">المعرف</th>
                <th className="px-4 py-3.5">التاريخ</th>
                <th className="px-4 py-3.5">اسم الموظف</th>
                <th className="px-4 py-3.5">نوع العملية</th>
                <th className="px-4 py-3.5">البيان وقيود الشرح</th>
                <th className="px-4 py-3.5 text-left text-red-600 dark:text-red-400">مدين (-)</th>
                <th className="px-4 py-3.5 text-left text-emerald-600 dark:text-emerald-400">دائن (+)</th>
                {selectedEmployeeId !== 'all' && (
                  <th className="px-4 py-3.5 text-left text-slate-700 dark:text-zinc-300">الرصيد الجاري</th>
                )}
                <th className="px-4 py-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50 text-slate-700 dark:text-zinc-300">
              {processedList.map((tx) => {
                const emp = employees.find(e => e.id === tx.employeeId);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                    <td className="px-4 py-3 font-semibold font-mono text-slate-400">{tx.id}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap text-slate-500">{tx.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {emp ? emp.name : <span className="text-red-500 font-bold">موظف محذوف</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50">
                        {getArabicTypeName(tx.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-150 max-w-xs truncate" title={tx.statement}>
                      <div className="flex flex-col">
                        <span>{tx.statement}</span>
                        {tx.notes && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 font-normal">{tx.notes}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left font-bold text-red-600 dark:text-red-400 font-mono">
                      {tx.debit > 0 ? `${tx.debit.toLocaleString()} ر.ي` : '-'}
                    </td>
                    <td className="px-4 py-3 text-left font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {tx.credit > 0 ? `${tx.credit.toLocaleString()} ر.ي` : '-'}
                    </td>
                    
                    {selectedEmployeeId !== 'all' && (
                      <td className="px-4 py-3 text-left font-bold font-mono">
                        <span className={`px-1.5 py-0.5 rounded ${
                          tx.balance >= 0 
                            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/45 dark:bg-indigo-950/20' 
                            : 'text-red-600 dark:text-red-400 bg-red-50/45 dark:bg-red-950/20'
                        }`}>
                          {tx.balance.toLocaleString()} ر.ي
                        </span>
                      </td>
                    )}

                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-zinc-800 p-0.5 rounded-md">
                        {canModify && (
                          <>
                            {/* Copy/Duplicate Trigger */}
                            <button
                              onClick={() => handleCopyTransaction(tx)}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded transition-all"
                              title="نسخ وتكرار القيد اليوم"
                            >
                              <Copy size={13} />
                            </button>

                            {/* Edit Trigger */}
                            <button
                              onClick={() => handleOpenEditModal(tx)}
                              className="p-1 text-slate-500 hover:text-indigo-600 rounded transition-all"
                              title="تعديل القيد المالي"
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Delete Trigger */}
                            <button
                              onClick={() => handleDeleteTransaction(tx.id, tx.statement)}
                              className="p-1 text-slate-500 hover:text-red-600 rounded transition-all"
                              title="حذف القيد"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {processedList.length === 0 && (
                <tr>
                  <td colSpan={selectedEmployeeId !== 'all' ? 9 : 8} className="text-center py-16 text-slate-400 dark:text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History size={32} className="text-slate-200" />
                      <p className="font-bold text-xs">لا تتوفر سجلات حركات مالية مطابقة للتصفية الحالية.</p>
                      {selectedEmployeeId !== 'all' && canModify && (
                        <button
                          onClick={() => handleOpenAddModal(selectedEmployeeId)}
                          className="mt-2 text-indigo-500 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <PlusCircle size={14} />
                          <span>سجل سلفة أو أول قصة مرتب للموظف الآن</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg border border-slate-100 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-800/40 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {modalType === 'add' ? 'تقييد عملية وحركة مالية جديدة' : 'تعديل تفاصيل القيد الدفتري'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTransaction} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-bold leading-relaxed flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Employee selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">اطلب الموظف المستهدف بالعملية</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  required
                >
                  <option value="" disabled>-- اختر الموظف لتقييد القيد برصيده --</option>
                  {employees.filter(e => !e.isArchived || modalType === 'edit').map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (الراتب: {emp.salary.toLocaleString()} ر.ي)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">تاريخ الحركة</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5 flex items-center justify-between">
                    <span>نوع البند المالي</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomType(!isAddingCustomType)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <PlusCircle size={10} />
                      <span>نوع رئيسي مخصص</span>
                    </button>
                  </label>
                  
                  {isAddingCustomType ? (
                    <div className="flex gap-1 animate-fadeIn">
                      <input
                        type="text"
                        placeholder="نوع جديد..."
                        value={newCustomCategoryInput}
                        onChange={(e) => setNewCustomCategoryInput(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-indigo-50 dark:bg-zinc-850 text-slate-900 dark:text-white rounded border border-indigo-200 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomType}
                        className="p-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                      >
                        أضف
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {getCombinedCategories().map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Debit & Credit */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-zinc-800/20 border border-slate-100 dark:border-zinc-800 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1.5">مدين (-) (سلف/خصومات)</label>
                  <input
                    type="number"
                    value={formData.debit || ''}
                    onChange={(e) => setFormData({ ...formData, debit: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 text-left rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">يخصم من ميزان الموظف وجاريه.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">دائن (+) (استحقاق/راتب/مكافأة)</label>
                  <input
                    type="number"
                    value={formData.credit || ''}
                    onChange={(e) => setFormData({ ...formData, credit: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 text-left rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">يضاف إلى ميزان استحقاق الموظف.</span>
                </div>
              </div>

              {/* Statement */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">البيان والشرح الدفتري للعملية</label>
                <input
                  type="text"
                  placeholder="مثال: تسليم سلفة الخميس النقدية المعتادة"
                  value={formData.statement}
                  onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1.5">ملاحظات محاسبية إضافية وتفاصيل السند</label>
                <input
                  type="text"
                  placeholder="رقم المستند، تفويض ورقي، أو شروط الاسترجاع..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  <Coins size={14} />
                  <span>{modalType === 'add' ? 'قيد المعاملة' : 'حفظ القيود المعدلة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
