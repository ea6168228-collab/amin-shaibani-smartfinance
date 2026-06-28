import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, TrendingDown, Shield, FileText, CheckCircle2, AlertTriangle,
  Search, Filter, Plus, Calendar, User, Settings, RefreshCw, Printer, Trash2,
  ChevronDown, ChevronUp, FileSpreadsheet, ArrowLeftRight, HelpCircle,
  Coins, Wallet, Receipt, Ban, Check, ArrowUpRight, ArrowDownLeft, Lock, Info, Download, FileDown
} from 'lucide-react';
import { Employee, Transaction, AppSettings, UserRole, TreasuryActivity, TreasuryState, PaymentVoucher, GeneralExpenseRevenue } from '../types';

interface CorporateFinanceViewProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUserRole: UserRole;
  appSettings: AppSettings;
}

export default function CorporateFinanceView({
  employees,
  setEmployees,
  transactions,
  setTransactions,
  currentUserRole,
  appSettings
}: CorporateFinanceViewProps) {
  
  const loggedInUserName = localStorage.getItem('amin_sh_logged_user') || 'المحاسب';
  const customUserId = localStorage.getItem('amin_sh_user_id') || '';
  const isCustomWorkspace = currentUserRole === UserRole.USER && !!customUserId && !['admin', 'accountant', 'viewer'].includes(customUserId);
  const prefix = isCustomWorkspace ? `_${customUserId}` : '';

  // Storage keys matching workspace separation
  const treasuryKey = `amin_sh_treasury_state${prefix}`;
  const vouchersKey = `amin_sh_vouchers${prefix}`;
  const ledgersKey = `amin_sh_general_ledgers${prefix}`;

  // Tabs state
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'treasury' | 'vouchers' | 'expenses' | 'integrations' | 'reprots'>('dashboard');

  // Core accounting states
  const [treasuryState, setTreasuryState] = useState<TreasuryState>(() => {
    const data = localStorage.getItem(treasuryKey);
    if (data) {
      try { return JSON.parse(data); } catch(e) {}
    }
    return {
      initialBalance: 500000,
      currentBalance: 500000,
      lastReconciliationDate: new Date().toISOString().split('T')[0],
      activities: [
        {
          id: 'TX-KHAZ-1001',
          date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
          type: 'deposit',
          statement: 'تغذية صندوق البداية ورأس المال الافتتاحي المقر',
          amount: 500000,
          direction: 'in',
          user: 'مدير الصندوق',
          notes: 'رصيد التأسيس الأولي للمؤسسة'
        }
      ]
    };
  });

  const [vouchers, setVouchers] = useState<PaymentVoucher[]>(() => {
    const data = localStorage.getItem(vouchersKey);
    if (data) {
      try { return JSON.parse(data); } catch(e) {}
    }
    return [
      {
        id: 'RV-10001',
        date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
        type: 'receipt',
        beneficiaryOrPayer: 'عمر المختار - شركة التضامن',
        relatedEntityType: 'external',
        amount: 150000,
        statement: 'دفعة بموجب عقد الصيانة السنوي للأجهزة والشبكات',
        paymentMethod: 'bank_transfer',
        user: 'المدير المالي',
        status: 'approved',
        notes: 'مكتمل التحويل البنكي لحساب المؤسسة الافتراضي',
        linkedActivityId: 'TX-KHAZ-EX-1'
      }
    ];
  });

  const [ledgers, setLedgers] = useState<GeneralExpenseRevenue[]>(() => {
    const data = localStorage.getItem(ledgersKey);
    if (data) {
      try { return JSON.parse(data); } catch(e) {}
    }
    return [
      {
        id: 'GL-1001',
        date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
        type: 'expense',
        category: 'كهرباء',
        statement: 'سداد فاتورة كهرباء المقر الرئيسي ومكيفات الخدمة لشهر مايو',
        amount: 12500,
        paymentMethod: 'cash',
        isLinkedToTreasury: true,
        notes: 'تم الخصم مباشرة من الصندوق ليد المندوب',
        linkedActivityId: 'TX-KHAZ-EX-2'
      }
    ];
  });

  // State Synchronization
  useEffect(() => {
    localStorage.setItem(treasuryKey, JSON.stringify(treasuryState));
  }, [treasuryState, treasuryKey]);

  useEffect(() => {
    localStorage.setItem(vouchersKey, JSON.stringify(vouchers));
  }, [vouchers, vouchersKey]);

  useEffect(() => {
    localStorage.setItem(ledgersKey, JSON.stringify(ledgers));
  }, [ledgers, ledgersKey]);

  // Recalculate treasury totals live
  const calculatedTreasury = useMemo(() => {
    const activities = treasuryState.activities || [];
    const initial = treasuryState.initialBalance || 0;
    
    const totalReceipts = activities
      .filter(act => act.direction === 'in')
      .reduce((sum, act) => sum + act.amount, 0);

    const totalExpenses = activities
      .filter(act => act.direction === 'out')
      .reduce((sum, act) => sum + act.amount, 0);

    const currentBalance = initial + totalReceipts - totalExpenses;

    return {
      initial,
      totalReceipts,
      totalExpenses,
      currentBalance,
      lastReconciliationDate: treasuryState.lastReconciliationDate,
      activities
    };
  }, [treasuryState]);

  // Sync actual balance in treasuryState if mismatch
  useEffect(() => {
    if (treasuryState.currentBalance !== calculatedTreasury.currentBalance) {
      setTreasuryState(prev => ({
        ...prev,
        currentBalance: calculatedTreasury.currentBalance
      }));
    }
  }, [calculatedTreasury.currentBalance, treasuryState.currentBalance]);

  // Modal open states
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [showAddLedgerModal, setShowAddLedgerModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedPrintVoucher, setSelectedPrintVoucher] = useState<PaymentVoucher | null>(null);

  // Filters
  const [voucherSearch, setVoucherSearch] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<'all' | 'receipt' | 'payment'>('all');
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<'all' | 'draft' | 'approved' | 'cancelled'>('all');

  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'expense' | 'revenue'>('all');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('all');

  // Input states for forms
  const [newActivity, setNewActivity] = useState({
    type: 'deposit' as any,
    statement: '',
    amount: '',
    direction: 'in' as 'in' | 'out',
    notes: '',
    relatedEntityType: 'general' as any,
    relatedEntityId: ''
  });

  const [newVoucher, setNewVoucher] = useState({
    type: 'receipt' as 'receipt' | 'payment',
    beneficiaryOrPayer: '',
    relatedEntityType: 'external' as 'employee' | 'association' | 'treasury' | 'external',
    relatedEntityId: '',
    amount: '',
    statement: '',
    paymentMethod: 'cash' as any,
    notes: '',
    autoPostToTreasury: true
  });

  const [newLedger, setNewLedger] = useState({
    type: 'expense' as 'expense' | 'revenue',
    category: 'كهرباء',
    statement: '',
    amount: '',
    paymentMethod: 'cash' as any,
    isLinkedToTreasury: true,
    relatedEntityId: '',
    relatedEntityType: 'general' as any,
    notes: ''
  });

  const [reconciliationInput, setReconciliationInput] = useState({
    actualAmount: '',
    notes: ''
  });

  const [customToast, setCustomToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setCustomToast({ show: true, message, type });
    setTimeout(() => {
      setCustomToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Default Categories
  const expenseCategories = ['إيجار', 'كهرباء', 'ماء', 'إنترنت', 'صيانة', 'نقل', 'ضيافة', 'أدوات مكتبية', 'مشتريات', 'مصروفات أخرى'];
  const revenueCategories = ['إيراد خدمات', 'إيراد تحصيل', 'إيراد إضافي', 'إيراد آخر'];

  // Calculations for Corporate Upper Board (اللوحة المالية العليا)
  const totalSalariesPaid = useMemo(() => {
    // Sum of credit transactions under employee logs
    return transactions
      .filter(tx => tx.type === 'salary')
      .reduce((sum, tx) => sum + (tx.credit || 0), 0);
  }, [transactions]);

  const totalActiveAdvances = useMemo(() => {
    // Sum of debit of advances minus credit of return
    const totalDebits = transactions
      .filter(tx => ['advance', 'thursday_advance', 'installment'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.debit || 0), 0);
    const totalCredits = transactions
      .filter(tx => ['advance_return', 'custody_return'].includes(tx.type))
      .reduce((sum, tx) => sum + (tx.credit || 0), 0);
    return Math.max(0, totalDebits - totalCredits);
  }, [transactions]);

  const totalGeneralExpenses = useMemo(() => {
    return ledgers
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [ledgers]);

  const totalGeneralRevenues = useMemo(() => {
    return ledgers
      .filter(item => item.type === 'revenue')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [ledgers]);

  // Load Associations list from localStorage
  const associationsList = useMemo(() => {
    const assocKey = isCustomWorkspace ? `amin_sh_associations_${customUserId}` : 'amin_sh_associations';
    const dat = localStorage.getItem(assocKey);
    if (dat) {
      try { return JSON.parse(dat); } catch(e) {}
    }
    return [];
  }, [isCustomWorkspace, customUserId]);

  const totalAssociationBalances = useMemo(() => {
    // Mock or load actual association transactions if available
    const gpTxsKey = isCustomWorkspace ? `amin_sh_group_txs_${customUserId}` : 'amin_sh_group_txs';
    const grData = localStorage.getItem(gpTxsKey);
    if (grData) {
      try {
        const parsed = JSON.parse(grData);
        if (Array.isArray(parsed)) {
          let bal = 0;
          parsed.forEach((tx: any) => {
            bal += (tx.credit || 0) - (tx.debit || 0);
          });
          return bal;
        }
      } catch(e) {}
    }
    return 1450000; // default indicator fallback if empty
  }, [isCustomWorkspace, customUserId]);

  const activeVouchersCount = useMemo(() => {
    return vouchers.filter(v => v.status === 'approved').length;
  }, [vouchers]);

  // Dynamic alerts engine
  const financialAlerts = useMemo(() => {
    const alertsList: Array<{ id: string; type: 'danger' | 'warning' | 'info'; text: string; actionText?: string; targetTab?: any }> = [];

    // 1. Treasury balance warning
    if (calculatedTreasury.currentBalance < 45000) {
      alertsList.push({
        id: 'alt-1',
        type: 'danger',
        text: ` رصيد الخزينة العامة منخفض جداً: (${calculatedTreasury.currentBalance.toLocaleString()} ر.ي). الرجاء تغذية الصندوق سريعاً تفادياً لتعثر المدفوعات.`,
        targetTab: 'treasury'
      });
    }

    // 2. Draft vouchers count
    const drafts = vouchers.filter(v => v.status === 'draft');
    if (drafts.length > 0) {
      alertsList.push({
        id: 'alt-2',
        type: 'warning',
        text: ` يوجد عدد (${drafts.length}) سند مالي في وضع المسودة (غير معتمد بعد). تحتاج إلى المراجعة والاعتماد لإدخالها قيود الخزنة.`,
        targetTab: 'vouchers',
        actionText: 'مراجعة السندات'
      });
    }

    // 3. Approved vouchers without treasury links
    const unlinkedApproved = vouchers.filter(v => v.status === 'approved' && !v.linkedActivityId);
    if (unlinkedApproved.length > 0) {
      alertsList.push({
        id: 'alt-3',
        type: 'warning',
        text: ` تم كشف (${unlinkedApproved.length}) سند مالي معتمد لا يحمل رابطاً بيانياً مباشراً بحركة الخزنة. قد يؤثر ذلك على توازن التدقيق.`,
        targetTab: 'vouchers'
      });
    }

    // 4. Ledger unclassified items
    const unclassified = ledgers.filter(lg => lg.category === 'مصروفات أخرى' || !lg.category);
    if (unclassified.length > 3) {
      alertsList.push({
        id: 'alt-4',
        type: 'info',
        text: ` هناك قيود مصروفات مسجلة تحت تصنيف مبهم "مصروفات أخرى". ينصح بتصنيفها لتحسين جودة التقارير.`,
        targetTab: 'expenses'
      });
    }

    // 5. Negative association balance
    if (totalAssociationBalances < 0) {
      alertsList.push({
        id: 'alt-5',
        type: 'danger',
        text: ` تنبيه محاسبي: إجمالي أرصدة الصناديق والجمعيات الحالية ينبئ بوجود عجز أو توازن سالب. يرجى مطابقة سندات التحصيل.`,
        targetTab: 'dashboard'
      });
    }

    // 6. Reconciliation lag warning
    if (calculatedTreasury.lastReconciliationDate) {
      const days = Math.floor((Date.now() - new Date(calculatedTreasury.lastReconciliationDate).getTime()) / (1000 * 3600 * 24));
      if (days > 15) {
        alertsList.push({
          id: 'alt-6',
          type: 'warning',
          text: ` لم يتم إجراء تسوية نقدية للصندوق منذ أكثر من ${days} يوماً. ينصح بعمل جرد دوري بالخزينة لضمان الأمان ومطابقة الأرصدة.`,
          targetTab: 'treasury',
          actionText: 'إجراء تسوية الآن'
        });
      }
    }

    return alertsList;
  }, [calculatedTreasury.currentBalance, calculatedTreasury.lastReconciliationDate, vouchers, ledgers, totalAssociationBalances]);

  // Executive net position (الصافي الكلي للوضع المالي)
  const netFinancialPosition = useMemo(() => {
    return (calculatedTreasury.currentBalance + totalGeneralRevenues + totalActiveAdvances) - (totalGeneralExpenses + totalAssociationBalances);
  }, [calculatedTreasury.currentBalance, totalGeneralRevenues, totalActiveAdvances, totalGeneralExpenses, totalAssociationBalances]);

  // Handle manual Box Transactions
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.statement || !newActivity.amount) {
      triggerToast('⚠️ الرجاء ملء جميع الحقول المطلوبة.', 'error');
      return;
    }

    const amt = Number(newActivity.amount);
    const activityId = `TX-KHAZ-${Date.now().toString().substring(7)}`;
    const created: TreasuryActivity = {
      id: activityId,
      date: new Date().toISOString().split('T')[0],
      type: newActivity.type,
      statement: newActivity.statement,
      amount: amt,
      direction: newActivity.direction,
      relatedEntityType: newActivity.relatedEntityType,
      relatedEntityId: newActivity.relatedEntityId || undefined,
      user: loggedInUserName,
      notes: newActivity.notes || undefined
    };

    setTreasuryState(prev => {
      const updatedAct = [created, ...(prev.activities || [])];
      return {
        ...prev,
        activities: updatedAct
      };
    });

    setShowAddActivityModal(false);
    setNewActivity({
      type: 'deposit',
      statement: '',
      amount: '',
      direction: 'in',
      notes: '',
      relatedEntityType: 'general',
      relatedEntityId: ''
    });
    triggerToast('🟢 تم ترحيل حركة الخزنة وحفظها محلياً بأمان مالي!', 'success');
  };

  // Create & Manage Vouchers
  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucher.beneficiaryOrPayer || !newVoucher.amount || !newVoucher.statement) {
      triggerToast('⚠️ الرجاء التحقق من البيانات الإلزامية للسند.', 'error');
      return;
    }

    const amt = Number(newVoucher.amount);
    const isReceipt = newVoucher.type === 'receipt';
    
    // Generate Incremental Serial
    const suffix = vouchers.length + 10001;
    const voucherId = isReceipt ? `RV-${suffix}` : `PV-${suffix}`;

    // Duplicate Check
    if (vouchers.some(v => v.id === voucherId)) {
      triggerToast('⚠️ خطا: رقم السند هذا مكرر بالفعل!', 'error');
      return;
    }

    let linkedActivityId: string | undefined = undefined;

    // Automatically approved and link with Khazna if option checked
    if (newVoucher.autoPostToTreasury) {
      const actId = `TX-KHAZ-AUTO-${Date.now().toString().substring(7)}`;
      linkedActivityId = actId;

      const khazActivity: TreasuryActivity = {
        id: actId,
        date: new Date().toISOString().split('T')[0],
        type: isReceipt ? 'general_revenue' : 'general_expense',
        statement: `[سند معتمد ${isReceipt ? 'قبض' : 'صرف'} #${voucherId}] ${newVoucher.statement}`,
        amount: amt,
        direction: isReceipt ? 'in' : 'out',
        relatedEntityType: newVoucher.relatedEntityType === 'treasury' ? 'general' : newVoucher.relatedEntityType,
        relatedEntityId: newVoucher.relatedEntityId || undefined,
        user: loggedInUserName,
        notes: `مسجل تلقائياً بموجب اعتماد السند ${voucherId}`
      };

      setTreasuryState(prev => ({
        ...prev,
        activities: [khazActivity, ...(prev.activities || [])]
      }));
    }

    const created: PaymentVoucher = {
      id: voucherId,
      date: new Date().toISOString().split('T')[0],
      type: newVoucher.type,
      beneficiaryOrPayer: newVoucher.beneficiaryOrPayer,
      relatedEntityType: newVoucher.relatedEntityType,
      relatedEntityId: newVoucher.relatedEntityId || undefined,
      amount: amt,
      statement: newVoucher.statement,
      paymentMethod: newVoucher.paymentMethod,
      user: loggedInUserName,
      status: newVoucher.autoPostToTreasury ? 'approved' : 'draft',
      notes: newVoucher.notes || undefined,
      linkedActivityId
    };

    setVouchers(prev => [created, ...prev]);
    setShowAddVoucherModal(false);
    triggerToast(`🟢 تم إصدار السند المالي المرقّم بنجاح: ${voucherId}`, 'success');

    // Reset Form
    setNewVoucher({
      type: 'receipt',
      beneficiaryOrPayer: '',
      relatedEntityType: 'external',
      relatedEntityId: '',
      amount: '',
      statement: '',
      paymentMethod: 'cash',
      notes: '',
      autoPostToTreasury: true
    });
  };

  // Approve a draft voucher with no redundancy ("عدم اعتماد السند مرتين")
  const approveVoucher = (voucher: PaymentVoucher) => {
    if (voucher.status !== 'draft') {
      triggerToast('⚠️ هذا السند تم اعتماده مسبقاً أو ملغي.', 'error');
      return;
    }

    const isReceipt = voucher.type === 'receipt';
    const actId = `TX-KHAZ-APR-${Date.now().toString().substring(7)}`;

    // 1. Post to treasury automatically
    const khazActivity: TreasuryActivity = {
      id: actId,
      date: new Date().toISOString().split('T')[0],
      type: isReceipt ? 'general_revenue' : 'general_expense',
      statement: `[سند معتمد ${isReceipt ? 'قبض' : 'صرف'} #${voucher.id}] ${voucher.statement}`,
      amount: voucher.amount,
      direction: isReceipt ? 'in' : 'out',
      relatedEntityType: voucher.relatedEntityType === 'treasury' ? 'general' : voucher.relatedEntityType,
      relatedEntityId: voucher.relatedEntityId,
      user: loggedInUserName,
      notes: `مسجل تلقائياً بموجب اعتماد متأخر للسند ${voucher.id}`
    };

    setTreasuryState(prev => ({
      ...prev,
      activities: [khazActivity, ...(prev.activities || [])]
    }));

    // 2. Set Voucher Approved
    setVouchers(prev => prev.map(v => v.id === voucher.id ? {
      ...v,
      status: 'approved',
      linkedActivityId: actId
    } : v));

    triggerToast(`🟢 تم اعتماد وترحيل السند المالي ${voucher.id} بنجاح إلى الخزينة!`, 'success');
  };

  // Cancel Voucher safely
  const cancelVoucher = (voucherId: string) => {
    const vc = vouchers.find(v => v.id === voucherId);
    if (!vc) return;

    // If it was approved, reverse or delete the linked treasury activity to maintain exact balance synchronization
    if (vc.status === 'approved' && vc.linkedActivityId) {
      setTreasuryState(prev => ({
        ...prev,
        activities: (prev.activities || []).filter(act => act.id !== vc.linkedActivityId)
      }));
    }

    setVouchers(prev => prev.map(v => v.id === voucherId ? {
      ...v,
      status: 'cancelled',
      linkedActivityId: undefined
    } : v));

    triggerToast(`ℹ️ تم إلغاء السند المالي ${voucherId} والتراجع عن آثاره بالخزنة.`, 'info');
  };

  // General expenses / revenues creation
  const handleCreateLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedger.statement || !newLedger.amount) {
      triggerToast('⚠️ البيانات المستبعدة غير معتد بها، أدخل كافة الحقول.', 'error');
      return;
    }

    const amt = Number(newLedger.amount);
    const isExpense = newLedger.type === 'expense';
    const ledgerId = `GL-${Date.now().toString().substring(7)}`;
    let linkedActivityId: string | undefined = undefined;

    // Post to Khazna automatically if chosen
    if (newLedger.isLinkedToTreasury) {
      const actId = `TX-KHAZ` + `-GL-${Date.now().toString().substring(7)}`;
      linkedActivityId = actId;

      const khazActivity: TreasuryActivity = {
        id: actId,
        date: new Date().toISOString().split('T')[0],
        type: isExpense ? 'general_expense' : 'general_revenue',
        statement: `[رحلة مالية معزولة] ${isExpense ? 'صرف مصروف' : 'تحصيل إيراد'} (${newLedger.category}): ${newLedger.statement}`,
        amount: amt,
        direction: isExpense ? 'out' : 'in',
        relatedEntityType: newLedger.relatedEntityType,
        relatedEntityId: newLedger.relatedEntityId || undefined,
        user: loggedInUserName,
        notes: `موجب قيد الدفتر العام ${ledgerId}`
      };

      setTreasuryState(prev => ({
        ...prev,
        activities: [khazActivity, ...(prev.activities || [])]
      }));
    }

    const created: GeneralExpenseRevenue = {
      id: ledgerId,
      date: new Date().toISOString().split('T')[0],
      type: newLedger.type,
      category: newLedger.category,
      statement: newLedger.statement,
      amount: amt,
      paymentMethod: newLedger.paymentMethod,
      isLinkedToTreasury: newLedger.isLinkedToTreasury,
      relatedEntityType: newLedger.relatedEntityType,
      relatedEntityId: newLedger.relatedEntityId || undefined,
      notes: newLedger.notes || undefined,
      linkedActivityId
    };

    setLedgers(prev => [created, ...prev]);
    setShowAddLedgerModal(false);
    triggerToast(`🟢 تم تسجيل وتدوين (${isExpense ? 'المصروف' : 'الإيراد'}) بنجاح!`, 'success');

    // Reset Form
    setNewLedger({
      type: 'expense',
      category: 'كهرباء',
      statement: '',
      amount: '',
      paymentMethod: 'cash',
      isLinkedToTreasury: true,
      relatedEntityId: '',
      relatedEntityType: 'general',
      notes: ''
    });
  };

  // Perform safe reconciliation (تسوية الخزنة لضمان الرصيد الفعلي)
  const handlePerformReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconciliationInput.actualAmount) return;

    const actual = Number(reconciliationInput.actualAmount);
    const calculated = calculatedTreasury.currentBalance;
    const diff = actual - calculated;

    if (diff !== 0) {
      // Create correction transaction
      const actId = `TX-KHAZ-ADJ-${Date.now().toString().substring(7)}`;
      const adjActivity: TreasuryActivity = {
        id: actId,
        date: new Date().toISOString().split('T')[0],
        type: 'balance_correction',
        statement: `[تسوية جردية لتصحيح الرصيد] ${diff > 0 ? 'فائض نقدي مكتشف بالصندوق' : 'عجز نقدي بالصندوق تم قيده تسوية'}`,
        amount: Math.abs(diff),
        direction: diff > 0 ? 'in' : 'out',
        user: loggedInUserName,
        notes: `مُطابقة فعلية مسجلة: ${reconciliationInput.notes || 'تسوية سنوية/مرحلية'}`
      };

      setTreasuryState(prev => ({
        ...prev,
        lastReconciliationDate: new Date().toISOString().split('T')[0],
        activities: [adjActivity, ...(prev.activities || [])]
      }));
      triggerToast('🟢 تم إجراء المطابقة وتعديل الرصيد الدفتري ليتطابق مع الفعلي بأمان مالي!', 'success');
    } else {
      setTreasuryState(prev => ({
        ...prev,
        lastReconciliationDate: new Date().toISOString().split('T')[0]
      }));
      triggerToast('🟢 تم حفظ التسوية النقدية بنجاح: الرصيد الفعلي مطابق تماماً للرصيد الدفتري!', 'success');
    }

    setShowReconcileModal(false);
    setReconciliationInput({ actualAmount: '', notes: '' });
  };

  // Unified financial integration triggers (جسر الروابط السريع بين الموظفين والجمعيات والعملاء)
  const pendingEmployeeAdvancesToHook = useMemo(() => {
    // Find employee transactions of type 'advance', 'thursday_advance', or 'custody'
    // that are NOT logged in treasuryState activities (i.e. by checking statement or tracking)
    return transactions.filter(tx => {
      if (!['advance', 'thursday_advance', 'custody'].includes(tx.type)) return false;
      const statementSlug = `[موظف #${tx.employeeId}]`;
      const isAlreadyLogged = (treasuryState.activities || []).some(act => act.statement.includes(statementSlug) || act.notes?.includes(tx.id));
      return !isAlreadyLogged;
    });
  }, [transactions, treasuryState.activities]);

  const recordEmployeeTxToKhazna = (tx: Transaction) => {
    const emp = employees.find(e => e.id === tx.employeeId);
    const empName = emp ? emp.name : 'موظف';
    const actId = `TX-KHAZ-EMP-${Date.now().toString().substring(7)}`;

    const khazActivity: TreasuryActivity = {
      id: actId,
      date: tx.date,
      type: 'transfer_to_employee',
      statement: `[موظف #${tx.employeeId}] صرف سلفة لـ (${empName}) بموجب العملية ${tx.id}`,
      amount: tx.debit || 0,
      direction: 'out',
      relatedEntityType: 'employee',
      relatedEntityId: tx.employeeId,
      user: loggedInUserName,
      notes: `ربط مالي تلقائي مع المعرّف العملياتي: ${tx.id}`
    };

    setTreasuryState(prev => ({
      ...prev,
      activities: [khazActivity, ...(prev.activities || [])]
    }));

    triggerToast(`🟢 تم ترحيل سلفة الموظف ${empName} إلى الخزنة فوراً ونقص الرصيد المتوفر!`, 'success');
  };

  // Filtering lists
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchSearch = (v.beneficiaryOrPayer || '').toLowerCase().includes((voucherSearch || '').toLowerCase()) ||
                          (v.statement || '').toLowerCase().includes((voucherSearch || '').toLowerCase()) ||
                          (v.id || '').toLowerCase().includes((voucherSearch || '').toLowerCase());
      const matchType = voucherTypeFilter === 'all' ? true : v.type === voucherTypeFilter;
      const matchStatus = voucherStatusFilter === 'all' ? true : v.status === voucherStatusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [vouchers, voucherSearch, voucherTypeFilter, voucherStatusFilter]);

  const filteredLedgers = useMemo(() => {
    return ledgers.filter(lg => {
      const matchSearch = (lg.statement || '').toLowerCase().includes((ledgerSearch || '').toLowerCase()) ||
                          (lg.category || '').toLowerCase().includes((ledgerSearch || '').toLowerCase());
      const matchType = ledgerTypeFilter === 'all' ? true : lg.type === ledgerTypeFilter;
      const matchCategory = ledgerCategoryFilter === 'all' ? true : lg.category === ledgerCategoryFilter;
      return matchSearch && matchType && matchCategory;
    });
  }, [ledgers, ledgerSearch, ledgerTypeFilter, ledgerCategoryFilter]);

  // General Report / Screen Print
  const handlePrintCurrentView = () => {
    window.print();
  };

  return (
    <div className="space-y-6 relative rtl">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {customToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
              customToast.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-850'
                : customToast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-850'
                : 'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-850 dark:text-indigo-200 border-indigo-200 dark:border-indigo-850'
            }`}
          >
            {customToast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertTriangle size={18} className="text-amber-500" />}
            <span className="text-xs font-bold leading-tight">{customToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tab Controller inside the Corporate Workspace */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300'
            }`}
          >
            📊 لوحة الرقابة والملخص العام
          </button>
          
          <button
            onClick={() => setActiveSubTab('treasury')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'treasury' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300'
            }`}
          >
            💰 الخزنة والصندوق العام
          </button>

          <button
            onClick={() => setActiveSubTab('vouchers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'vouchers' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300'
            }`}
          >
            📄 سندات القبض والصرف
          </button>

          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'expenses' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300'
            }`}
          >
            💸 الإيرادات والمصروفات العامة
          </button>

          <button
            onClick={() => setActiveSubTab('integrations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'integrations' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300'
            }`}
          >
            🔗 الربط المالي الموحد
            {pendingEmployeeAdvancesToHook.length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold animate-bounce">
                {pendingEmployeeAdvancesToHook.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={handlePrintCurrentView}
          className="flex items-center gap-2 bg-slate-900 border hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-95"
        >
          <Printer size={14} />
          <span>طباعة هذا القسم PDF</span>
        </button>
      </div>

      {/* 1. FINANCIAL EXECUTIVE UPPER BOARD (اللوحة المالية العليا) */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-indigo-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-extrabold mb-1">
                <Shield size={14} />
                <span>المركز المالي الشامل للمؤسسة</span>
              </div>
              <h2 className="text-xl font-black">اللوحة التنفيذية العليا للإدارة المالية</h2>
              <p className="text-[11px] text-slate-350 mt-1">تجميع دقيق لكافة أرصدة الموظفين والجمعيات والصندوق الرئيسي والبنود العامة لبيان السيولة</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 flex flex-col items-end">
              <span className="text-[10px] text-indigo-300 font-bold">صافي الوضع المالي الحالي للمؤسسة</span>
              <span className={`text-xl font-black ${netFinancialPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netFinancialPosition.toLocaleString()} {appSettings.institution.currency}
              </span>
            </div>
          </div>

          {/* Cards metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Box Current Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-emerald-500" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">سيولة الخزنة الرئيسية</p>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mt-2">
                    {calculatedTreasury.currentBalance.toLocaleString()} {appSettings.institution.currency}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet size={18} />
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-3 font-bold flex items-center gap-1">
                <span>تاريخ آخر تسوية:</span>
                <span>{calculatedTreasury.lastReconciliationDate || 'لم تجرَ بعد'}</span>
              </p>
            </div>

            {/* Total General Expenses */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-rose-500" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">المصروفات العامة للمركز</p>
                  <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mt-2">
                    {totalGeneralExpenses.toLocaleString()} {appSettings.institution.currency}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <TrendingDown size={18} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 font-medium">مشتريات كهرباء وصيانة وشبكات</p>
            </div>

            {/* Total General Revenues */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-500" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">الإيرادات العامة المكتسبة</p>
                  <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-2">
                    {totalGeneralRevenues.toLocaleString()} {appSettings.institution.currency}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="text-[10px] text-indigo-500 mt-3 font-medium">عقد خدمات تحصيل وصيانة عامة</p>
            </div>

            {/* Total Association Credits */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-1.5 w-full bg-amber-500" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">أرصدة الجمعيات والصناديق</p>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mt-2">
                    {totalAssociationBalances.toLocaleString()} {appSettings.institution.currency}
                  </h3>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Coins size={18} />
                </div>
              </div>
              <p className="text-[10px] text-amber-600 font-bold mt-3">عدد الجمعيات المشتركة: {associationsList.filter((a: any) => a.status === 'active' || a.status === 'نشطة').length}</p>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Salary Metric */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Receipt size={18} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">إجمالي الرواتب الدفترية المصروفة</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{totalSalariesPaid.toLocaleString()} {appSettings.institution.currency}</p>
              </div>
            </div>

            {/* Active Salary Advances */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <User size={18} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">إجمالي السلف والمديونيات القائمة</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{totalActiveAdvances.toLocaleString()} {appSettings.institution.currency}</p>
              </div>
            </div>

            {/* Total issued Vouchers */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">السندات الكلية (قبض وصرف)</span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {vouchers.filter(v => v.type === 'receipt').length} قبض | {vouchers.filter(v => v.type === 'payment').length} صرف ({vouchers.length} سند)
                </p>
              </div>
            </div>

          </div>

          {/* 7. EXECUTIVE ALERTS PANEL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <AlertTriangle className="text-amber-500" size={18} />
              <span>نظام التنبيهات والرقابة المالية التنفيذية</span>
              <span className="bg-red-500 text-white rounded-full text-[10px] px-2 py-0.5 font-black">{financialAlerts.length} تنبيهات</span>
            </h3>

            {financialAlerts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">🎉 نهانينا! جميع النظم والنسب المالية متزنة بالكامل ولا توجد تنبيهات مخلّة.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {financialAlerts.map(alt => (
                  <div 
                    key={alt.id}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      alt.type === 'danger'
                        ? 'bg-rose-50 dark:bg-rose-950/35 border-rose-150 text-rose-800 dark:text-rose-200'
                        : alt.type === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/35 border-amber-200 text-amber-800 dark:text-amber-250'
                        : 'bg-indigo-50 dark:bg-indigo-950/35 border-indigo-200 text-indigo-805 dark:text-indigo-200'
                    }`}
                  >
                    <div className="flex gap-2.5 items-start">
                      <span className="mt-0.5 text-base">⚠️</span>
                      <span>{alt.text}</span>
                    </div>
                    {alt.actionText && (
                      <button 
                        onClick={() => setActiveSubTab(alt.targetTab)}
                        className="bg-white hover:bg-slate-50 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black border flex-shrink-0 cursor-pointer shadow-sm transition-all"
                      >
                        {alt.actionText}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. KHAZNE & GENERAL BOX (الخزنة والصندوق العام) */}
      {activeSubTab === 'treasury' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Box summary pane */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm text-center flex flex-col justify-between">
              <div>
                <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <Wallet size={24} />
                </div>
                <h4 className="text-xs text-slate-450 font-bold mb-1">الرصيد الدفتري الحالي للصندوق</h4>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {calculatedTreasury.currentBalance.toLocaleString()} {appSettings.institution.currency}
                </div>
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border space-y-1.5 text-right">
                  <div className="flex justify-between text-[11px] font-medium text-slate-505">
                    <span>الرصيد الافتتاحي المقر:</span>
                    <span className="font-bold">{calculatedTreasury.initial.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-emerald-600">
                    <span>إجمالي المقبوضات (+):</span>
                    <span className="font-bold">{calculatedTreasury.totalReceipts.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-rose-605">
                    <span>إجمالي المصروفات (-):</span>
                    <span className="font-bold">{calculatedTreasury.totalExpenses.toLocaleString()} ر.ي</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => setShowAddActivityModal(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Plus size={14} />
                  <span>تسجيل حركة صندوق يدوية</span>
                </button>
                
                <button
                  onClick={() => setShowReconcileModal(true)}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Check size={14} />
                  <span>إجراء جرد / تسوية نقدية</span>
                </button>
              </div>
            </div>

            {/* List and Log of last transactions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm md:col-span-2 flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">سجل حركات الخزنة والصندوق العام</h3>
                <span className="text-[10px] bg-slate-105 px-2 py-0.5 rounded-lg font-bold text-slate-500">مجموع العمليات: {calculatedTreasury.activities.length} حركات</span>
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {calculatedTreasury.activities.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-slate-400 font-medium">سجل الحركات خالي حالياً.</p>
                  </div>
                ) : (
                  calculatedTreasury.activities.map(act => (
                    <div 
                      key={act.id} 
                      className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-4 transition-all ${
                        act.direction === 'in' 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-950/40' 
                          : 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-100 dark:border-rose-950/40'
                      }`}
                    >
                      <div className="flex gap-3 items-center">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          act.direction === 'in' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' 
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}>
                          {act.direction === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-slate-800 dark:text-slate-100">{act.statement}</div>
                          <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2.5 gap-y-0.5">
                            <span className="font-bold text-slate-500">معرف: {act.id}</span>
                            <span>التاريخ: {act.date}</span>
                            <span>بواسطة: {act.user}</span>
                            {act.notes && <span className="text-indigo-400">ملاحظات: {act.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className={`font-black text-sm whitespace-nowrap ${act.direction === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-450'}`}>
                        {act.direction === 'in' ? '+' : '-'}{act.amount.toLocaleString()} ر.ي
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. PAYMENT & RECEIPTS VOUCHERS (سندات القبض والصرف) */}
      {activeSubTab === 'vouchers' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">نظام سندات القبض والصرف الرسمي للأعمال</h3>
                <p className="text-[11px] text-slate-400 mt-1">إصدار ومتابعة السندات المالية لتثبيت المقبوضات والمدفوعات وطباعتها PDF</p>
              </div>

              <button
                onClick={() => setShowAddVoucherModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Plus size={14} />
                <span>إصدار سند مالي جديد</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="ابحث برقم السند، الدافع، البيان..."
                  value={voucherSearch}
                  onChange={e => setVoucherSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-9 pl-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <select
                  value={voucherTypeFilter}
                  onChange={e => setVoucherTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-705 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">كل السندات</option>
                  <option value="receipt">سندات القبض (Receipt)</option>
                  <option value="payment">سندات الصرف (Payment)</option>
                </select>
              </div>

              <div>
                <select
                  value={voucherStatusFilter}
                  onChange={e => setVoucherStatusFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-705 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">كل الحالات المستحقة</option>
                  <option value="draft">مسودة (غير معتمد)</option>
                  <option value="approved">معتمد ومرحل</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vouchers representation list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 font-bold">
                  <th className="pb-3 pl-3">رقم السند</th>
                  <th className="pb-3 px-3">التاريخ</th>
                  <th className="pb-3 px-3">النوع</th>
                  <th className="pb-3 px-3">الجهة / المستفيد</th>
                  <th className="pb-3 px-3">البيان والشرح</th>
                  <th className="pb-3 px-3">المبلغ</th>
                  <th className="pb-3 px-3">الحالة</th>
                  <th className="pb-3 pr-3 text-left">التحكم والطباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                      لا توجد سندات مالية تطابق فلاتر البحث الحالية.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-all font-medium">
                      <td className="py-3.5 pl-3 font-mono font-bold text-slate-900 dark:text-white">{v.id}</td>
                      <td className="py-3.5 px-3 min-w-[70px] whitespace-nowrap">{v.date}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          v.type === 'receipt' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {v.type === 'receipt' ? 'قبض' : 'صرف'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 max-w-[150px] truncate">{v.beneficiaryOrPayer}</td>
                      <td className="py-3.5 px-3 max-w-[220px] truncate" title={v.statement}>{v.statement}</td>
                      <td className="py-3.5 px-3 font-black text-slate-800 dark:text-slate-100">{v.amount.toLocaleString()} ر.ي</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          v.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/65 dark:text-emerald-200' 
                            : v.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/65 dark:text-amber-250'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {v.status === 'approved' ? 'معتمد' : v.status === 'draft' ? 'مسودة' : 'ملغي'}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3 text-left space-x-1 whitespace-nowrap">
                        {v.status === 'draft' && (
                          <button
                            onClick={() => approveVoucher(v)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 py-1.5 rounded-lg font-black cursor-pointer shadow-sm transition-all inline-flex items-center gap-1"
                            title="اعتماد السند وترحيله للخزنة"
                          >
                            <Check size={11} />
                            <span>اعتماد</span>
                          </button>
                        )}
                        
                        {v.status !== 'cancelled' && (
                          <button
                            onClick={() => cancelVoucher(v.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] px-2 py-1.5 rounded-lg font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                            title="إلغاء قيود السند المالي"
                          >
                            <Ban size={11} />
                            <span>إلغاء</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedPrintVoucher(v)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-lg font-black cursor-pointer shadow-sm transition-all inline-flex items-center gap-1"
                        >
                          <Printer size={11} />
                          <span>طباعة</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. GENERAL LEDGERS - EXPENSES & REVENUES (المصروفات والإيرادات العامة) */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">وحدة المصروفات والإيرادات التشغيلية العامة للمركز</h3>
                <p className="text-[11px] text-slate-400 mt-1">متابعة دقيقة لبنود الإيجارات، المياه، الكهرباء، المحروقات والخدمات المكتبية للتنبؤ بالمثاقيل</p>
              </div>

              <button
                onClick={() => setShowAddLedgerModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Plus size={14} />
                <span>تسجيل قيد (إيراد/مصروف) جديد</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="اصطلح على مصطلح بالوصف كالفاتورة..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pr-9 pl-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <select
                  value={ledgerTypeFilter}
                  onChange={e => setLedgerTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-705 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">كل البنود العامة</option>
                  <option value="expense">المصروفات العامة (Expenses)</option>
                  <option value="revenue">الإيرادات المذكورة (Revenues)</option>
                </select>
              </div>

              <div>
                <select
                  value={ledgerCategoryFilter}
                  onChange={e => setLedgerCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs font-bold text-slate-705 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">كل التصنيفات المعتمدة</option>
                  {expenseCategories.concat(revenueCategories).map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ledgers table representation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 font-bold">
                  <th className="pb-3 pl-3">معرّف المرجع</th>
                  <th className="pb-3 px-3">التاريخ</th>
                  <th className="pb-3 px-3">النوع</th>
                  <th className="pb-3 px-3">التصنيف</th>
                  <th className="pb-3 px-3">البيان والشرح الكامل</th>
                  <th className="pb-3 px-3">طريقة الدفع</th>
                  <th className="pb-3 px-3">الربط بالخزنة</th>
                  <th className="pb-3 pr-3 text-left">المبلغ كلياً</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredLedgers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">
                      لا توجد قيود مسجلة توافق كشف التصفية.
                    </td>
                  </tr>
                ) : (
                  filteredLedgers.map(lg => (
                    <tr key={lg.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-all font-medium">
                      <td className="py-3.5 pl-3 font-mono font-bold text-slate-450">{lg.id}</td>
                      <td className="py-3.5 px-3 whitespace-nowrap">{lg.date}</td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          lg.type === 'expense' 
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                        }`}>
                          {lg.type === 'expense' ? 'مصروف' : 'إيراد'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-indigo-900 dark:text-indigo-300">{lg.category}</td>
                      <td className="py-3.5 px-3 max-w-[300px] truncate" title={lg.statement}>{lg.statement}</td>
                      <td className="py-3.5 px-3">{lg.paymentMethod === 'cash' ? 'نقداً للصندوق' : lg.paymentMethod === 'bank_transfer' ? 'تحويل حساب' : 'أخرى'}</td>
                      <td className="py-3.5 px-3 text-center">
                        {lg.isLinkedToTreasury ? (
                          <span className="text-emerald-500 font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">مرتبط ومقيد</span>
                        ) : (
                          <span className="text-slate-400 text-[10px] bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">خارجي منبثق</span>
                        )}
                      </td>
                      <td className={`py-3.5 pr-3 text-left font-black text-sm ${lg.type === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {lg.amount.toLocaleString()} ر.ي
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. FINANCIAL INTEGRATION & RULES (الربط المالي الموحد وجسر الرابط السريع) */}
      {activeSubTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">وحدات الربط المالي وجسر السلف السريع</h3>
                <p className="text-[11px] text-slate-450 leading-relaxed mt-1">
                  نظام ذكي يراقب سحوبات وسلف الموظفين المسجلة بداخل شاشة السحوبات ويسمح بترحيل خصمها الفعلي من الخزينة بنقرة واحدة لضمان دقة السيولة المتوفرة.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Explanatory rules for integrated link */}
            <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 border-b pb-2">📂 قواعد الربط والتشغيل الموحد</h4>
              
              <ul className="space-y-3.5 text-xs text-slate-505 dark:text-slate-300 leading-relaxed font-semibold">
                <li className="flex gap-2">
                  <span className="text-indigo-500">1</span>
                  <span>إذا تم صرف سلفة لموظف من داخل الحركات الدفترية المعزولة، يمكن تصفيتها بقيد خروج من الخزينة من الجدول المجاور فورياً.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">2</span>
                  <span>عند اعتماد أي سند قبض أو صرف بصفة الخزينة، فإنه ينشئ تلقائياً حركة خزنة مناسبة مقابلة بدون تكرار أو تضارب.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">3</span>
                  <span>تحصيل قسط جمعية أو تسديدها، يمكن ربطه إما بصندوق الجمعية مباشرة أو ترحيله بالخزينة لضمان التوازن وحالات التأخر.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500">4</span>
                  <span>المصروفات و الإيرادات العامة تؤثر تلقائياً بالدولار واليمني بداخل الصندوق الرئيسي في حالة الرغبة بربط ترحيل الخزنة.</span>
                </li>
              </ul>
            </div>

            {/* Pivot Advances Log awaiting treasury posting */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm md:col-span-2 flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">سلف وعهد للموظفين معلّقة ومستحقة الصرف من الخزنة</h3>
                  <p className="text-[10px] text-slate-400 mt-1">تظهر هنا حركات الموظفين المستحقة للتصفية ليد الصندوق المقابل</p>
                </div>
                <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 px-2 py-0.5 rounded-lg font-black animate-pulse">
                  المتبقي: {pendingEmployeeAdvancesToHook.length} حركات
                </span>
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {pendingEmployeeAdvancesToHook.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-emerald-500 font-extrabold flex items-center justify-center gap-1.5 matches">
                      <span>🎉 ممتاز! تم ربط وتصفية كافة سلف الموظفين بالخزينة ولا توجد مستحقات معلقة بالصندوق.</span>
                    </p>
                  </div>
                ) : (
                  pendingEmployeeAdvancesToHook.map(tx => {
                    const emp = employees.find(e => e.id === tx.employeeId);
                    return (
                      <div key={tx.id} className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/10 text-xs flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-black text-slate-800 dark:text-slate-100">
                            صرف سلفة لـ ({emp ? emp.name : 'موظف'}) - {tx.statement}
                          </div>
                          <div className="text-[10px] text-slate-450 font-bold flex flex-wrap gap-2.5">
                            <span>صاحب المرجع: {emp?.jobTitle || 'موظف'}</span>
                            <span>رقم القيد: {tx.id}</span>
                            <span>تاريخ المعاملة: {tx.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-black text-rose-600 dark:text-rose-450">-{(tx.debit || 0).toLocaleString()} ر.ي</span>
                          <button
                            onClick={() => recordEmployeeTxToKhazna(tx)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
                          >
                            ربط وترحيل بالصندوق
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. ADD ACTIVITY MODAL */}
      <AnimatePresence>
        {showAddActivityModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-2xl max-w-md w-full scroll-py-2"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">تسجيل حركة صندوق يدوية</h3>
                <button onClick={() => setShowAddActivityModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateActivity} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-500 mb-1">نوع الحركة</label>
                  <select
                    value={newActivity.type}
                    onChange={e => {
                      const type = e.target.value as any;
                      const dir = ['deposit', 'general_revenue', 'transfer_from_employee', 'transfer_from_association'].includes(type) ? 'in' : 'out';
                      setNewActivity(prev => ({ ...prev, type, direction: dir }));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value="deposit">إيداع نقدي بالخزنة</option>
                    <option value="withdraw">سحب نقدي من الخزنة</option>
                    <option value="general_expense">مصروف تشغيلي عام</option>
                    <option value="general_revenue">إيراد مستلم خارجي</option>
                    <option value="transfer_to_employee">تحويل وصرف لعهدة موظف</option>
                    <option value="transfer_from_employee">استرداد عهدة من موظف</option>
                    <option value="cash_reconciliation">تسوية نقدية للمقاصة</option>
                    <option value="balance_correction">تصحيح وتعديل رصيد دفتري</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">البيان والشرح</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تغذية الصندوق الفرعي لضيافة مكتب الإدارة"
                    value={newActivity.statement}
                    onChange={e => setNewActivity(prev => ({ ...prev, statement: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">المبلغ (ر.ي)</label>
                    <input
                      type="number"
                      required
                      placeholder="الأرقام فقط"
                      value={newActivity.amount}
                      onChange={e => setNewActivity(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">اتجاه الحركة</label>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded-md font-black ${newActivity.direction === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {newActivity.direction === 'in' ? 'دخل للصندوق (+)' : 'خرج من الصندوق (-)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">الرابط بالموظفين (اختياري)</label>
                  <select
                    value={newActivity.relatedEntityId}
                    onChange={e => setNewActivity(prev => ({ ...prev, relatedEntityId: e.target.value, relatedEntityType: e.target.value ? 'employee' : 'general' }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value="">غير مرتبط بشكل مباشر بموظف</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobTitle})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">ملاحظات توثيقية إضافية</label>
                  <textarea
                    placeholder="بيانات سند الاستلام، تفاصيل الشيك، إلخ..."
                    value={newActivity.notes}
                    onChange={e => setNewActivity(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none h-16 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddActivityModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-750 px-4 py-2 rounded-xl"
                  >
                    إلغاء المعاملة
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-black"
                  >
                    ترحيل الحركة يدوياً
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ADD VOUCHER MODAL */}
      <AnimatePresence>
        {showAddVoucherModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-2xl max-w-md w-full scroll-py-2"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">إصدار سند مالي جديد</h3>
                <button onClick={() => setShowAddVoucherModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">نوع السند</label>
                    <select
                      value={newVoucher.type}
                      onChange={e => setNewVoucher(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="receipt">سند قبض مالي (ReceiptVoucher)</option>
                      <option value="payment">سند صرف نقدي (PaymentVoucher)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">طريقة الدفع/القبض</label>
                    <select
                      value={newVoucher.paymentMethod}
                      onChange={e => setNewVoucher(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="cash">نقداً باليد</option>
                      <option value="bank_transfer">تحويل نقدي/بنكي</option>
                      <option value="check">شيك مسحوب</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">اسم الطرف الآخر (المستفيد أو الدافع)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: صالح المرفدي للتوريدات العامة"
                    value={newVoucher.beneficiaryOrPayer}
                    onChange={e => setNewVoucher(prev => ({ ...prev, beneficiaryOrPayer: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">المبلغ (ر.ي)</label>
                    <input
                      type="number"
                      required
                      placeholder="المبلغ نقداً"
                      value={newVoucher.amount}
                      onChange={e => setNewVoucher(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">نوع جهة السند</label>
                    <select
                      value={newVoucher.relatedEntityType}
                      onChange={e => setNewVoucher(prev => ({ ...prev, relatedEntityType: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="external">جهة خارجية / عميل</option>
                      <option value="employee">موظف مسجل</option>
                      <option value="association">جمعية / صندوق</option>
                      <option value="treasury">الخزينة العامة مباشرة</option>
                    </select>
                  </div>
                </div>

                {newVoucher.relatedEntityType === 'employee' && (
                  <div>
                    <label className="block text-slate-500 mb-1">الموظف المرتبط</label>
                    <select
                      value={newVoucher.relatedEntityId}
                      onChange={e => setNewVoucher(prev => ({ ...prev, relatedEntityId: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="">اختر الموظف...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-500 mb-1">البيان والشرح</label>
                  <input
                    type="text"
                    required
                    placeholder="وصف تفصيلي لأجل توازن التدقيق والقياس"
                    value={newVoucher.statement}
                    onChange={e => setNewVoucher(prev => ({ ...prev, statement: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">ملاحظات</label>
                  <input
                    type="text"
                    placeholder="أي ملاحظات إشرافية إضافية"
                    value={newVoucher.notes}
                    onChange={e => setNewVoucher(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                  <input
                    type="checkbox"
                    id="autoPost"
                    checked={newVoucher.autoPostToTreasury}
                    onChange={e => setNewVoucher(prev => ({ ...prev, autoPostToTreasury: e.target.checked }))}
                    className="h-4 w-4 bg-transparent border-slate-350"
                  />
                  <label htmlFor="autoPost" className="text-[11px] font-black text-indigo-900 dark:text-indigo-300 cursor-pointer">
                    اعتماد السند فورياً وترحيل حركته تلقائياً بالخزنة (نوصي بتفعيله)
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddVoucherModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-750 px-4 py-2 rounded-xl"
                  >
                    إلغاء السند
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-black"
                  >
                    حفظ وإصدار السند
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. ADD LEDGER (GENERAL EXPENSE/REVENUE) MODAL */}
      <AnimatePresence>
        {showAddLedgerModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-2xl max-w-md w-full scroll-py-2"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">تسجيل إيراد أو مصروف عام للمؤسسة</h3>
                <button onClick={() => setShowAddLedgerModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateLedger} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">النوع</label>
                    <select
                      value={newLedger.type}
                      onChange={e => {
                        const val = e.target.value as 'expense' | 'revenue';
                        setNewLedger(prev => ({
                          ...prev,
                          type: val,
                          category: val === 'expense' ? expenseCategories[0] : revenueCategories[0]
                        }));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="expense">مصروف عام بالمركز (Outflow)</option>
                      <option value="revenue">إيراد مكتسب خارجي (Inflow)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">التصنيف المحاسبي</label>
                    <select
                      value={newLedger.category}
                      onChange={e => setNewLedger(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3"
                    >
                      {newLedger.type === 'expense' 
                        ? expenseCategories.map((c, i) => <option key={i} value={c}>{c}</option>)
                        : revenueCategories.map((c, i) => <option key={i} value={c}>{c}</option>)
                      }
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">البيان والشرح الكامل</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مقتنيات أحبار طابعات وقرطاسية رسمية"
                    value={newLedger.statement}
                    onChange={e => setNewLedger(prev => ({ ...prev, statement: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">المبلغ (ر.ي)</label>
                    <input
                      type="number"
                      required
                      placeholder="المبلغ بالأرقام"
                      value={newLedger.amount}
                      onChange={e => setNewLedger(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">طريقة الدفع</label>
                    <select
                      value={newLedger.paymentMethod}
                      onChange={e => setNewLedger(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                    >
                      <option value="cash">نقداً من الصندوق العام</option>
                      <option value="bank_transfer">تحويل من حساب جاري</option>
                      <option value="check">شيك محرر</option>
                      <option value="other">طريقة أخرى</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">ملاحظات وتفاصيل إضافية</label>
                  <input
                    type="text"
                    placeholder="ملاحظات المجلد أو سند الصرف الداخلي"
                    value={newLedger.notes}
                    onChange={e => setNewLedger(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
                  <input
                    type="checkbox"
                    id="linkKhazna"
                    checked={newLedger.isLinkedToTreasury}
                    onChange={e => setNewLedger(prev => ({ ...prev, isLinkedToTreasury: e.target.checked }))}
                    className="h-4 w-4 bg-transparent border-slate-350"
                  />
                  <label htmlFor="linkKhazna" className="text-[11px] font-black text-indigo-900 dark:text-indigo-300 cursor-pointer">
                    ربط بالخزنة فورياً (خصم نقدي من الخزنة مقابل هذا القيد)
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLedgerModal(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-750 px-4 py-2 rounded-xl"
                  >
                    إلغاء المعاملة
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-black"
                  >
                    تسجيل القيد بالدفتر العام
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECONCILE/JARD MODULE MODAL */}
      <AnimatePresence>
        {showReconcileModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-2xl max-w-sm w-full text-xs font-semibold"
            >
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">إجراء جرد وتسوية الخزنة</h3>
                <button onClick={() => setShowReconcileModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handlePerformReconciliation} className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border space-y-1">
                  <div className="flex justify-between">
                    <span>الرصيد الدفتري الحالي:</span>
                    <span className="font-bold text-indigo-650">{calculatedTreasury.currentBalance.toLocaleString()} ر.ي</span>
                  </div>
                  <p className="text-[10px] text-slate-400">سيتم مقارنة رصيدك الفعلي المعروض بالصندوق مع الرصيد المسجل بالنظام</p>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">المبلغ النقدي الفعلي بالخزنة (ر.ي)</label>
                  <input
                    type="number"
                    required
                    placeholder="أدخل الرصيد المادي الفعلي"
                    value={reconciliationInput.actualAmount}
                    onChange={e => setReconciliationInput(prev => ({ ...prev, actualAmount: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">الشرح والأسباب</label>
                  <textarea
                    placeholder="اكتب أسباب الفائض أو العجز في التسوية المكتشفة"
                    value={reconciliationInput.notes}
                    onChange={e => setReconciliationInput(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:outline-none h-16 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReconcileModal(false)}
                    className="bg-slate-100 text-slate-750 px-4 py-2 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold"
                  >
                    اعتماد تسوية الجرد
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. VOUCHER PRINT PRINT PREVIEW DIALOG/MODAL */}
      <AnimatePresence>
        {selectedPrintVoucher && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Actual Voucher Invoice Sheet to print */}
              <div id="print-sheet" className="p-4 bg-white border-2 border-dashed border-slate-250 rounded-xl">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                  <div>
                    <h1 className="text-xl font-black text-indigo-950">{appSettings.institution.name}</h1>
                    <span className="text-[10px] text-slate-400 font-bold block mt-1">{appSettings.institution.address}</span>
                    <span className="text-[10px] text-slate-400 font-bold block">هاتف: {appSettings.institution.phone}</span>
                  </div>
                  <div className="text-left">
                    <span className="bg-indigo-100 text-indigo-900 border border-indigo-200 px-3 py-1 rounded-full text-xs font-black select-none">
                      {selectedPrintVoucher.type === 'receipt' ? 'سند قـبـض رسمي' : 'سند صـرف رسمي'}
                    </span>
                    <span className="block text-xs font-mono font-bold mt-2.5 text-slate-400">رقم السند: {selectedPrintVoucher.id}</span>
                    <span className="block text-[10px] text-slate-400 mt-1">تاريخ المعاملة: {selectedPrintVoucher.date}</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs leading-loose">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-2.5 rounded-lg">
                      <span className="text-slate-450 block font-bold">اسم المستفيد أو الدافع:</span>
                      <span className="text-xs font-black text-slate-800">{selectedPrintVoucher.beneficiaryOrPayer}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg">
                      <span className="text-slate-450 block font-bold">المبلغ المدفوع:</span>
                      <span className="text-sm font-black text-indigo-950">{selectedPrintVoucher.amount.toLocaleString()} {appSettings.institution.currency}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg">
                    <span className="text-slate-450 block font-bold">البيان والشرح:</span>
                    <span className="text-xs font-bold text-slate-800">{selectedPrintVoucher.statement}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-[10px] text-slate-405">
                    <div>
                      <span className="block font-bold">طريقة القبض/الدفع:</span>
                      <span className="font-black text-slate-900">
                        {selectedPrintVoucher.paymentMethod === 'cash' ? 'نقداً باليد' : selectedPrintVoucher.paymentMethod === 'bank_transfer' ? 'تحويل حساب بنكي' : selectedPrintVoucher.paymentMethod === 'check' ? 'شيك مسحوب' : 'أخرى'}
                      </span>
                    </div>
                    <div>
                      <span className="block font-bold">محرر السند:</span>
                      <span className="font-black text-slate-900">{selectedPrintVoucher.user}</span>
                    </div>
                    <div>
                      <span className="block font-bold">حالة الاعتماد:</span>
                      <span className="font-black text-emerald-600">معتمد ومسجل بالخزنة</span>
                    </div>
                  </div>

                  {selectedPrintVoucher.notes && (
                    <div className="bg-yellow-50/50 p-2.5 rounded-lg border border-yellow-101 text-[11px] font-bold text-slate-650">
                      ملاحظات: {selectedPrintVoucher.notes}
                    </div>
                  )}
                </div>

                <div className="h-28 flex justify-between items-end border-t pt-2 mt-8 text-[10px] text-slate-400">
                  <div className="text-center w-28 border-t border-slate-300 pt-1 font-bold">المستلم والدافع</div>
                  <div className="text-center w-28 border-t border-slate-300 pt-1 font-bold">المحاسب المراجع</div>
                  <div className="text-center w-28 border-t border-slate-300 pt-1 font-bold">الختم والمصادقة المعتمدة</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 no-print">
                <button
                  onClick={() => setSelectedPrintVoucher(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  إغلاق النافذة
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2"
                >
                  <Printer size={14} />
                  <span>طباعة فورية بالمتصفح</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
