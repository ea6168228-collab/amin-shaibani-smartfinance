import React, { useState, useEffect } from 'react';
import { 
  Association, 
  AssociationPayment, 
  AssociationMember, 
  AssociationTransaction, 
  AssociationAuditLog,
  AssociationDueSchedule,
  AssociationReceipt,
  AssociationSettings,
  AssociationAlert,
  AssociationExport,
  Employee, 
  Transaction, 
  AppSettings, 
  UserRole 
} from '../types';
import { hasSystemPermission, isAbsoluteOwner, isMonthLocked } from '../utils/permissions';
import { 
  getScheduleDates, 
  formatDate, 
  computeSubscriberStats, 
  computeManagerStats, 
  calculatePenalty 
} from '../utils/associationHelpers';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  Coins, 
  Users, 
  Calendar, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Printer, 
  CheckCircle, 
  Info, 
  Sliders, 
  History, 
  Phone, 
  DollarSign, 
  User, 
  Clock, 
  Activity, 
  FileText,
  BadgeAlert,
  ChevronLeft,
  LayoutDashboard,
  Layers,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  BookOpen,
  FileBarChart,
  Bell,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AssociationsPDF from './AssociationsPDF';

interface AssociationsViewProps {
  employees: Employee[];
  transactions: Transaction[];
  setTransactions: (t: Transaction[]) => void;
  currentUserRole: UserRole;
  appSettings: AppSettings;
}

export default function AssociationsView({
  employees,
  transactions,
  setTransactions,
  currentUserRole,
  appSettings
}: AssociationsViewProps) {
  // Session details mapping consistent with custom workspaces
  const currentUserId = localStorage.getItem('amin_sh_user_id') || '';
  const isCustomWorkspace = currentUserRole === UserRole.USER && !!currentUserId && !['admin', 'accountant', 'viewer'].includes(currentUserId);
  const loggedInUserName = localStorage.getItem('amin_sh_logged_user') || 'مستخدم الموثق';

  const associationsKey = isCustomWorkspace ? `amin_sh_associations_${currentUserId}` : 'amin_sh_associations';
  const paymentsKey = isCustomWorkspace ? `amin_sh_payments_${currentUserId}` : 'amin_sh_payments';
  const membersKey = isCustomWorkspace ? `amin_sh_members_${currentUserId}` : 'amin_sh_members';
  const groupTxsKey = isCustomWorkspace ? `amin_sh_group_txs_${currentUserId}` : 'amin_sh_group_txs';
  const auditLogsKey = isCustomWorkspace ? `amin_sh_audit_logs_${currentUserId}` : 'amin_sh_audit_logs';
  const dueSchedulesKey = isCustomWorkspace ? `amin_sh_due_schedules_${currentUserId}` : 'amin_sh_due_schedules';
  const receiptsKey = isCustomWorkspace ? `amin_sh_receipts_${currentUserId}` : 'amin_sh_receipts';
  const assocSettingsKey = isCustomWorkspace ? `amin_sh_assoc_settings_${currentUserId}` : 'amin_sh_assoc_settings';
  const alertsKey = isCustomWorkspace ? `amin_sh_alerts_${currentUserId}` : 'amin_sh_alerts';
  const exportsKey = isCustomWorkspace ? `amin_sh_exports_${currentUserId}` : 'amin_sh_exports';

  // State Containers
  const [associations, setAssociations] = useState<Association[]>([]);
  const [payments, setPayments] = useState<AssociationPayment[]>([]);
  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [groupTransactions, setGroupTransactions] = useState<AssociationTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AssociationAuditLog[]>([]);
  const [dueSchedules, setDueSchedules] = useState<AssociationDueSchedule[]>([]);
  const [receipts, setReceipts] = useState<AssociationReceipt[]>([]);
  const [assocSettings, setAssocSettings] = useState<AssociationSettings[]>([]);
  const [alerts, setAlerts] = useState<AssociationAlert[]>([]);
  const [exportsData, setExportsData] = useState<AssociationExport[]>([]);

  // Selected State
  const [selectedAssocId, setSelectedAssocId] = useState<string | null>(null);
  const [assocMainTab, setAssocMainTab] = useState<'dashboard' | 'list' | 'create' | 'subscribers' | 'deposits' | 'withdrawals' | 'ledger' | 'reports' | 'alerts' | 'settings'>('dashboard');
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'transactions' | 'audit' | 'settings'>('overview');
  const [transactionSubTab, setTransactionSubTab] = useState<'ledger' | 'schedule' | 'receipts'>('ledger');
  const [selectedReceipt, setSelectedReceipt] = useState<AssociationReceipt | null>(null);

  // Modal Triggers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPDFOpen, setIsPDFOpen] = useState(false);

  // Edit/Record IDs
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Search filter inside tables
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // 1. Initial mounting & Loading state from LocalStorage
  useEffect(() => {
    const loadedAssocs = localStorage.getItem(associationsKey);
    const loadedPayments = localStorage.getItem(paymentsKey);
    const loadedMembers = localStorage.getItem(membersKey);
    const loadedGroupTxs = localStorage.getItem(groupTxsKey);
    const loadedAudits = localStorage.getItem(auditLogsKey);
    const loadedDueSchedules = localStorage.getItem(dueSchedulesKey);
    const loadedReceipts = localStorage.getItem(receiptsKey);
    const loadedAssocSettings = localStorage.getItem(assocSettingsKey);
    const loadedAlerts = localStorage.getItem(alertsKey);
    const loadedExports = localStorage.getItem(exportsKey);

    if (loadedAssocs) setAssociations(JSON.parse(loadedAssocs));
    if (loadedPayments) setPayments(JSON.parse(loadedPayments));
    if (loadedMembers) setMembers(JSON.parse(loadedMembers));
    if (loadedGroupTxs) setGroupTransactions(JSON.parse(loadedGroupTxs));
    if (loadedAudits) setAuditLogs(JSON.parse(loadedAudits));
    if (loadedDueSchedules) setDueSchedules(JSON.parse(loadedDueSchedules));
    if (loadedReceipts) setReceipts(JSON.parse(loadedReceipts));
    if (loadedAssocSettings) setAssocSettings(JSON.parse(loadedAssocSettings));
    if (loadedAlerts) setAlerts(JSON.parse(loadedAlerts));
    if (loadedExports) setExportsData(JSON.parse(loadedExports));
  }, [
    associationsKey, paymentsKey, membersKey, groupTxsKey, auditLogsKey,
    dueSchedulesKey, receiptsKey, assocSettingsKey, alertsKey, exportsKey
  ]);

  // Helper Auto-saver updates
  const saveAssociationsState = (updated: Association[]) => {
    setAssociations(updated);
    localStorage.setItem(associationsKey, JSON.stringify(updated));
  };
  const savePaymentsState = (updated: AssociationPayment[]) => {
    setPayments(updated);
    localStorage.setItem(paymentsKey, JSON.stringify(updated));
  };
  const saveMembersState = (updated: AssociationMember[]) => {
    setMembers(updated);
    localStorage.setItem(membersKey, JSON.stringify(updated));
  };
  const saveGroupTxsState = (updated: AssociationTransaction[]) => {
    setGroupTransactions(updated);
    localStorage.setItem(groupTxsKey, JSON.stringify(updated));
  };
  const saveAuditLogsState = (updated: AssociationAuditLog[]) => {
    setAuditLogs(updated);
    localStorage.setItem(auditLogsKey, JSON.stringify(updated));
  };
  const saveDueSchedulesState = (updated: AssociationDueSchedule[]) => {
    setDueSchedules(updated);
    localStorage.setItem(dueSchedulesKey, JSON.stringify(updated));
  };
  const saveReceiptsState = (updated: AssociationReceipt[]) => {
    setReceipts(updated);
    localStorage.setItem(receiptsKey, JSON.stringify(updated));
  };
  const saveAssocSettingsState = (updated: AssociationSettings[]) => {
    setAssocSettings(updated);
    localStorage.setItem(assocSettingsKey, JSON.stringify(updated));
  };
  const saveAlertsState = (updated: AssociationAlert[]) => {
    setAlerts(updated);
    localStorage.setItem(alertsKey, JSON.stringify(updated));
  };
  const saveExportsState = (updated: AssociationExport[]) => {
    setExportsData(updated);
    localStorage.setItem(exportsKey, JSON.stringify(updated));
  };

  // Helper form creators
  const [newAssocForm, setNewAssocForm] = useState({
    name: '',
    type: 'monthly' as 'daily' | 'weekly' | 'monthly',
    role: 'member' as 'member' | 'manager',
    installmentAmount: 10000,
    startDate: new Date().toISOString().split('T')[0],
    cyclesCount: 10,
    membersCount: 10,
    receiveTurn: 3,
    receiveDate: '',
    managerName: '',
    phone: '',
    notes: '',
    balanceCalculationType: 'cumulative' as 'cumulative' | 'outstanding',
    penaltyEnabled: false,
    penaltyType: 'percentage' as 'fixed' | 'percentage',
    penaltyValue: 2,
    continuePayingAfterPayout: true,
    postToGeneralLedger: false,
    paymentDestinationType: 'drawing' as 'drawing' | 'expense'
  });

  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    phone: '',
    installmentAmount: 0,
    receiveTurn: 1,
    receiveDate: '',
    notes: '',
    status: 'regular' as 'regular' | 'late' | 'withdrawn' | 'received',
    joinedDate: new Date().toISOString().split('T')[0]
  });

  const [newPaymentForm, setNewPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    statement: '',
    status: 'paid' as 'paid' | 'late' | 'delayed',
    memberId: '',
    linkedEmployeeId: ''
  });

  const [newGroupOpForm, setNewGroupOpForm] = useState({
    date: new Date().toISOString().split('T')[0],
    statement: '',
    type: 'payment' as 'payment' | 'late_payment' | 'received_association' | 'late_fee' | 'discount' | 'balance_adjustment' | 'refund' | 'expense' | 'manual_settlement',
    memberId: '',
    amount: 0,
    linkedEmployeeId: '',
    cycleNumber: 1,
    paymentStatus: 'paid' as 'paid' | 'partial' | 'late',
    notes: ''
  });

  const isReadOnly = !!appSettings.readonlyMode;

  // Permissions check (replaces previous static roles map with customizable Phase 3 dynamic permissions engine)
  const canModify = hasSystemPermission('associations') && !isReadOnly;

  // Active Context resolution
  const activeAssoc = associations.find(a => a.id === selectedAssocId);

  // Audit Logs recorder
  const writeAuditLog = (assocId: string, itemId: string, itemType: string, action: 'create' | 'edit' | 'delete', oldValue: string, newValue: string) => {
    const freshLog: AssociationAuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      associationId: assocId,
      itemId,
      itemType,
      action,
      modifier: loggedInUserName,
      date: new Date().toLocaleDateString('ar-YE') + " " + new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      oldValue,
      newValue
    };
    saveAuditLogsState([freshLog, ...auditLogs]);
  };

  // Create Saving Group Action
  const handleCreateAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن إنشاء الجمعيات أثناء تفعيل وضع القراءة فقط لحماية البيانات.');
      return;
    }
    if (!newAssocForm.name.trim()) return alert('الرجاء إدخال اسم الجمعية أولاً.');

    const cyclesCount = Number(newAssocForm.cyclesCount);
    const membersCount = newAssocForm.role === 'manager' ? Number(newAssocForm.membersCount) : 1;
    const totalAmount = newAssocForm.installmentAmount * (newAssocForm.role === 'manager' ? (membersCount * cyclesCount) : cyclesCount);

    const freshAssoc: Association = {
      id: `ASC-${Date.now()}`,
      name: newAssocForm.name,
      type: newAssocForm.type,
      role: newAssocForm.role,
      installmentAmount: Number(newAssocForm.installmentAmount),
      startDate: newAssocForm.startDate,
      endDate: getScheduleDates(newAssocForm.startDate, cyclesCount, newAssocForm.type).slice(-1)[0] || '',
      cyclesCount,
      membersCount,
      receiveTurn: Number(newAssocForm.receiveTurn),
      receiveDate: newAssocForm.receiveDate,
      totalAmount,
      status: 'active',
      managerName: newAssocForm.managerName,
      phone: newAssocForm.phone,
      notes: newAssocForm.notes,
      payoutStatus: 'not_received',
      receiveAmount: newAssocForm.installmentAmount * membersCount,
      balanceCalculationType: newAssocForm.balanceCalculationType,
      penaltyEnabled: newAssocForm.penaltyEnabled,
      penaltyType: newAssocForm.penaltyType,
      penaltyValue: Number(newAssocForm.penaltyValue),
      continuePayingAfterPayout: newAssocForm.continuePayingAfterPayout,
      postToGeneralLedger: newAssocForm.postToGeneralLedger,
      paymentDestinationType: newAssocForm.paymentDestinationType,
      showDelayedInDashboard: true
    };

    // Save settings record
    const freshSetting: AssociationSettings = {
      id: `SET-${Date.now()}`,
      associationId: freshAssoc.id,
      balanceCalculationType: freshAssoc.balanceCalculationType,
      penaltyEnabled: freshAssoc.penaltyEnabled,
      penaltyType: freshAssoc.penaltyType,
      penaltyValue: freshAssoc.penaltyValue,
      continuePayingAfterPayout: freshAssoc.continuePayingAfterPayout,
      postToGeneralLedger: freshAssoc.postToGeneralLedger,
      paymentDestinationType: freshAssoc.paymentDestinationType,
      notifyBeforeDays: 2,
      currency: appSettings.institution.currency || 'ر.ي',
      showActiveOnly: true
    };

    saveAssociationsState([freshAssoc, ...associations]);
    saveAssocSettingsState([freshSetting, ...assocSettings]);

    // Generate schedule if it's user subscription (role === 'member')
    if (freshAssoc.role === 'member') {
      const dates = getScheduleDates(freshAssoc.startDate, cyclesCount, freshAssoc.type);
      const freshSchedules: AssociationDueSchedule[] = dates.map((date, idx) => ({
        id: `DUE-${Date.now()}-${idx}`,
        associationId: freshAssoc.id,
        memberId: 'user',
        cycleNumber: idx + 1,
        dueDate: date,
        amountDue: freshAssoc.installmentAmount,
        amountPaid: 0,
        status: 'pending'
      }));
      saveDueSchedulesState([...dueSchedules, ...freshSchedules]);
    }

    writeAuditLog(freshAssoc.id, freshAssoc.id, 'جمعية', 'create', '', `إنشاء جمعية جديدة باسم: ${freshAssoc.name}`);
    
    // Close modal & reset
    setIsCreateModalOpen(false);
    setNewAssocForm({
      name: '',
      type: 'monthly',
      role: 'member',
      installmentAmount: 10000,
      startDate: new Date().toISOString().split('T')[0],
      cyclesCount: 10,
      membersCount: 10,
      receiveTurn: 3,
      receiveDate: '',
      managerName: '',
      phone: '',
      notes: '',
      balanceCalculationType: 'cumulative',
      penaltyEnabled: false,
      penaltyType: 'percentage',
      penaltyValue: 2,
      continuePayingAfterPayout: true,
      postToGeneralLedger: false,
      paymentDestinationType: 'drawing'
    });
  };

  // Delete Association Action
  const handleDeleteAssociation = (id: string, name: string) => {
    if (!canModify) return alert('ليست لديك السبل الأمنية الكافية لحذف أو أرشفة هذه الجمعية من النظام.');

    if (isAbsoluteOwner()) {
      if (confirm(`⚠️ تنبيه المالك: هل ترغب بحذف جمعية (${name}) نهائياً بالكامل ومسح جميع سجلات كشوف حسابها المشتركة وقرارات الصندوق؟\n\nنعم (موافق) = حذف نهائي ومسح دائم.\nلا (إلغاء) = سنقوم بنقل الجمعية إلى الأرشيف بأمان وتجميدها ليتسنى لك استرجاعها لاحقاً.`)) {
        saveAssociationsState(associations.filter(a => a.id !== id));
        savePaymentsState(payments.filter(p => p.associationId !== id));
        saveMembersState(members.filter(m => m.associationId !== id));
        saveGroupTxsState(groupTransactions.filter(t => t.associationId !== id));
        saveDueSchedulesState(dueSchedules.filter(d => d.associationId !== id));
        saveReceiptsState(receipts.filter(r => r.associationId !== id));
        saveAssocSettingsState(assocSettings.filter(s => s.associationId !== id));
        saveAlertsState(alerts.filter(a => a.associationId !== id));
        saveExportsState(exportsData.filter(e => e.associationId !== id));
        
        const postedCompanyTxs = transactions.filter(t => t.notes?.includes(`[الجمعية:${id}]`));
        if (postedCompanyTxs.length > 0) {
          setTransactions(transactions.filter(t => !t.notes?.includes(`[الجمعية:${id}]`)));
        }
        writeAuditLog(id, id, 'جمعية', 'delete', `جمعية: ${name}`, 'حذف نهائي كلي بواسطة المالك');
        if (selectedAssocId === id) setSelectedAssocId(null);
        alert('✅ تم حذف الجمعية وسجلاتها نهائياً بنجاح.');
      } else {
        // Soft Archive
        saveAssociationsState(associations.map(a => a.id === id ? { ...a, isArchived: true } : a));
        writeAuditLog(id, id, 'جمعية', 'edit', `جمعية: ${name}`, 'تصنيف وأرشفة حيازة الجمعية');
        alert('📥 تم أرشفة وتجميد الجمعية بنجاح.');
      }
    } else if (hasSystemPermission('archive')) {
      if (confirm(`⚠️ لا تمتلك صلاحية المالك لإجراء الحذف الكلي للتصميم الدفتري.\nهل ترغب بنقل جمعية (${name}) إلى الأرشيف وتجميدها مؤقتاً؟`)) {
        saveAssociationsState(associations.map(a => a.id === id ? { ...a, isArchived: true } : a));
        writeAuditLog(id, id, 'جمعية', 'edit', `جمعية: ${name}`, 'نقل للأرشيف لغياب صلاحية الحذف');
        alert('📥 تم نقل الجمعية إلى مستودع الأرشيف بأمان.');
      }
    } else {
      alert('⚠️ عذراً، لا تمتلك الصلاحية لإنهاء أو أرشفة الجمعيات.');
    }
  };

  // Close/Settle Association Action
  const handleCloseAssociation = () => {
    if (!activeAssoc) return;
    if (!canModify) return alert('ليست لديك الصلاحية الكافية لتصفية وإغلاق هذه الجمعية.');
    if (confirm(`هل أنت متأكد من رغبتك في تصفية وإغلاق جمعية (${activeAssoc.name}) نهائياً؟`)) {
      const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, status: 'closed' as any } : a);
      saveAssociationsState(updated);
      writeAuditLog(activeAssoc.id, activeAssoc.id, 'جمعية', 'edit', activeAssoc.status, `تعديل حالة الجمعية إلى: closed`);
      alert('✅ تم تصفية وإغلاق الجمعية بنجاح.');
    }
  };

  // Member management for managers
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssoc) return;
    if (!newMemberForm.name.trim()) return alert('الرجاء إدخال اسم العضو.');

    const installmentAmount = Number(newMemberForm.installmentAmount) || activeAssoc.installmentAmount;
    const memberStatus = newMemberForm.status || 'regular';
    const memberJoinedDate = newMemberForm.joinedDate || activeAssoc.startDate;

    if (editingMemberId) {
      const oldMem = members.find(m => m.id === editingMemberId);
      const updated = members.map(m => m.id === editingMemberId ? {
        ...m,
        name: newMemberForm.name,
        phone: newMemberForm.phone,
        installmentAmount,
        receiveTurn: Number(newMemberForm.receiveTurn),
        receiveDate: newMemberForm.receiveDate,
        notes: newMemberForm.notes,
        status: memberStatus,
        joinedDate: memberJoinedDate,
        receiveStatus: (memberStatus === 'received' ? 'received' : m.receiveStatus) as any
      } : m);
      saveMembersState(updated);

      // Update pending due schedules for this member
      const updatedSchedules = dueSchedules.map(sch => {
        if (sch.associationId === activeAssoc.id && sch.memberId === editingMemberId && sch.status === 'pending') {
          return { ...sch, amountDue: installmentAmount };
        }
        return sch;
      });
      saveDueSchedulesState(updatedSchedules);

      writeAuditLog(activeAssoc.id, editingMemberId, 'مشترك', 'edit', JSON.stringify(oldMem), `تعديل ملف المشترك: ${newMemberForm.name}`);
    } else {
      const freshMember: AssociationMember = {
        id: `MBR-${Date.now()}`,
        associationId: activeAssoc.id,
        name: newMemberForm.name,
        phone: newMemberForm.phone,
        installmentAmount,
        receiveTurn: Number(newMemberForm.receiveTurn),
        receiveDate: newMemberForm.receiveDate,
        receiveStatus: memberStatus === 'received' ? 'received' : 'not_received',
        notes: newMemberForm.notes,
        status: memberStatus,
        joinedDate: memberJoinedDate
      };
      saveMembersState([...members, freshMember]);

      // Generate dues schedule for the added member
      const dates = getScheduleDates(activeAssoc.startDate, activeAssoc.cyclesCount, activeAssoc.type);
      const freshSchedulesForMember: AssociationDueSchedule[] = dates.map((date, idx) => ({
        id: `DUE-${Date.now()}-${idx}`,
        associationId: activeAssoc.id,
        memberId: freshMember.id,
        cycleNumber: idx + 1,
        dueDate: date,
        amountDue: installmentAmount,
        amountPaid: 0,
        status: 'pending'
      }));
      saveDueSchedulesState([...dueSchedules, ...freshSchedulesForMember]);

      writeAuditLog(activeAssoc.id, freshMember.id, 'مشترك', 'create', '', `إضافة المشترك الجديد: ${freshMember.name}`);
    }

    setIsMemberModalOpen(false);
    setEditingMemberId(null);
    setNewMemberForm({
      name: '',
      phone: '',
      installmentAmount: 0,
      receiveTurn: 1,
      receiveDate: '',
      notes: '',
      status: 'regular',
      joinedDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleOpenEditMember = (m: AssociationMember) => {
    setEditingMemberId(m.id);
    setNewMemberForm({
      name: m.name,
      phone: m.phone,
      installmentAmount: m.installmentAmount,
      receiveTurn: m.receiveTurn,
      receiveDate: m.receiveDate,
      notes: m.notes,
      status: m.status || (m.receiveStatus === 'received' ? 'received' : 'regular'),
      joinedDate: m.joinedDate || activeAssoc?.startDate || new Date().toISOString().split('T')[0]
    });
    setIsMemberModalOpen(true);
  };

  const handleDeleteMember = (m: AssociationMember) => {
    if (!activeAssoc) return;
    if (!canModify) return alert('ليست لديك التراخيص الكافية لحذف أو أرشفة المشتركين.');

    if (isAbsoluteOwner()) {
      if (confirm(`⚠️ تنبيه المالك: هل ترغب بحذف المشترك (${m.name}) نهائياً بالكامل مع كافة جداول أقساطه وجدول استحقاقه؟\n\nنعم (موافق) = حذف نهائي مادي.\nلا (إلغاء) = سنقوم بنقل المشترك للأرشيف وتجميد حسابه.`)) {
        saveMembersState(members.filter(mem => mem.id !== m.id));
        saveDueSchedulesState(dueSchedules.filter(sch => sch.memberId !== m.id));
        writeAuditLog(activeAssoc.id, m.id, 'مشترك', 'delete', JSON.stringify(m), `حذف مادي نهائي للمشترك: ${m.name}`);
        alert('✅ تم حذف المشترك نهائياً.');
      } else {
        saveMembersState(members.map(mem => mem.id === m.id ? { ...mem, isArchived: true } : mem));
        writeAuditLog(activeAssoc.id, m.id, 'مشترك', 'edit', JSON.stringify(m), `نقل المشترك للأرشيف بقرار المالك: ${m.name}`);
        alert('📥 تم أرشفة المشترك بنجاح.');
      }
    } else if (hasSystemPermission('archive')) {
      if (confirm(`⚠️ ليس لديك صلاحية المالك للحذف النهائي لدفاتر المشتركين.\nهل ترغب بنقل المشترك (${m.name}) للأرشيف تلافياً لخلط التقارير؟`)) {
        saveMembersState(members.map(mem => mem.id === m.id ? { ...mem, isArchived: true } : mem));
        writeAuditLog(activeAssoc.id, m.id, 'مشترك', 'edit', JSON.stringify(m), `نقل المشترك للأرشيف: ${m.name}`);
        alert('📥 تم نقل المشترك بنجاح للأرشيف (يمكن للمالك فقط حذفه نهائياً).');
      }
    } else {
      alert('⚠️ عذراً، لا تمتلك الصلاحية لإنهاء أو أرشفة عضوية المشتركين.');
    }
  };

  // General Ledger Posting Synchronizer
  const postToGeneralAccounts = (
    assoc: Association,
    amount: number,
    isPayout: boolean, // true = payout, false = installment paid
    statement: string,
    linkedEmpId?: string
  ) => {
    if (!assoc.postToGeneralLedger) return;

    const txId = `TX-POST-${Date.now()}-${Math.floor(Math.random() * 100)}`;
    const assocTag = `[الجمعية:${assoc.id}]`;

    // Debit corresponds to money out (payment to system, or expense)
    // Credit corresponds to money in (earnings, or receipts)
    let debit = 0;
    let credit = 0;
    let fallbackType = 'other';

    if (assoc.role === 'member') {
      // I am paying installment = money goes out = debit
      debit = amount;
      credit = 0;
      fallbackType = assoc.paymentDestinationType === 'expense' ? 'other' : 'installment';
    } else {
      // Manager mode
      if (isPayout) {
        // Payout to member = money goes out = debit
        debit = amount;
        credit = 0;
        fallbackType = 'other';
      } else {
        // Subscriber pays manager = money coming in = credit
        debit = 0;
        credit = amount;
        fallbackType = 'custom_receipt';
      }
    }

    // Determine target employee: if linkedEmpId is provided, use that;
    // else, search if we have a default "صندوق الجمعيات" virtual employee; if not, fallback to 'all' or create one.
    let targetEmployeeId = linkedEmpId || 'all';

    const freshSystemTx: Transaction = {
      id: txId,
      employeeId: targetEmployeeId,
      date: new Date().toISOString().split('T')[0],
      type: fallbackType,
      statement: `${statement} ${assocTag}`,
      debit,
      credit,
      balance: 0, // will be auto calculated by system
      notes: `ترحيل تلقائي من موديول الجمعية الحسابية [الجمعية:${assoc.id}]`
    };

    setTransactions([...transactions, freshSystemTx]);
  };

  // Subscriber View: Register/Pay installment
  const handlePayInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssoc) return;

    if (isMonthLocked(newPaymentForm.date)) {
      if (!isAbsoluteOwner()) {
        alert(`⚠️ عذراً، لا يمكن تسجيل أو تعديل دفعات تتبع لشهر مغلق محاسبياً (${newPaymentForm.date.slice(0, 7)}).`);
        return;
      } else {
        const proceed = confirm(`⚠️ تنبيه المالك: الدفعة تقع في شهر مغلق محاسبياً (${newPaymentForm.date.slice(0, 7)}).\nهل ترغب بتخطّي القفل وتمرير العملية؟`);
        if (!proceed) return;
      }
    }

    if (editingPaymentId) {
      const oldPay = payments.find(p => p.id === editingPaymentId);
      const updated = payments.map(p => p.id === editingPaymentId ? {
        ...p,
        date: newPaymentForm.date,
        amount: Number(newPaymentForm.amount),
        statement: newPaymentForm.statement,
        status: newPaymentForm.status
      } : p);
      savePaymentsState(updated);
      writeAuditLog(activeAssoc.id, editingPaymentId, 'دفعة قسط', 'edit', JSON.stringify(oldPay), `تعديل دفعة بقيمة: ${newPaymentForm.amount}`);
    } else {
      const payAmount = Number(newPaymentForm.amount) || activeAssoc.installmentAmount;
      const freshPayment: AssociationPayment = {
        id: `PMT-${Date.now()}`,
        associationId: activeAssoc.id,
        date: newPaymentForm.date,
        amount: payAmount,
        statement: newPaymentForm.statement || `سداد قسط الجمعية الدورية - ${activeAssoc.name}`,
        status: newPaymentForm.status,
        penaltyApplied: 0
      };

      savePaymentsState([...payments, freshPayment]);

      // Update due schedule for subscriber
      const userScheds = dueSchedules.filter(sch => sch.associationId === activeAssoc.id && sch.memberId === 'user');
      const pendingSch = userScheds.find(sch => sch.status === 'pending' || sch.status === 'partially_paid');
      if (pendingSch) {
        const updatedSchedules = dueSchedules.map(sch => {
          if (sch.id === pendingSch.id) {
            const newPaid = sch.amountPaid + payAmount;
            const newStatus = newPaid >= sch.amountDue ? 'paid' : 'partially_paid';
            return { ...sch, amountPaid: newPaid, status: newStatus as any };
          }
          return sch;
        });
        saveDueSchedulesState(updatedSchedules);
      }

      // Record in receipts table
      const receiptNo = `REC-SUB-${Date.now()}`;
      const freshReceipt: AssociationReceipt = {
        id: `RCP-${Date.now()}`,
        associationId: activeAssoc.id,
        transactionId: freshPayment.id,
        memberId: 'user',
        receiptNumber: receiptNo,
        date: freshPayment.date,
        amount: payAmount,
        paymentMethod: 'نقداً',
        recipientName: activeAssoc.managerName || 'أمين الشيباني',
        notes: freshPayment.statement
      };
      saveReceiptsState([freshReceipt, ...receipts]);

      writeAuditLog(activeAssoc.id, freshPayment.id, 'دفعة قسط', 'create', '', `قيد دفعة قسط جديدة بقيمة: ${freshPayment.amount}`);

      // General accounts posting sync
      postToGeneralAccounts(activeAssoc, freshPayment.amount, false, freshPayment.statement, newPaymentForm.linkedEmployeeId);
    }

    setIsPaymentModalOpen(false);
    setEditingPaymentId(null);
    setNewPaymentForm({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      statement: '',
      status: 'paid',
      memberId: '',
      linkedEmployeeId: ''
    });
  };

  const handleOpenEditPayment = (p: AssociationPayment) => {
    setEditingPaymentId(p.id);
    setNewPaymentForm({
      date: p.date,
      amount: p.amount,
      statement: p.statement,
      status: p.status,
      memberId: p.memberId || '',
      linkedEmployeeId: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleDeletePayment = (p: AssociationPayment) => {
    if (!activeAssoc) return;
    if (!canModify) return alert('ليست لديك التراخيص الكافية لحذف هذه الدفعة.');

    // Month lockdown verification: can they delete a payment if the month is locked?
    if (isMonthLocked(p.date)) {
      if (!isAbsoluteOwner()) {
        alert(`⚠️ عذراً، لا يمكن حذف دفعات تتبع لشهر مغلق محاسبياً (${p.date.slice(0, 7)}).`);
        return;
      } else {
        const proceed = confirm(`⚠️ تنبيه المالك: الدفعة تقع في شهر مغلق محاسبياً (${p.date.slice(0, 7)}).\nهل تود تجاوز القفل وحذف الدفعة المحددة؟`);
        if (!proceed) return;
      }
    }

    if (!isAbsoluteOwner()) {
      alert('⚠️ عذراً، حذف قيود الدفعات والأقساط هي صلاحية المالك الحصري لضمان سلامة الإقرارات المحاسبية الدفترية.');
      return;
    }

    if (!confirm('هل تريد حذف هذه الدفعة نهائياً وعكس قيدها المحاسبي؟')) return;

    savePaymentsState(payments.filter(pay => pay.id !== p.id));
    
    // Reverse schedule status
    const userPaidScheds = dueSchedules.filter(sch => sch.associationId === activeAssoc.id && sch.memberId === 'user' && (sch.status === 'paid' || sch.status === 'partially_paid'));
    const lastPaidSch = userPaidScheds[userPaidScheds.length - 1];
    if (lastPaidSch) {
      const updatedScheds = dueSchedules.map(sch => {
        if (sch.id === lastPaidSch.id) {
          const revPaid = Math.max(0, sch.amountPaid - p.amount);
          return { ...sch, amountPaid: revPaid, status: (revPaid === 0 ? 'pending' : 'partially_paid') as any };
        }
        return sch;
      });
      saveDueSchedulesState(updatedScheds);
    }

    // Delete corresponding receipts
    saveReceiptsState(receipts.filter(rc => rc.transactionId !== p.id));

    writeAuditLog(activeAssoc.id, p.id, 'دفعة قسط', 'delete', JSON.stringify(p), `حذف قيد دفعة بقيمة: ${p.amount}`);
    
    // Reverse general ledger posting
    const tag = `[الجمعية:${activeAssoc.id}]`;
    const reversed = transactions.filter(t => !t.notes?.includes(tag) || !t.statement.includes(p.statement));
    setTransactions(reversed);
  };

  // Manager View: Operations Journal registry
  const handleAddGroupTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssoc) return;

    const opForm = newGroupOpForm;

    if (isMonthLocked(opForm.date)) {
      if (!isAbsoluteOwner()) {
        alert(`⚠️ عذراً، لا يمكن تسجيل عمليات أو قيود تتبع لشهر مغلق محاسبياً (${opForm.date.slice(0, 7)}).`);
        return;
      } else {
        const proceed = confirm(`⚠️ تنبيه المالك: قيد الحركة يقع في شهر مغلق محاسبياً (${opForm.date.slice(0, 7)}).\nهل ترغب بتخطّي القفل وتمرير العملية؟`);
        if (!proceed) return;
      }
    }

    const amount = Number(opForm.amount) || activeAssoc.installmentAmount;
    
    // Debit vs Credit matching:
    // debits = money out or deductions (received_association, refund, expense)
    // credits = money in or additions (payment, late_payment, late_fee, manual_settlement)
    let debit = 0;
    let credit = 0;

    const isDebitType = ['received_association', 'refund', 'expense', 'discount'].includes(opForm.type);
    if (isDebitType) {
      debit = amount;
    } else {
      credit = amount;
    }

    const memberDetails = members.find(m => m.id === opForm.memberId);
    const freshOp: AssociationTransaction = {
      id: `GOP-${Date.now()}`,
      associationId: activeAssoc.id,
      date: opForm.date,
      statement: opForm.statement || `${opForm.type === 'payment' ? 'تحصيل قسط' : 'عملية قيد'} - ${memberDetails?.name || 'صندوق عام'}`,
      type: opForm.type,
      debit,
      credit,
      balance: 0, // dynamic running balance calculated on render/save
      status: 'معتمد',
      memberId: opForm.memberId || undefined,
      memberName: memberDetails?.name || undefined,
      cycleNumber: Number(opForm.cycleNumber) || 1,
      paymentStatus: opForm.paymentStatus || 'paid',
      notes: opForm.notes || ''
    };

    // Calculate next balance
    const activeGroupTxs = groupTransactions.filter(t => t.associationId === activeAssoc.id);
    const prevBal = activeGroupTxs.reduce((sum, t) => sum + t.credit - t.debit, 0);
    freshOp.balance = prevBal + credit - debit;

    const updatedTxs = [...groupTransactions, freshOp];
    saveGroupTxsState(updatedTxs);

    // Update member schedule if payment or late payment
    if ((opForm.type === 'payment' || opForm.type === 'late_payment') && opForm.memberId) {
      const memberScheds = dueSchedules.filter(sch => sch.associationId === activeAssoc.id && sch.memberId === opForm.memberId);
      const pendingSch = memberScheds.find(sch => sch.status === 'pending' || sch.status === 'partially_paid');
      if (pendingSch) {
        const updatedSchedules = dueSchedules.map(sch => {
          if (sch.id === pendingSch.id) {
            const newPaid = sch.amountPaid + amount;
            const newStatus = newPaid >= sch.amountDue ? 'paid' : 'partially_paid';
            return { ...sch, amountPaid: newPaid, status: newStatus as any };
          }
          return sch;
        });
        saveDueSchedulesState(updatedSchedules);
      }
    }

    // Generate physical receipt record
    const receiptNo = `REC-MGR-${Date.now()}`;
    const freshReceipt: AssociationReceipt = {
      id: `RCP-${Date.now()}`,
      associationId: activeAssoc.id,
      transactionId: freshOp.id,
      memberId: opForm.memberId || 'all',
      receiptNumber: receiptNo,
      date: freshOp.date,
      amount: amount,
      paymentMethod: 'نقداً',
      recipientName: loggedInUserName,
      notes: freshOp.statement
    };
    saveReceiptsState([freshReceipt, ...receipts]);

    writeAuditLog(activeAssoc.id, freshOp.id, 'قيد حركة مجلة', 'create', '', `إضافة قيد حركة ${opForm.type} بقيمة: ${amount}`);

    // If payout, let's mark member received status true
    if (opForm.type === 'received_association' && opForm.memberId) {
      const updatedMembers = members.map(m => m.id === opForm.memberId ? {
        ...m,
        receiveStatus: 'received' as const,
        receiveDate: opForm.date,
        receiveAmount: amount,
        receiveStatusType: (opForm.paymentStatus === 'paid' ? 'completed' : opForm.paymentStatus === 'partial' ? 'partial' : 'postponed') as any,
        receiveNotes: opForm.notes || ''
      } : m);
      saveMembersState(updatedMembers);
    }

    // Post to general company ledger
    postToGeneralAccounts(activeAssoc, amount, isDebitType, freshOp.statement, opForm.linkedEmployeeId);

    // Reset Form
    setIsPaymentModalOpen(false);
    setNewGroupOpForm({
      date: new Date().toISOString().split('T')[0],
      statement: '',
      type: 'payment',
      memberId: '',
      amount: 0,
      linkedEmployeeId: '',
      cycleNumber: 1,
      paymentStatus: 'paid',
      notes: ''
    });
  };

  const handleDeleteGroupTransaction = (t: AssociationTransaction) => {
    if (!activeAssoc) return;
    if (!canModify) return alert('ليست لديك التراخيص الكافية لحذف هذه الحركة.');

    if (isMonthLocked(t.date)) {
      if (!isAbsoluteOwner()) {
        alert(`⚠️ عذراً، لا يمكن حذف قيود تتبع لشهر مغلق محاسبياً (${t.date.slice(0, 7)}).`);
        return;
      } else {
        const proceed = confirm(`⚠️ تنبيه المالك: قيد الحركة يتبع لشهر مغلق محاسبياً (${t.date.slice(0, 7)}).\nهل ترغب بتخطي القفل وتعميد الحذف؟`);
        if (!proceed) return;
      }
    }

    if (!isAbsoluteOwner()) {
      alert('⚠️ عذراً، حذف قيود الحركات الجماعية المحققة هي صلاحية المالك الحصري لضمان تماسك أرصدة الصناديق.');
      return;
    }

    if (!confirm('هل تريد حذف هذا القيد المحاسبي بالكامل وإعادة تدوير رصيد الصندوق؟')) return;

    saveGroupTxsState(groupTransactions.filter(gt => gt.id !== t.id));

    // Reverse schedule status
    if ((t.type === 'payment' || t.type === 'late_payment') && t.memberId) {
      const memberPaidScheds = dueSchedules.filter(sch => sch.associationId === activeAssoc.id && sch.memberId === t.memberId && (sch.status === 'paid' || sch.status === 'partially_paid'));
      const lastPaidSch = memberPaidScheds[memberPaidScheds.length - 1];
      if (lastPaidSch) {
        const updatedScheds = dueSchedules.map(sch => {
          if (sch.id === lastPaidSch.id) {
            const revPaid = Math.max(0, sch.amountPaid - (t.credit || t.debit));
            return { ...sch, amountPaid: revPaid, status: (revPaid === 0 ? 'pending' : 'partially_paid') as any };
          }
          return sch;
        });
        saveDueSchedulesState(updatedScheds);
      }
    }

    // Delete corresponding receipts
    saveReceiptsState(receipts.filter(rc => rc.transactionId !== t.id));

    writeAuditLog(activeAssoc.id, t.id, 'قيد حركة مجلة', 'delete', JSON.stringify(t), `حذف قيد الحركة المحقق: ${t.statement}`);

    // If it was payout, restore member received status
    if (t.type === 'received_association' && t.memberId) {
      const restoredMembers = members.map(m => m.id === t.memberId ? {
        ...m,
        receiveStatus: 'not_received' as const,
        receiveDate: ''
      } : m);
      saveMembersState(restoredMembers);
    }

    // Reverse company ledger
    const tag = `[الجمعية:${activeAssoc.id}]`;
    setTransactions(transactions.filter(tx => !tx.notes?.includes(tag) || !tx.statement.includes(t.statement)));
    alert('✅ تم حذف حركة الجمعية وإرجاع الأرصدة بنجاح.');
  };

  const totalSubPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalMgrCollected = groupTransactions.filter(t => t.type === 'payment' || t.type === 'late_payment').reduce((sum, t) => sum + t.credit, 0);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 1. TOP TABS CONTROL BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAssocMainTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'dashboard'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📊 لوحة المراقبة
          </button>
          <button
            onClick={() => setAssocMainTab('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'list'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🗂️ كشف الجمعيات
          </button>
          <button
            onClick={() => setAssocMainTab('subscribers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'subscribers'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            👥 المشتركين والأدوار
          </button>
          <button
            onClick={() => setAssocMainTab('deposits')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'deposits'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📥 الإيداعات والأقساط
          </button>
          <button
            onClick={() => setAssocMainTab('withdrawals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'withdrawals'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📤 الصرف والمستلمين
          </button>
          <button
            onClick={() => {
              setAssocMainTab('ledger');
              if (associations.length > 0 && !selectedAssocId) {
                setSelectedAssocId(associations[0].id);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'ledger'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📖 الدفتر المحاسبي
          </button>
          <button
            onClick={() => setAssocMainTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'reports'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📈 التقارير المالية
          </button>
          <button
            onClick={() => setAssocMainTab('alerts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              assocMainTab === 'alerts'
                ? 'bg-indigo-600 text-white animate-pulse'
                : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🔔 التنبيهات
          </button>
        </div>
      </div>

      {/* 2. SWITCHABLE SECTION PANELS */}
      {assocMainTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Personal Savings */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">إجمالي مدخراتي الشخصية</span>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Coins size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1 font-bold">
                <span className="text-xl font-black text-slate-900 dark:text-white">{totalSubPaid.toLocaleString()}</span>
                <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold">ر.ي</span>
              </div>
              <div className="mt-1.5 text-[9px] text-slate-400 font-bold">
                <span>مجموع المبالغ المقيدة في اشتراكاتي الشخصية بالجمعيات.</span>
              </div>
            </div>            {/* Card 2: Manager Collected */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">إجمالي تحصيلات الصناديق كمسؤول</span>
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Coins size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1 font-bold">
                <span className="text-xl font-black text-slate-900 dark:text-white">{totalMgrCollected.toLocaleString()}</span>
                <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold">ر.ي</span>
              </div>
              <div className="mt-1.5 text-[9px] text-slate-400 font-bold">
                <span>المبالغ المحصلة من المشتركين تحت إدارتك.</span>
              </div>
            </div>

            {/* Card 3: Active Savings Groups */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">الجمعيات النشطة</span>
                <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                  <Coins size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1 font-bold">
                <span className="text-xl font-black text-slate-900 dark:text-white">{associations.filter(a => !a.isArchived).length}</span>
                <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold">جمعية</span>
              </div>
              <div className="mt-1.5 text-[9px] text-slate-400 font-bold">
                <span>عدد الصناديق النشطة حالياً في كشف حساباتك.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {assocMainTab === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center bg-white dark:bg-zinc-900 p-4 border rounded-2xl gap-4">
            <div>
              <h4 className="font-black text-slate-905 dark:text-white text-xs">إدارة الصناديق والجروبات النشطة</h4>
              <p className="text-3xs text-slate-400">تابع وإدارة ومطابقة أرصدة المشتركين وصناديق التكافل والادخار.</p>
            </div>
            <div className="flex gap-2">
              {hasSystemPermission('archive') && (
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-3 py-1 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer ${
                    showArchived
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                      : 'bg-white dark:bg-zinc-900 border-slate-205 dark:border-zinc-850 text-slate-500'
                  }`}
                >
                  {showArchived ? '📂 إخفاء الأرشيف' : '🗄️ عرض الأرشيف'}
                </button>
              )}
              <button onClick={() => setAssocMainTab('create')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white font-extrabold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer">
                <Plus size={12} />
                <span>أضف جمعية</span>
              </button>
            </div>
          </div>

          {associations.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-zinc-900 border rounded-2xl max-w-sm mx-auto shadow-sm">
              <Info className="text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-xs">لا توجد جمعيات حتى الآن</h4>
              <button onClick={() => setAssocMainTab('create')} className="mt-3 px-3 py-1.5 bg-indigo-600 text-white text-3xs font-extrabold rounded">اضغط مضافاً للجمعية</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-bold">
              {associations.filter(a => !a.isArchived || showArchived).map((assoc) => {
                const isMgr = assoc.role === 'manager';
                const sStats = !isMgr ? computeSubscriberStats(assoc, payments) : null;
                const mStats = isMgr ? computeManagerStats(assoc, members, groupTransactions) : null;

                return (
                  <div key={assoc.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-205 dark:border-zinc-805 p-4 flex flex-col justify-between shadow-3sm hover:border-slate-300">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-1.5 items-center">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded ${isMgr ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>{isMgr ? 'مدير' : 'مشترك'}</span>
                          {assoc.isArchived && (
                            <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded font-bold">مؤرشفة</span>
                          )}
                        </div>
                        <span className="text-[9px] bg-slate-55 dark:bg-zinc-800 text-slate-500 rounded px-2 py-0.5">{assoc.type === 'monthly' ? 'شهري' : assoc.type === 'weekly' ? 'أسبوعي' : 'يومي'}</span>
                      </div>
                      <h4 className="font-black text-slate-905 dark:text-white text-xs truncate">{assoc.name}</h4>
                      <div className="border-t my-3 pt-3 space-y-1.5 text-3xs text-slate-500">
                        {isMgr && mStats ? (
                          <>
                            <div className="flex justify-between"><span>رصيد الصندوق:</span><span className="font-bold text-emerald-600">{mStats.chestBalance.toLocaleString()} ر.ي</span></div>
                            <div className="flex justify-between"><span>إجمالي المدفوع:</span><span className="font-bold text-indigo-600">{mStats.totalCollected.toLocaleString()} ر.ي</span></div>
                          </>
                        ) : sStats ? (
                          <>
                            <div className="flex justify-between"><span>ما سددته لليوم:</span><span className="font-bold text-emerald-600">{sStats.totalPaid.toLocaleString()} ر.ي</span></div>
                            <div className="flex justify-between"><span>الالتزام المتبقي:</span><span className="font-bold text-slate-700">{sStats.totalRemaining.toLocaleString()} ر.ي</span></div>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAssocId(assoc.id);
                          setAssocMainTab('ledger');
                          setActiveTab('overview');
                        }}
                        className="flex-1 py-1 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 border border-slate-200 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 text-3xs font-extrabold rounded text-center cursor-pointer"
                      >
                        تحميل الدفتر المحاسبي 📂
                      </button>
                      
                      {assoc.isArchived ? (
                        <button
                          onClick={() => {
                            if (!canModify) return alert('ليست لديك التراخيص الكافية لفك أرشفة الجمعيات.');
                            saveAssociationsState(associations.map(a => a.id === assoc.id ? { ...a, isArchived: false } : a));
                            alert('✅ تم تنشيط وفك أرشفة الجمعية بنجاح.');
                          }}
                          className="px-2 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 rounded font-extrabold text-[10px] cursor-pointer"
                          title="فك الأرشفة والتنشيط"
                        >
                          ↩️ تنشيط
                        </button>
                      ) : (
                        <button onClick={() => handleDeleteAssociation(assoc.id, assoc.name)} className="p-1 text-rose-500 hover:bg-rose-50 rounded">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. CREATE SECTION */}
      {assocMainTab === 'create' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4 max-w-lg mx-auto animate-fade-in text-right" dir="rtl">
          <div className="pb-3 border-b flex items-center gap-2">
            <PlusCircle className="text-indigo-600" size={16} />
            <h4 className="font-black text-xs text-slate-805 dark:text-white">تأسيس جمعية جديدة بالدفتر</h4>
          </div>
          <form onSubmit={(e) => { handleCreateAssociation(e); setAssocMainTab('list'); }} className="space-y-4 text-xs leading-normal font-bold">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-slate-400 mb-1">اسم الجمعية:</span>
                <input type="text" required value={newAssocForm.name} onChange={e => setNewAssocForm(p => ({ ...p, name: e.target.value }))} className="w-full p-2 bg-slate-50 dark:bg-zinc-850 border border-slate-240 rounded text-slate-900 dark:text-white" />
              </div>
              <div>
                <span className="block text-slate-400 mb-1">الدورية المعتمدة:</span>
                <select value={newAssocForm.type} onChange={e => setNewAssocForm(p => ({ ...p, type: e.target.value as any }))} className="w-full p-2 bg-slate-50 dark:bg-zinc-850 border border-slate-240 rounded text-slate-900 dark:text-white">
                  <option value="daily">يومية</option>
                  <option value="weekly">أسبوعية</option>
                  <option value="monthly">شهرية</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-slate-400 mb-1">الصفة بالجمعية:</span>
                <select value={newAssocForm.role} onChange={e => setNewAssocForm(p => ({ ...p, role: e.target.value as any }))} className="w-full p-2 bg-slate-50 dark:bg-zinc-850 border border-slate-240 rounded text-slate-900 dark:text-white">
                  <option value="member">أنا مشترك</option>
                  <option value="manager">أنا مدير ومسؤول</option>
                </select>
              </div>
              <div>
                <span className="block text-slate-400 mb-1">قسط الاشتراك الدوري:</span>
                <input type="number" required value={newAssocForm.installmentAmount} onChange={e => setNewAssocForm(p => ({ ...p, installmentAmount: Number(e.target.value) }))} className="w-full p-2 bg-slate-50 dark:bg-zinc-850 border border-slate-240 rounded text-center font-mono text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-slate-400 mb-1">تاريخ بداية السريان:</span>
                <input type="date" required value={newAssocForm.startDate} onChange={e => setNewAssocForm(p => ({ ...p, startDate: e.target.value }))} className="w-full p-2 bg-slate-50 dark:bg-zinc-850 border border-slate-240 rounded text-center font-mono text-slate-900 dark:text-white" />
              </div>
              <div>
                <span className="block text-slate-400 mb-1">عدد الدورات والأقساط:</span>
                <input type="number" required value={newAssocForm.cyclesCount} onChange={e => setNewAssocForm(p => ({ ...p, cyclesCount: Number(e.target.value) }))} className="w-full p-2 bg-slate-50 dark:bg-zinc-850 border border-slate-240 rounded text-center font-mono text-slate-900 dark:text-white" />
              </div>
            </div>

            {newAssocForm.role === 'member' ? (
              <div className="grid grid-cols-2 gap-3 bg-slate-55 dark:bg-zinc-850 p-2.5 rounded border border-slate-100 dark:border-zinc-800">
                <div>
                  <span className="block text-slate-500 mb-1">ترتيب الاستلام:</span>
                  <input type="number" value={newAssocForm.receiveTurn} onChange={e => setNewAssocForm(p => ({ ...p, receiveTurn: Number(e.target.value) }))} className="w-full p-2 bg-white dark:bg-zinc-900 border rounded text-center font-mono text-slate-900 dark:text-white" />
                </div>
                <div>
                  <span className="block text-slate-500 mb-1">تاريخ الاستلام التقديرى:</span>
                  <input type="date" value={newAssocForm.receiveDate} onChange={e => setNewAssocForm(p => ({ ...p, receiveDate: e.target.value }))} className="w-full p-2 bg-white dark:bg-zinc-900 border rounded text-center font-mono text-slate-900 dark:text-white" />
                </div>
              </div>
            ) : (
              <div>
                <span className="block text-slate-400 mb-1">عدد المشتركين بالجمعية:</span>
                <input type="number" value={newAssocForm.membersCount} onChange={e => setNewAssocForm(p => ({ ...p, membersCount: Number(e.target.value) }))} className="w-full p-2 bg-slate-50 dark:bg-zinc-850 border border-slate-240 rounded text-center font-mono text-slate-900 dark:text-white" />
              </div>
            )}

            <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg shadow cursor-pointer text-center">جدولة وحفظ السجل بالتأسيس الفعلي 🚀</button>
          </form>
        </div>
      )}

      {/* 4. SUBSCRIBER MANAGEMENT */}
      {assocMainTab === 'subscribers' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border p-4 space-y-4 animate-fade-in shadow-sm">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="text-xs font-black text-slate-805 dark:text-white">سجل قيد المشتركين والأدوار الفورية بالصناديق</h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">تصفية حافظة الجمعية:</span>
              <select value={selectedAssocId || ''} onChange={e => setSelectedAssocId(e.target.value || null)} className="p-1 bg-slate-50 border rounded text-3xs">
                <option value="">-- اختر جمعية نشطة --</option>
                {associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          {!selectedAssocId ? (
            <p className="text-center py-6 text-slate-400 text-3xs">الرجاء اختيار جمعية من شريط التصفية أعلاه لإدارة المشتركين فيها.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-850 p-2 rounded">
                <span className="text-3xs text-indigo-700 font-extrabold">الجمعية: {activeAssoc?.name}</span>
                {canModify && activeAssoc?.role === 'manager' && (
                  <button onClick={() => {
                    setEditingMemberId(null);
                    setNewMemberForm({ name: '', phone: '', installmentAmount: activeAssoc?.installmentAmount || 0, receiveTurn: members.filter(m => m.associationId === activeAssoc?.id).length + 1, receiveDate: '', notes: '' });
                    setIsMemberModalOpen(true);
                  }} className="px-2 py-1 bg-indigo-600 text-white text-3xs font-extrabold rounded">+ مشترك جديد</button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-3xs">
                  <thead><tr className="border-b text-slate-500 font-bold bg-slate-100">
                    <th className="py-2 px-2">رول الاستلام</th><th>الاسم المعتمد في الجدول</th><th>المحمول والاتصال</th><th>قسط الاشتراك</th><th>حالة الاستلام</th>{canModify && activeAssoc?.role === 'manager' && <th className="text-left w-16">الخيارات</th>}
                  </tr></thead>
                  <tbody>{members.filter(m => m.associationId === selectedAssocId).map(m => (
                    <tr key={m.id} className="border-b">
                      <td className="py-2 px-2 font-black">#{m.receiveTurn}</td><td className="font-extrabold">{m.name}</td><td className="font-mono">{m.phone || 'بدون اتصال'}</td><td className="font-extrabold text-indigo-600">{m.installmentAmount.toLocaleString()} ر.ي</td><td><span className={`px-1.5 py-0.2 rounded text-[9px] ${m.receiveStatus === 'received' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-55 text-slate-500'}`}>{m.receiveStatus === 'received' ? 'مستلم ✅' : 'لم يستلم ⏳'}</span></td>
                      {canModify && activeAssoc?.role === 'manager' && (
                        <td className="text-left"><button onClick={() => handleOpenEditMember(m)} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">تعديل</button> <button onClick={() => handleDeleteMember(m)} className="px-1.5 py-0.5 bg-rose-50 text-rose-500 rounded">حذف</button></td>
                      )}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. DEPOSITS LEDGER */}
      {assocMainTab === 'deposits' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border p-4 space-y-4 animate-fade-in shadow-sm">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="text-xs font-black text-slate-805 dark:text-white">سجل الإيداعات والمبالغ المقبوضة المحصلة بالجمعيات</h4>
            <select value={selectedAssocId || ''} onChange={e => setSelectedAssocId(e.target.value || null)} className="p-1 bg-slate-50 border rounded text-3xs">
              <option value="">-- اختر جمعية لتسجيل الإيداع --</option>
              {associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {!selectedAssocId ? (
            <p className="text-center py-6 text-slate-400 text-3xs">الرجاء تصفية الجمعية من الأعلى لعرض حصر الإيداعات ومطالبتها.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-850 p-2.5 rounded">
                <span className="text-3xs font-extrabold text-slate-750">الجمعية المحددة: {activeAssoc?.name}</span>
                {canModify && (
                  <button onClick={() => {
                    setEditingPaymentId(null);
                    setNewGroupOpForm({ date: new Date().toISOString().split('T')[0], statement: 'إيداع قسط دوري عريض بالدفتر', type: 'payment', memberId: '', amount: activeAssoc?.installmentAmount || 0, linkedEmployeeId: '' });
                    setIsPaymentModalOpen(true);
                  }} className="px-3 py-1 bg-indigo-600 text-white text-3xs font-extrabold rounded shadow">+ قيد إيداع جديد بالدفتر</button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-3xs">
                  <thead><tr className="border-b text-slate-500 font-bold">
                    <th className="py-2 px-2">رقم القيد</th><th>التاريخ والوصف</th><th>المشترك القائم بالإيداع</th><th>المبلغ المحصل</th>{canModify && <th>الخيارات</th>}
                  </tr></thead>
                  <tbody>{groupTransactions.filter(t => t.associationId === selectedAssocId && (t.type === 'payment' || t.type === 'late_payment')).map(t => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2 px-2">#{t.id.slice(-6)}</td><td><span className="font-bold">{t.statement}</span><span className="block text-[9px] text-slate-400">{t.date}</span></td><td>{t.memberName || 'صندوق كلي عريض'}</td><td className="font-extrabold text-emerald-600">{t.credit.toLocaleString()} ر.ي</td><td>{canModify && <button onClick={() => handleDeleteGroupTransaction(t)} className="text-rose-500 hover:underline">إلغاء وعكس</button>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. WITHDRAWALS (PAYOUTS) */}
      {assocMainTab === 'withdrawals' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border p-4 space-y-4 animate-fade-in shadow-sm">
          <div className="flex justify-between items-center border-b pb-3">
            <h4 className="text-xs font-black text-slate-805 dark:text-white">سجل الاستلامات الدورية الفورية (حركات الصرف للجمعية للمستلم)</h4>
            <select value={selectedAssocId || ''} onChange={e => setSelectedAssocId(e.target.value || null)} className="p-1 bg-slate-50 border rounded text-3xs">
              <option value="">-- اختر جمعية --</option>
              {associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          {!selectedAssocId ? (
            <p className="text-center py-6 text-slate-400 text-3xs">حدد جمعيات لمشاهدة حركات مستلمي كشوفات الجمعيات بالجمعية.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-zinc-850 p-2.5 rounded">
                <span className="text-3xs font-extrabold text-indigo-700">الجمعية: {activeAssoc?.name} ({activeAssoc?.role === 'manager' ? 'مدير' : 'مشترك'})</span>
                {canModify && activeAssoc?.role === 'manager' && (
                  <button onClick={() => {
                    setNewGroupOpForm({ date: new Date().toISOString().split('T')[0], statement: 'عملية صرف وتسليم الجمعية للمستلم', type: 'received_association', memberId: '', amount: (activeAssoc?.installmentAmount || 0) * (activeAssoc?.membersCount || 1), linkedEmployeeId: '' });
                    setIsPayoutModalOpen(true);
                  }} className="px-3 py-1 bg-teal-600 text-white text-3xs font-extrabold rounded shadow">+ تسجيل صرف للجمعية (المستلم)</button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-3xs">
                  <thead><tr className="border-b text-slate-500 bg-slate-50">
                    <th className="py-2 px-2">رقم الصرف</th><th>الوصف للتسليم</th><th>اسم المستلم الحائز على الدور</th><th>إجمالي المبلغ المصروف له</th>{canModify && <th>خيارات</th>}
                  </tr></thead>
                  <tbody>{groupTransactions.filter(t => t.associationId === selectedAssocId && (t.type === 'received_association')).map(t => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2 px-2 font-mono">#{t.id.slice(-6)}</td><td className="font-extrabold">{t.statement}</td><td>{t.memberName || 'غير معروف'}</td><td className="font-extrabold text-rose-500">{t.debit.toLocaleString()} ر.ي</td><td>{canModify && <button onClick={() => handleDeleteGroupTransaction(t)} className="text-rose-500 hover:underline">إلغاء وعكس</button>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. LEDGER MAIN PANEL */}
      {assocMainTab === 'ledger' && !selectedAssocId && (
        <div className="animate-fade-in p-6 bg-white dark:bg-zinc-900 border rounded-2xl max-w-sm mx-auto text-center shadow-3sm">
          <BookOpen className="text-indigo-600 mx-auto mb-2" size={28} />
          <h4 className="font-black text-xs text-slate-808">يرجى اختيار جمعية من الصناديق لعرض كشف حسابها</h4>
          <select value={selectedAssocId || ''} onChange={e => setSelectedAssocId(e.target.value || null)} className="mt-3 w-full p-2 bg-slate-50 dark:bg-zinc-850 border rounded text-3xs">
            <option value="">-- اختر جمعية نشطة --</option>
            {associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      {/* 8. REPORTS PORTAL */}
      {assocMainTab === 'reports' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border p-5 space-y-4 animate-fade-in text-right">
          <div className="pb-3 border-b flex items-center gap-2"><FileBarChart className="text-indigo-650" size={16} /> <h4 className="font-black text-xs text-slate-900 dark:text-white">التقارير والمقاصات المحاسبية والقوائم الجغرافية</h4></div>
          <p className="text-3xs text-slate-400 font-bold leading-relaxed">أمين الشيباني المالي يوفر لك تقارير وميزانيات فورية للجمعيات المصنفة ومقاعدها التراكمية:</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 rounded-xl space-y-2">
              <span className="block font-extrabold text-2xs text-indigo-750">تقرير ميزان المراجعة الفوري</span>
              <p className="text-3xs text-slate-400">ملخص ومطابقة الحسابات العامة للمقبوضات والالتزامات لكافة الجروبات.</p>
              <button onClick={() => alert('تم توليد كشف التحصيل المئوي لكافة دافعي الأقساط.')} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-550 text-white rounded font-extrabold text-3xs shadow-sm shadow-indigo-600/10 cursor-pointer">طباعة ميزان المراجعة 🖨️</button>
            </div>
            
            <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 rounded-xl space-y-2">
              <span className="block font-extrabold text-2xs text-teal-750">سندات قبض الكلي وعقود الدور</span>
              <p className="text-3xs text-slate-400">تصدير جميع سندات الصرف والقبض للجهات الائتمانية.</p>
              <button onClick={() => {
                if (!selectedAssocId) return alert('يرجى اختيار جمعية معينة أولاً من التصفية.');
                setIsPDFOpen(true);
              }} className="px-3 py-1 bg-teal-600 hover:bg-teal-555 text-white rounded font-extrabold text-3xs shadow-sm shadow-teal-600/10 cursor-pointer">تصديق تقرير PDF للجمعية 📥</button>
            </div>
          </div>
        </div>
      )}

      {/* 9. ALERTS */}
      {assocMainTab === 'alerts' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border p-5 space-y-4 animate-fade-in text-right">
          <div className="pb-3 border-b flex items-center gap-2"><Bell className="text-rose-500 animate-bounce" size={16} /> <h4 className="font-black text-xs text-slate-900 dark:text-white">تنبيهات وتأخيرات جارية وقيد المطالبة</h4></div>
          <div className="space-y-2.5">
            {dueSchedules.filter(s => s.status === 'pending' && new Date(s.dueDate) < new Date()).length === 0 ? (
              <p className="text-center text-slate-400 text-3xs py-8">مبارك! لا توجد أقساط متأخرة أو تنبيهات نشطة حالياً. كل الحسابات ملتزمة تماماً.</p>
            ) : (
              dueSchedules.filter(s => s.status === 'pending' && new Date(s.dueDate) < new Date()).map((sIdx) => {
                const gp = associations.find(a => a.id === sIdx.associationId);
                const mb = members.find(m => m.id === sIdx.memberId);
                return (
                  <div key={sIdx.id} className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950 rounded-xl text-3xs flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-rose-800 dark:text-rose-400">تأخر في القسط #{sIdx.cycleNumber} - بمبلغ {sIdx.amountDue.toLocaleString()} ر.ي</span>
                      <span className="block text-slate-400 mt-1">الجمعية: {gp?.name || 'مستقلة'} - المشترك: {mb?.name || 'مستقل'}</span>
                    </div>
                    <span className="font-mono text-slate-400 font-extrabold">{sIdx.dueDate}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 10. SETTINGS */}
      {assocMainTab === 'settings' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border p-5 space-y-4 animate-fade-in text-right">
          <div className="pb-3 border-b flex items-center gap-2"><Settings className="text-slate-600" size={16} /> <h4 className="font-black text-xs text-slate-900 dark:text-white">إعدادات وقواعد العمل وضوابط الترحيل</h4></div>
          <div className="space-y-4 text-3xs font-extrabold text-slate-600 leading-relaxed">
            <div>
              <span className="block text-slate-800 dark:text-white mb-1">العملة الافتراضية للعمل بالنظام:</span>
              <input type="text" value={appSettings.institution.currency} disabled className="p-2 bg-slate-50 dark:bg-zinc-850 rounded border text-3xs w-36" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" defaultChecked disabled className="h-4 w-4 text-indigo-650" />
              <span>تصفية الصناديق آلياً عند انتهاء خط التحصيل الكلي للبرامج.</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked disabled className="h-4 w-4 text-indigo-650" />
              <span>الربط الكلي المباشر مع الحسابات الجارية باليومية العامة.</span>
            </div>
          </div>
        </div>
      )}

      {assocMainTab === 'ledger' && selectedAssocId && (
        /* Detailed Cabin layout */
        <AnimatePresence mode="wait">
          <motion.div
            key="association-cabin"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            className="space-y-6"
          >
            {/* Header bar area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100/40 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedAssocId(null)}
                  className="p-2.5 bg-white dark:bg-zinc-800 border border-slate-205 dark:border-zinc-700 rounded-xl hover:bg-slate-50 text-slate-600 dark:text-zinc-300 shadow-sm cursor-pointer"
                >
                  <ArrowRight size={16} />
                </button>
                <div>
                  <h3 className="font-black text-slate-905 dark:text-white text-base flex items-center gap-2">
                    <span>{activeAssoc?.name}</span>
                    <span className="text-2xs bg-indigo-100 text-indigo-805 px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                      {activeAssoc?.role === 'manager' ? 'مدير' : 'مشترك'}
                    </span>
                  </h3>
                  <p className="text-slate-500 dark:text-zinc-400 text-[11px] font-bold mt-1">
                    تاريخ الانطلاق: {activeAssoc?.startDate} • إجمالي المبلغ: {activeAssoc?.totalAmount.toLocaleString()} ر.ي
                  </p>
                </div>
              </div>

              {/* Utility operations buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setIsPDFOpen(true)}
                  className="px-3.5 py-2.5 bg-slate-80 text-indigo-700 bg-white border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm min-h-10"
                >
                  <Printer size={14} />
                  <span>تصدير تقرير PDF 📥</span>
                </button>
                
                {activeAssoc?.status === 'active' && (
                  <button
                    onClick={handleCloseAssociation}
                    className="px-4 py-2.5 bg-teal-605 hover:bg-teal-505 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-705 dark:text-emerald-400 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer min-h-10 active:scale-95"
                  >
                    <CheckCircle size={14} />
                    <span>تصفية وإغلاق الجمعية</span>
                  </button>
                )}
              </div>
            </div>

            {/* Smart notifications list */}
            {activeAssoc && (
              <div className="grid grid-cols-1 gap-2">
                {activeAssoc.role === 'member'
                  ? computeSubscriberStats(activeAssoc, payments).upcomingAlarms.map((alm, uIdx) => (
                      <div key={uIdx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold flex items-center gap-2.5 animate-pulse rtl">
                        <AlertCircle size={16} className="text-amber-600 animate-spin shrink-0" />
                        <span>{alm}</span>
                      </div>
                    ))
                  : computeManagerStats(activeAssoc, members, groupTransactions).upcomingAlarms.map((alm, uIdx) => (
                      <div key={uIdx} className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2.5 animate-pulse rtl">
                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                        <span>{alm}</span>
                      </div>
                    ))
                }
              </div>
            )}

            {/* Segmented control sheet switcher */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-zinc-800 pb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 border-b-2 text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'border-indigo-605 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-450 hover:text-slate-800'
                }`}
              >
                نظرة عامة والمدفوعات
              </button>

              {activeAssoc?.role === 'manager' && (
                <button
                  onClick={() => setActiveTab('members')}
                  className={`px-4 py-2 border-b-2 text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'members'
                      ? 'border-indigo-605 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-450 hover:text-slate-800'
                  }`}
                >
                  سجل قيد المشتركين ({members.filter(m => m.associationId === activeAssoc?.id).length})
                </button>
              )}

              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 border-b-2 text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'transactions'
                    ? 'border-indigo-605 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-450 hover:text-slate-800'
                }`}
              >
                دفتر مجلة كشف الحساب
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 border-b-2 text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'border-indigo-605 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-450 hover:text-slate-800'
                }`}
              >
                سجل التدقيق والمراقبة
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 border-b-2 text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'border-indigo-605 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-450 hover:text-slate-800'
                }`}
              >
                خيارات الضبط والقواعد
              </button>
            </div>

            {/* Switchable Sheet content */}
            <div className="space-y-6">
              
              {/* Core Overview sheets */}
              {activeTab === 'overview' && activeAssoc && (
                <div className="space-y-6">
                  {/* Subscriber dashboard widgets */}
                  {activeAssoc.role === 'member' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-6">
                        {/* Metrics bar */}
                        {(() => {
                          const stats = computeSubscriberStats(activeAssoc, payments);
                          return (
                            <>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">دفعات حتى اليوم</span>
                                  <span className="text-sm font-black text-slate-805 dark:text-white">
                                    {stats.totalPaid.toLocaleString()} ر.ي
                                  </span>
                                </div>
                                <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">الرصيد المتبقي عليك</span>
                                  <span className="text-sm font-black text-rose-600">
                                    {stats.totalRemaining.toLocaleString()} ر.ي
                                  </span>
                                </div>
                                <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">الاستحقاق القادم وعقده</span>
                                  <span className="text-xs font-black text-slate-600 dark:text-zinc-350">
                                    {stats.nextDueDate || 'مكتمل المسدد'}
                                  </span>
                                </div>
                                <div className="p-4 bg-white dark:bg-zinc-905 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                  <span className="text-[10px] text-slate-400 block font-bold">أيام التأخر المتراكم</span>
                                  <span className={`text-sm font-black ${stats.daysDelayed > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {stats.daysDelayed}يوم
                                  </span>
                                </div>
                              </div>

                              {/* Progress achieving */}
                              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5">
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <span className="font-black text-slate-800 dark:text-zinc-350">نسبة تصفية الالتزام وإنهاء السدادات:</span>
                                  <span className="font-extrabold font-mono text-indigo-650">{stats.progressPercent}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300" style={{ width: `${stats.progressPercent}%` }}></div>
                                </div>
                              </div>

                              {/* Installments scheduled table */}
                              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5">
                                <div className="flex items-center justify-between gap-2.5 pb-4 border-b border-slate-100 dark:border-zinc-805">
                                  <h4 className="text-xs font-black text-slate-905 dark:text-white">جدول الأقساط والدفعات المجدولة تاريخياً:</h4>
                                  {activeAssoc.status === 'active' && canModify && (
                                    <button
                                      onClick={() => {
                                        setNewPaymentForm(prev => ({
                                          ...prev,
                                          amount: activeAssoc.installmentAmount,
                                          statement: `سداد قسط الدورة رقم (${stats.paidCount + 1}) - جمعية ${activeAssoc.name}`
                                        }));
                                        setIsPaymentModalOpen(true);
                                      }}
                                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-2xs font-extrabold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                    >
                                      <Plus size={14} />
                                      <span>سداد قوط القسط جاري</span>
                                    </button>
                                  )}
                                </div>

                                <div className="overflow-x-auto mt-4">
                                  <table className="w-full text-right text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-bold">
                                        <th className="py-2.5">رقم الدفعة</th>
                                        <th>تاريخ الاستحقاق</th>
                                        <th>المبلغ المستحق</th>
                                        <th className="text-center">حالة السداد والالتزام</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {getScheduleDates(activeAssoc.startDate, activeAssoc.cyclesCount, activeAssoc.type).map((cycleDate, index) => {
                                        const matchingPay = payments.filter(p => p.associationId === activeAssoc.id)[index];
                                        const isPaid = !!matchingPay;
                                        const isOverdue = !isPaid && new Date(cycleDate) < new Date();

                                        return (
                                          <tr key={index} className="border-b border-slate-100/50 dark:border-zinc-805/30 hover:bg-slate-50/50">
                                            <td className="py-3 font-extrabold font-mono text-slate-400">#{(index + 1).toString().padStart(2, '0')}</td>
                                            <td className="font-mono">{cycleDate}</td>
                                            <td className="font-bold">{activeAssoc.installmentAmount.toLocaleString()} ر.ي</td>
                                            <td className="text-center">
                                              <span className={`inline-flex px-3 py-1 rounded-full text-2xs font-bold leading-none ${
                                                isPaid 
                                                  ? 'bg-emerald-50 text-emerald-705 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                                  : isOverdue 
                                                    ? 'bg-rose-50 text-rose-750 dark:bg-rose-950/20 dark:text-rose-400' 
                                                    : 'bg-slate-50 text-slate-400 dark:bg-zinc-805'
                                              }`}>
                                                {isPaid ? 'مدفوعة كاملة' : isOverdue ? 'متأخرة مفروضة' : 'بانتظار دور السداد'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Right bar: Association profile */}
                      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 h-fit space-y-4">
                        <h4 className="text-xs font-black text-indigo-905 border-r-4 border-indigo-605 pr-2">ملف مسؤول الجمعية والاتصال:</h4>
                        <div className="space-y-3 pt-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-650 font-bold shrink-0">
                              <User size={15} />
                            </div>
                            <div>
                              <span className="text-2xs text-slate-400 block font-bold">اسم المسؤول / المدير</span>
                              <span className="font-bold text-slate-805 dark:text-white">{activeAssoc.managerName || 'صديق ادخار خارق'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-655 font-bold shrink-0">
                              <Phone size={15} />
                            </div>
                            <div>
                              <span className="text-2xs text-slate-400 block font-bold">رقم الهاتف</span>
                              <span className="font-mono text-slate-800 dark:text-zinc-200 font-bold">{activeAssoc.phone || 'غير مسجل'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-650 font-bold shrink-0">
                              <Calendar size={15} />
                            </div>
                            <div>
                              <span className="text-2xs text-slate-400 block font-bold">موعد استلامك للجمعية</span>
                              <span className="font-bold text-slate-800 dark:text-zinc-250 font-mono">{activeAssoc.receiveDate || `دور ومرحلة # ${activeAssoc.receiveTurn}`}</span>
                            </div>
                          </div>

                          {activeAssoc.notes && (
                            <div className="p-3 bg-slate-50 dark:bg-zinc-805/40 border border-slate-105 dark:border-zinc-800 rounded-xl mt-3 text-2xs leading-relaxed text-slate-505">
                              <span className="font-black text-indigo-905 block mb-1">ملاحظات الملف:</span>
                              {activeAssoc.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Manager Dashboard widget views */
                    (() => {
                      const stats = computeManagerStats(activeAssoc, members, groupTransactions);
                      return (
                        <div className="space-y-6">
                           {/* Core metrics grids */}
                          {(() => {
                            const assocTxs = groupTransactions.filter(t => t.associationId === activeAssoc.id);
                            const totalCreditsForAssoc = assocTxs.reduce((sum, t) => sum + (t.credit || 0), 0);
                            const totalDebitsForAssoc = assocTxs.reduce((sum, t) => sum + (t.debit || 0), 0);
                            
                            // Determine arabic display of status
                            let statusText = "نشطة";
                            let statusColor = "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900";
                            if (activeAssoc.status === 'completed') {
                              statusText = "مكتملة";
                              statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900";
                            } else if (activeAssoc.status === 'paused') {
                              statusText = "متوقفة";
                              statusColor = "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900";
                            } else if (activeAssoc.status === 'closed') {
                              statusText = "مغلقة";
                              statusColor = "text-slate-700 bg-slate-50 border-slate-205 dark:text-slate-400 dark:bg-slate-900/40 dark:border-slate-800";
                            }

                            return (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-right">
                                {/* Total In (Credits) */}
                                <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between shadow-xs">
                                  <span className="text-[10px] text-slate-400 block font-bold flex items-center gap-1">
                                    <TrendingUp size={11} className="text-emerald-500" />
                                    <span>إجمالي الداخل (المقبوض)</span>
                                  </span>
                                  <span className="text-xs font-black text-emerald-600 font-mono mt-2 block">
                                    {totalCreditsForAssoc.toLocaleString()} ر.ي
                                  </span>
                                </div>

                                {/* Total Out (Debits) */}
                                <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between shadow-xs">
                                  <span className="text-[10px] text-slate-400 block font-bold flex items-center gap-1">
                                    <TrendingDown size={11} className="text-rose-500" />
                                    <span>إجمالي الخارج (المدفوع)</span>
                                  </span>
                                  <span className="text-xs font-black text-rose-600 font-mono mt-2 block">
                                    {totalDebitsForAssoc.toLocaleString()} ر.ي
                                  </span>
                                </div>

                                {/* Current Chest Balance */}
                                <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between shadow-xs">
                                  <span className="text-[10px] text-slate-400 block font-bold flex items-center gap-1">
                                    <Coins size={11} className="text-indigo-500" />
                                    <span>الرصيد الحالي بالخزينة</span>
                                  </span>
                                  <span className="text-xs font-black text-indigo-650 font-mono mt-2 block">
                                    {stats.chestBalance.toLocaleString()} ر.ي
                                  </span>
                                </div>

                                {/* Members Count */}
                                <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between shadow-xs">
                                  <span className="text-[10px] text-slate-400 block font-bold flex items-center gap-1">
                                    <Users size={11} className="text-slate-500" />
                                    <span>عدد الأعضاء الكلي</span>
                                  </span>
                                  <span className="text-xs font-black text-slate-700 dark:text-zinc-300 mt-2 block font-mono">
                                    {stats.activeMembersCount} عضواً
                                  </span>
                                </div>

                                {/* Late Members */}
                                <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between shadow-xs">
                                  <span className="text-[10px] text-slate-400 block font-bold flex items-center gap-1">
                                    <AlertCircle size={11} className="text-red-500" />
                                    <span>الأعضاء المتأخرين</span>
                                  </span>
                                  <span className="text-xs font-black text-rose-600 mt-2 block font-mono">
                                    {stats.membersWithLateCount} متأخرين
                                  </span>
                                </div>

                                {/* Received Turn */}
                                <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between shadow-xs">
                                  <span className="text-[10px] text-slate-400 block font-bold flex items-center gap-1">
                                    <CheckCircle size={11} className="text-teal-500" />
                                    <span>الأعضاء المستلمين دورهم</span>
                                  </span>
                                  <span className="text-xs font-black text-teal-605 mt-2 block font-mono">
                                    {stats.receivedPayoutCount} مستلمين
                                  </span>
                                </div>

                                {/* Fund Financial Status */}
                                <div className="p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-col justify-between shadow-xs">
                                  <span className="text-[10px] text-slate-400 block font-bold flex items-center gap-1">
                                    <Activity size={11} className="text-slate-500" />
                                    <span>حالة الصندوق الحالية</span>
                                  </span>
                                  <div className="mt-2.5">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-md border block text-center ${statusColor}`}>
                                      {statusText}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Quick shortcuts and notifications layout */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left: Quick Journal entry block */}
                            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5">
                              <h4 className="text-xs font-black text-slate-805 dark:text-white pb-3 border-b border-slate-100 dark:border-zinc-805 flex items-center justify-between">
                                <span>سجل كشف ملخص الأعضاء وموقعهم المالي الحالي</span>
                                <span className="font-mono text-2xs text-slate-400 font-normal">تحديث آني وفوري على أساس دفعة المدور</span>
                              </h4>

                              <div className="overflow-x-auto mt-4">
                                <table className="w-full text-right text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-105 text-slate-400 font-bold">
                                      <th className="py-2">الترتيب</th>
                                      <th>اسم المشترك المعتمد</th>
                                      <th className="text-center">المسدد لليوم</th>
                                      <th className="text-center">المتبقي المطلوب للجمعية</th>
                                      <th className="text-center">حالة استلام دور الجمعية</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {members.filter(m => m.associationId === activeAssoc.id).map((m) => {
                                      const mPayments = groupTransactions.filter(tx => tx.associationId === activeAssoc.id && tx.memberId === m.id && (tx.type === 'payment' || tx.type === 'late_payment'));
                                      const mPaid = mPayments.reduce((sum, p) => sum + p.credit, 0);
                                      const mReq = m.installmentAmount * activeAssoc.cyclesCount;
                                      const mRem = Math.max(0, mReq - mPaid);

                                      return (
                                        <tr key={m.id} className="border-b border-slate-100/50 hover:bg-slate-50/50 dark:border-zinc-805/35">
                                          <td className="py-2.5 font-bold font-mono text-slate-450">{m.receiveTurn}</td>
                                          <td className="font-black text-slate-705 dark:text-zinc-200">{m.name}</td>
                                          <td className="text-center font-bold text-slate-500 font-mono">{mPaid.toLocaleString()} ر.ي</td>
                                          <td className="text-center font-bold text-slate-700 font-mono">{mRem.toLocaleString()} ر.ي</td>
                                          <td className="text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                              m.receiveStatus === 'received' ? 'bg-emerald-50 text-emerald-705' : 'bg-amber-50 text-amber-705'
                                            }`}>
                                              {m.receiveStatus === 'received' ? 'استلم' : 'لم يستلم بعد'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Right: Summary operations logs */}
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
                              <h4 className="text-xs font-black text-indigo-905 border-r-4 border-indigo-605 pr-2">منشورات صندوق الجمعية العام:</h4>
                              <div className="space-y-3 pt-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">عدد الحصص والربط:</span>
                                  <span className="font-bold text-slate-800 dark:text-zinc-205">{activeAssoc.membersCount} مشترك مالي</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">ماتم صرفه واستلامه للأعضاء:</span>
                                  <span className="font-bold text-rose-600">
                                    {groupTransactions
                                      .filter(t => t.associationId === activeAssoc.id && t.type === 'received_association')
                                      .reduce((sum, t) => sum + t.debit, 0)
                                      .toLocaleString()} ر.ي
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">إجمالي رسوم الغرامات المحصلة:</span>
                                  <span className="font-bold text-teal-605">
                                    {stats.totalLateFeesCollected.toLocaleString()} ر.ي
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">إجمالي مصروفات الجمعية:</span>
                                  <span className="font-bold text-slate-700 font-mono">
                                    {stats.totalExpenses.toLocaleString()} ر.ي
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Members workspace sheet */}
              {activeTab === 'members' && activeAssoc && activeAssoc.role === 'manager' && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-805">
                    <div>
                      <h4 className="text-xs font-black text-slate-905 dark:text-white">سجل قيد وإدارة المشتركين بالجمعية:</h4>
                      <p className="text-2xs text-slate-400 mt-1 font-bold">يمكنك إضافة، تعديل قيم القسط، تعيين تاريخ وأدوار الاستلام، وتتبع وضعهم.</p>
                    </div>

                    {canModify && (
                      <button
                        onClick={() => {
                          setEditingMemberId(null);
                          setNewMemberForm({
                            name: '',
                            phone: '',
                            installmentAmount: activeAssoc.installmentAmount,
                            receiveTurn: members.filter(m => m.associationId === activeAssoc.id).length + 1,
                            receiveDate: '',
                            notes: '',
                            status: 'regular',
                            joinedDate: activeAssoc.startDate || new Date().toISOString().split('T')[0]
                          });
                          setIsMemberModalOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={15} />
                        <span>إدراج مشترك جديد</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="border-b border-slate-105 text-slate-400 font-bold bg-slate-50 dark:bg-zinc-805/30 text-[10px]">
                          <th className="py-2 px-1">رول</th>
                          <th className="px-2">الاسم المعتمد في الجدول</th>
                          <th className="px-2">تاريخ الانضمام</th>
                          <th className="px-2">المحمول والاتصال</th>
                          <th className="px-2">قسط الاشتراك</th>
                          <th className="px-2">تاريخ الاستلام وعقده</th>
                          <th className="text-center px-2">حالة المشترك</th>
                          <th className="px-2">ملاحظات</th>
                          {canModify && <th className="text-left w-24">إدارة</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {members
                          .filter(m => m.associationId === activeAssoc.id)
                          .map((m) => {
                            const itemStatus = m.status || (m.receiveStatus === 'received' ? 'received' : 'regular');
                            const label = itemStatus === 'received' ? 'استلم دوره ✅' : itemStatus === 'late' ? 'متأخر ❌' : itemStatus === 'withdrawn' ? 'منسحب 🚪' : 'منتظم ❇️';
                            const statusClr = itemStatus === 'received' 
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20' 
                              : itemStatus === 'late' 
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20' 
                              : itemStatus === 'withdrawn' 
                              ? 'bg-slate-100 text-slate-650 dark:bg-zinc-800' 
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20';

                            return (
                              <tr key={m.id} className="border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50/50">
                                <td className="py-2.5 font-bold font-mono text-slate-450">#{m.receiveTurn}</td>
                                <td className="font-bold text-slate-850 dark:text-zinc-200">{m.name}</td>
                                <td className="font-mono text-slate-500">{m.joinedDate || m.receiveDate || activeAssoc.startDate}</td>
                                <td className="font-mono text-slate-500">{m.phone || 'لا يوجد'}</td>
                                <td className="font-extrabold text-indigo-650">{m.installmentAmount.toLocaleString()} ر.ي</td>
                                <td className="font-mono text-slate-600">{m.receiveDate || 'لم يحدد بعد'}</td>
                                <td className="text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${statusClr}`}>
                                    {label}
                                  </span>
                                </td>
                                <td className="font-black text-slate-550 dark:text-zinc-400 text-2xs truncate max-w-[120px]">{m.notes || '-'}</td>
                                {canModify && (
                                  <td className="text-left py-2">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        onClick={() => handleOpenEditMember(m)}
                                        className="px-2 py-1 bg-indigo-50 text-indigo-655 hover:bg-indigo-100 rounded text-2xs font-extrabold cursor-pointer"
                                      >
                                        تصفية / تعديل
                                      </button>
                                    <button
                                      onClick={() => handleDeleteMember(m)}
                                      className="px-2 py-1 bg-rose-50 text-rose-605 hover:bg-rose-100 rounded text-2xs font-extrabold cursor-pointer"
                                    >
                                      حذف
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        {members.filter(m => m.associationId === activeAssoc.id).length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-440 font-bold">لا يوجد مشتركين مقيدين بالجمعية حالياً.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* {/* Transactions Tab Ledger view */}
              {activeTab === 'transactions' && activeAssoc && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4">
                  {/* Sub-tabs toggler menu */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-zinc-805">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-805/50 rounded-xl w-fit">
                      <button
                        onClick={() => setTransactionSubTab('ledger')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          transactionSubTab === 'ledger'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                      >
                        دفتر القيود واليومية
                      </button>
                      <button
                        onClick={() => setTransactionSubTab('collection_log')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          transactionSubTab === 'collection_log'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                      >
                        سجل تحصيل الجمعية
                      </button>
                      <button
                        onClick={() => setTransactionSubTab('payout_log')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          transactionSubTab === 'payout_log'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                      >
                        سجل استلام الدور
                      </button>
                      <button
                        onClick={() => setTransactionSubTab('schedule')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          transactionSubTab === 'schedule'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                      >
                        جدولة الأقساط
                      </button>
                      <button
                        onClick={() => setTransactionSubTab('receipts')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                          transactionSubTab === 'receipts'
                            ? 'bg-white dark:bg-zinc-900 text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                        }`}
                      >
                        السندات
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="البحث والتصفية..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-805/4 w-48 text-2xs select-none border border-slate-200 rounded-lg focus:outline-none"
                      />

                      {canModify && activeAssoc.role === 'manager' && ['ledger', 'collection_log', 'payout_log'].includes(transactionSubTab) && (
                        <button
                          onClick={() => {
                            const defaultType = transactionSubTab === 'payout_log' ? 'received_association' : 'payment';
                            setNewGroupOpForm({
                              date: new Date().toISOString().split('T')[0],
                              statement: defaultType === 'received_association' ? 'تسليم حصة الجمعية للمشتري بالدور' : 'تحصيل قسط الجمعية المعتاد',
                              type: defaultType,
                              memberId: '',
                              amount: activeAssoc.installmentAmount,
                              linkedEmployeeId: '',
                              cycleNumber: 1,
                              paymentStatus: 'paid',
                              notes: ''
                            });
                            setIsPaymentModalOpen(true);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black cursor-pointer shadow transition-all active:scale-95 flex items-center gap-1"
                        >
                          <Plus size={14} />
                          <span>{transactionSubTab === 'payout_log' ? 'تسجيل صرف دور (بصمة استلام)' : 'تحصيل قسط قيدي جديد'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 1) Core Ledger view */}
                  {transactionSubTab === 'ledger' && (
                    <>
                      {activeAssoc.role === 'member' ? (
                        /* Display user payments for Member type */
                        <div className="overflow-x-auto mt-4">
                          <table className="w-full text-right text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-105 text-slate-450 font-bold bg-slate-50 dark:bg-zinc-800 text-[10px]">
                                <th className="py-2 px-3 text-center w-28">تاريخ السداد المالي</th>
                                <th className="px-3">بيان وتفاصيل القسط المقيد</th>
                                <th className="px-3 text-center w-24">المبلغ المستلم</th>
                                <th className="px-3 text-center w-24">الغرامة المطبقة</th>
                                <th className="px-3 text-center w-28">حالة تفويض الدفعة</th>
                                <th className="text-left px-3 w-20">خيار الإلغاء</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments
                                .filter(p => p.associationId === activeAssoc.id)
                                .filter(p => p.statement.toLowerCase().includes(searchTerm.toLowerCase()) || p.date.includes(searchTerm))
                                .map((p) => (
                                  <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-805 hover:bg-slate-50/50">
                                    <td className="py-3 px-3 text-center font-mono text-slate-500">{p.date}</td>
                                    <td className="font-bold px-3 text-slate-800 dark:text-zinc-200">{p.statement}</td>
                                    <td className="font-extrabold px-3 text-emerald-600 text-center">{p.amount.toLocaleString()} ر.ي</td>
                                    <td className="font-bold px-3 text-rose-500 text-center">{p.penaltyApplied > 0 ? `${p.penaltyApplied} ر.ي` : 'لا يوجد غرامة'}</td>
                                    <td className="text-center px-3">
                                      <span className="inline-block bg-emerald-100 text-emerald-805 text-[10px] px-2 py-0.5 rounded font-bold">
                                        مدفوعة ومعتمدة بالصندوق
                                      </span>
                                    </td>
                                    <td className="text-left px-3">
                                      {canModify && (
                                        <button
                                          onClick={() => handleDeletePayment(p)}
                                          className="p-1.5 text-rose-455 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                          title="عكس السند وحذفه"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* Display operations logs for Manager type */
                        <div className="overflow-x-auto mt-4">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="border-b border-indigo-950 text-slate-400 font-bold bg-indigo-950/5 text-[11px]">
                                <th className="py-2.5 px-3 text-center w-28">التاريخ المالي</th>
                                <th className="px-3">البيان والوصف للحركة</th>
                                <th className="px-3 text-center">المشترك المعني</th>
                                <th className="px-3 text-center w-24">المدين (-)</th>
                                <th className="px-3 text-center w-24">الدائن (+)</th>
                                <th className="px-3 text-center w-28">رصيد الصندوق التعديلي</th>
                                <th className="text-left px-3 w-16 text-slate-400 font-medium">الخيارات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupTransactions
                                .filter(t => t.associationId === activeAssoc.id)
                                .filter(t => t.statement.toLowerCase().includes(searchTerm.toLowerCase()) || (t.memberName && t.memberName.toLowerCase().includes(searchTerm.toLowerCase())))
                                .map((t) => (
                                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="py-3 px-3 text-center font-mono text-slate-500">{t.date}</td>
                                    <td className="font-black px-3 text-slate-805 dark:text-zinc-200">{t.statement}</td>
                                    <td className="px-3 text-slate-600 font-bold text-center">{t.memberName || 'صندوق كلي عريض'}</td>
                                    <td className="font-bold px-3 text-rose-500 text-center">{t.debit > 0 ? t.debit.toLocaleString() : '0'}</td>
                                    <td className="font-bold px-3 text-emerald-600 text-center">{t.credit > 0 ? t.credit.toLocaleString() : '0'}</td>
                                    <td className="font-bold px-3 text-indigo-905 bg-slate-50/70 font-mono text-center">
                                      {t.balance.toLocaleString()} ر.ي
                                    </td>
                                    <td className="text-left px-3">
                                      {canModify && (
                                        <button
                                          onClick={() => handleDeleteGroupTransaction(t)}
                                          className="p-1 text-rose-500 hover:bg-rose-50 rounded shrink-0 transition-all cursor-pointer"
                                          title="عكس القيد وحذف الحركة"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {/* Collection Log Panel */}
                  {transactionSubTab === 'collection_log' && (
                    <div className="space-y-4">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3.5 rounded-xl border border-emerald-100/30 text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">إجمالي المبالغ المحصلة</span>
                          <span className="text-sm font-black text-emerald-700">
                            {(activeAssoc.role === 'manager'
                              ? groupTransactions.filter(t => t.associationId === activeAssoc.id && ['payment', 'late_payment'].includes(t.type)).reduce((sum, t) => sum + t.credit, 0)
                              : payments.filter(p => p.associationId === activeAssoc.id).reduce((sum, p) => sum + p.amount, 0)
                            ).toLocaleString()} ر.ي
                          </span>
                        </div>
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/30 text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">عدد القيود/الدفعات المسجلة</span>
                          <span className="text-sm font-black text-indigo-700">
                            {activeAssoc.role === 'manager'
                              ? groupTransactions.filter(t => t.associationId === activeAssoc.id && ['payment', 'late_payment'].includes(t.type)).length
                              : payments.filter(p => p.associationId === activeAssoc.id).length
                            } دفعة
                          </span>
                        </div>
                        <div className="bg-amber-50/50 dark:bg-amber-950/10 p-3.5 rounded-xl border border-amber-100/30 text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">متوسط القيمة لكل تحصيل</span>
                          <span className="text-sm font-black text-amber-700">
                            {(() => {
                              const txs = activeAssoc.role === 'manager'
                                ? groupTransactions.filter(t => t.associationId === activeAssoc.id && ['payment', 'late_payment'].includes(t.type)).map(t => t.credit)
                                : payments.filter(p => p.associationId === activeAssoc.id).map(p => p.amount);
                              if (txs.length === 0) return '0 ر.ي';
                              const avg = txs.reduce((sum, val) => sum + val, 0) / txs.length;
                              return `${Math.round(avg).toLocaleString()} ر.ي`;
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Collection Table */}
                      <div className="overflow-x-auto mt-4">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="border-b border-slate-105 text-slate-450 font-bold bg-slate-50 dark:bg-zinc-800 text-[10px]">
                              <th className="py-2 px-3 text-center w-28">التاريخ المالي</th>
                              <th className="px-3">تفاصيل وأثر التحصيل</th>
                              <th className="px-3 text-center">المشترك المسدد</th>
                              <th className="px-3 text-center w-20">الدورة / الشهر</th>
                              <th className="px-3 text-center w-24">القيمة المحصلة</th>
                              <th className="px-3 text-center w-24">الحالة المعتمدة</th>
                              <th className="px-3 text-center">ملاحظات ووثائق ثبوتية</th>
                              {canModify && <th className="text-left px-3 w-16">إدارة</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {activeAssoc.role === 'manager' ? (
                              groupTransactions
                                .filter(t => t.associationId === activeAssoc.id && ['payment', 'late_payment'].includes(t.type))
                                .filter(t => t.statement.toLowerCase().includes(searchTerm.toLowerCase()) || (t.memberName && t.memberName.toLowerCase().includes(searchTerm.toLowerCase())))
                                .map((t) => {
                                  const payStatus = t.paymentStatus || 'paid';
                                  const statusLabel = payStatus === 'paid' ? 'مدفوع كامل' : payStatus === 'partial' ? 'مدفوع جزئي' : 'متأخر سداده';
                                  const statusClr = payStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : payStatus === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-750';

                                  return (
                                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                      <td className="py-3 px-3 text-center font-mono text-slate-500">{t.date}</td>
                                      <td className="font-bold px-3 text-slate-805 dark:text-zinc-200">{t.statement}</td>
                                      <td className="px-3 text-slate-600 font-bold text-center">{t.memberName || 'صندوق كلي عريض'}</td>
                                      <td className="font-bold px-3 text-slate-800 text-center font-mono">الدورة {t.cycleNumber || 1}</td>
                                      <td className="font-extrabold px-3 text-emerald-600 text-center">{t.credit.toLocaleString()} ر.ي</td>
                                      <td className="text-center px-3">
                                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${statusClr}`}>
                                          {statusLabel}
                                        </span>
                                      </td>
                                      <td className="px-3 font-mono text-slate-500 text-2xs truncate max-w-[150px]">{t.notes || '-'}</td>
                                      <td className="text-left px-3">
                                        {canModify && (
                                          <button
                                            onClick={() => handleDeleteGroupTransaction(t)}
                                            className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                            title="إلغاء قيد التحصيل"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                            ) : (
                              payments
                                .filter(p => p.associationId === activeAssoc.id)
                                .filter(p => p.statement.toLowerCase().includes(searchTerm.toLowerCase()) || p.date.includes(searchTerm))
                                .map((p) => (
                                  <tr key={p.id} className="border-b border-slate-100 dark:border-zinc-805 hover:bg-slate-50/50">
                                    <td className="py-3 px-3 text-center font-mono text-slate-500">{p.date}</td>
                                    <td className="font-bold px-3 text-slate-800 dark:text-zinc-200">{p.statement}</td>
                                    <td className="px-3 text-slate-600 font-bold text-center">أنت (عضو مشترك)</td>
                                    <td className="font-bold px-3 text-slate-800 text-center font-mono">-</td>
                                    <td className="font-extrabold px-3 text-emerald-600 text-center">{p.amount.toLocaleString()} ر.ي</td>
                                    <td className="text-center px-3">
                                      <span className="inline-block bg-emerald-105 text-emerald-850 text-[10px] px-2 py-0.5 rounded font-bold">
                                        مدفوع ومؤكد
                                      </span>
                                    </td>
                                    <td className="px-3 font-mono text-slate-500 text-2xs truncate max-w-[150px]">-</td>
                                    <td className="text-left px-3">
                                      {canModify && (
                                        <button
                                          onClick={() => handleDeletePayment(p)}
                                          className="p-1 text-rose-500 hover:bg-rose-55 rounded transition-all cursor-pointer"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))
                            )}
                            {activeAssoc.role === 'manager' && groupTransactions.filter(t => t.associationId === activeAssoc.id && ['payment', 'late_payment'].includes(t.type)).length === 0 && (
                              <tr>
                                <td colSpan={8} className="text-center py-8 text-slate-400 font-bold">لا يوجد قيود لمتحصلات الأقساط حالياً بالجمعية.</td>
                              </tr>
                            )}
                            {activeAssoc.role === 'member' && payments.filter(p => p.associationId === activeAssoc.id).length === 0 && (
                              <tr>
                                <td colSpan={8} className="text-center py-8 text-slate-400 font-bold">لم تسجل أي مدفوعات شخصية لهذه الجمعية بعد.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payout Log Panel */}
                  {transactionSubTab === 'payout_log' && (
                    <div className="space-y-4">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100/30 text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">إجمالي المصروفات (حق المنتفعين)</span>
                          <span className="text-sm font-black text-indigo-700">
                            {groupTransactions
                              .filter(t => t.associationId === activeAssoc.id && t.type === 'received_association')
                              .reduce((sum, t) => sum + t.debit, 0)
                              .toLocaleString()} ر.ي
                          </span>
                        </div>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 p-3.5 rounded-xl border border-emerald-100/30 text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">عدد الأعضاء الحاصلين على دورهم</span>
                          <span className="text-sm font-black text-emerald-700">
                            {members.filter(m => m.associationId === activeAssoc.id && (m.receiveStatus === 'received' || m.status === 'received')).length} مشتركين
                          </span>
                        </div>
                        <div className="bg-slate-50/60 dark:bg-black/10 p-3.5 rounded-xl border border-slate-200/50 text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">الأدوار المتبقية للصرف</span>
                          <span className="text-sm font-black text-slate-700">
                            {members.filter(m => m.associationId === activeAssoc.id && m.receiveStatus !== 'received' && m.status !== 'received').length} أدوار معلقة
                          </span>
                        </div>
                      </div>

                      {/* Payout Table */}
                      <div className="overflow-x-auto mt-4">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="border-b border-indigo-950 text-slate-400 font-bold bg-indigo-950/5 text-[11px]">
                              <th className="py-2.5 px-3 text-center w-28">تاريخ الصرف</th>
                              <th className="px-3">بيان الحركة وعزل التصفية</th>
                              <th className="px-3 text-center">العضو المستلم (المنتفع)</th>
                              <th className="px-3 text-center w-24">مبلغ الحصص المفرغة</th>
                              <th className="px-3 text-center w-28">حالة استلام الدور</th>
                              <th className="px-3 text-center">رقم المستند / الملاحظات</th>
                              {canModify && <th className="text-left px-3 w-16">إدارة</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {groupTransactions
                              .filter(t => t.associationId === activeAssoc.id && t.type === 'received_association')
                              .filter(t => t.statement.toLowerCase().includes(searchTerm.toLowerCase()) || (t.memberName && t.memberName.toLowerCase().includes(searchTerm.toLowerCase())))
                              .map((t) => {
                                const payStatus = t.paymentStatus || 'paid';
                                const statusLabel = payStatus === 'paid' ? 'استلام كامل ✅' : payStatus === 'partial' ? 'استلام جزئي ⏳' : 'مؤجل صرفه ⌛';
                                const statusClr = payStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : payStatus === 'partial' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700';

                                return (
                                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="py-3 px-3 text-center font-mono text-slate-500">{t.date}</td>
                                    <td className="font-black px-3 text-slate-805 dark:text-zinc-200">{t.statement}</td>
                                    <td className="px-3 text-slate-600 font-bold text-center">{t.memberName || 'صندوق كلي عريض'}</td>
                                    <td className="font-bold px-3 text-rose-650 text-center font-mono">{t.debit.toLocaleString()} ر.ي</td>
                                    <td className="text-center px-3">
                                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${statusClr}`}>
                                        {statusLabel}
                                      </span>
                                    </td>
                                    <td className="px-3 text-slate-550 font-black text-2xs truncate max-w-[180px]">{t.notes || 'لا يوجد ملاحظات قيدية'}</td>
                                    <td className="text-left px-3">
                                      {canModify && (
                                        <button
                                          onClick={() => handleDeleteGroupTransaction(t)}
                                          className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                          title="إلغاء قيد الاستلام"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            {groupTransactions.filter(t => t.associationId === activeAssoc.id && t.type === 'received_association').length === 0 && (
                              <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-400 font-bold">لا يوجد أي حركات مسجلة لصرف حصص الجمعية بالمستندات والتوثيق حالياً.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2) Due schedules view */}
                  {transactionSubTab === 'schedule' && (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-105 text-slate-450 font-bold bg-slate-50 dark:bg-zinc-800 text-[10px]">
                            <th className="py-2 px-3 text-center">رقم الدورة</th>
                            <th className="px-3">المشترك المعني</th>
                            <th className="px-3 text-center">تاريخ الاستحقاق</th>
                            <th className="px-3 text-center">المبلغ المطلوب</th>
                            <th className="px-3 text-center">ماتم سداده</th>
                            <th className="px-3 text-center">حالة السداد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dueSchedules
                            .filter(sch => sch.associationId === activeAssoc.id)
                            .filter(sch => {
                              const mem = members.find(m => m.id === sch.memberId);
                              const memName = sch.memberId === 'user' ? 'أنا المشترك' : (mem?.name || '');
                              return memName.toLowerCase().includes(searchTerm.toLowerCase()) || sch.dueDate.includes(searchTerm);
                            })
                            .map((sch) => {
                              const mem = members.find(m => m.id === sch.memberId);
                              const memberNameStr = sch.memberId === 'user' ? 'أنا المشترك' : (mem?.name || 'مشترك عام');
                              return (
                                <tr key={sch.id} className="border-b border-slate-100 dark:border-zinc-810/30 hover:bg-slate-50/50">
                                  <td className="py-3 px-3 text-center font-bold">الدورة {sch.cycleNumber}</td>
                                  <td className="font-extrabold px-3 text-slate-805 dark:text-zinc-200">{memberNameStr}</td>
                                  <td className="px-3 text-center font-mono text-slate-500">{sch.dueDate}</td>
                                  <td className="px-3 text-center font-bold text-slate-700 dark:text-zinc-300">{sch.amountDue.toLocaleString()} ر.ي</td>
                                  <td className="px-3 text-center font-extrabold text-emerald-600">{sch.amountPaid.toLocaleString()} ر.ي</td>
                                  <td className="px-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${
                                      sch.status === 'paid'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                        : sch.status === 'partially_paid'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                        : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    }`}>
                                      {sch.status === 'paid' ? 'مدفوع بالكامل' : sch.status === 'partially_paid' ? 'مدفوع جزئياً' : 'مستحق السداد'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {dueSchedules.filter(sch => sch.associationId === activeAssoc.id).length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-slate-400">لا يوجد جدول أقساط منشأ لهذه الجمعية حالياً. يرجى مراجعة تفاصيل المشتركين.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 3) Receipts directory tab */}
                  {transactionSubTab === 'receipts' && (
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-105 text-slate-450 font-bold bg-slate-50 dark:bg-zinc-800 text-[10px]">
                            <th className="py-2 px-3 text-center w-36">الرقم المرجعي للسند</th>
                            <th className="px-3">التاريخ والبيان</th>
                            <th className="px-3 text-center">المقيد له</th>
                            <th className="px-3 text-center w-28">المبلغ المستلم</th>
                            <th className="px-3 text-center">الجهة المستلمة</th>
                            <th className="text-left px-3 w-28">تفاصيل السند</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receipts
                            .filter(rc => rc.associationId === activeAssoc.id)
                            .filter(rc => rc.receiptNumber.includes(searchTerm) || rc.notes.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((rc) => {
                              const mem = members.find(m => m.id === rc.memberId);
                              const targetName = rc.memberId === 'user' ? 'أنا المشترك' : (mem?.name || 'صندوق كلي');
                              return (
                                <tr key={rc.id} className="border-b border-slate-100 dark:border-zinc-810/30 hover:bg-slate-50/50">
                                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 dark:text-zinc-400">{rc.receiptNumber}</td>
                                  <td className="px-3 text-slate-800 dark:text-zinc-200">
                                    <span className="block font-bold">{rc.notes}</span>
                                    <span className="text-[10px] text-slate-400 font-mono block">{rc.date}</span>
                                  </td>
                                  <td className="px-3 text-center font-extrabold text-indigo-700 dark:text-indigo-400">{targetName}</td>
                                  <td className="px-3 text-center font-extrabold font-mono text-emerald-600">{rc.amount.toLocaleString()} ر.ي</td>
                                  <td className="px-3 text-center font-bold text-slate-500">{rc.recipientName}</td>
                                  <td className="text-left px-3">
                                    <button
                                      onClick={() => setSelectedReceipt(rc)}
                                      className="px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-indigo-600 rounded-lg text-2xs font-extrabold transition-all cursor-pointer"
                                    >
                                      عرض السند 🧾
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          {receipts.filter(rc => rc.associationId === activeAssoc.id).length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-slate-400">لا يوجد سندات قبض أو صرف مقيدة لهذه الجمعية بعد.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Audit Logs tab panel */}
              {activeTab === 'audit' && activeAssoc && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-205 dark:border-zinc-800 p-5 space-y-4">
                  <h4 className="text-xs font-black text-slate-905 dark:text-white pb-3 border-b border-slate-105">مجلة تدقيق ومراقبة حركات التهيئة والمراجعة التراكمية:</h4>
                  
                  {auditLogs.filter(log => log.associationId === activeAssoc.id).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-normal text-xs">
                      لا توجد سجلات تدقيق منشأة حالياً لحركات التعديل أو الحذف بالدفتر.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-2xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-450 font-bold bg-slate-50 text-[10px]">
                            <th className="py-2 px-3 text-center">تاريخ القيد والتأثير</th>
                            <th className="px-3">المعدل</th>
                            <th className="px-3">نوع الملف</th>
                            <th className="px-3">الوصف والتفاصيل الملحقة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs
                            .filter(log => log.associationId === activeAssoc.id)
                            .map((log) => (
                              <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                <td className="py-2.5 px-3 font-mono text-slate-500 text-center">{log.date}</td>
                                <td className="px-3 font-black text-indigo-705">{log.modifier}</td>
                                <td className="px-3 font-bold">{log.itemType}</td>
                                <td className="px-3 text-slate-655 font-mono">{log.newValue}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Settings configuration workspace tab */}
              {activeTab === 'settings' && activeAssoc && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-205 dark:border-zinc-800 p-5 space-y-6">
                  <div className="pb-3 border-b border-slate-100 dark:border-zinc-805">
                    <h4 className="text-xs font-black text-slate-905 dark:text-white">إعدادات وبيانات الجمعية التعاونية الأساسية:</h4>
                    <p className="text-2xs text-slate-400 mt-1 font-bold">يمكنك التحكم في اسم الجمعية، حالتها، مبلغ الاشتراك، والسياسات الخاصة بالترحيل والغرامات.</p>
                  </div>

                  {/* Core Parameters Editing Block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/10 dark:bg-zinc-800/10 p-4 rounded-xl border border-indigo-100/30 text-xs font-bold leading-relaxed">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-500 mb-1 text-right">اسم الجمعية:</label>
                        <input
                          type="text"
                          value={activeAssoc.name}
                          disabled={!canModify}
                          onChange={(e) => {
                            const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, name: e.target.value } : a);
                            saveAssociationsState(updated);
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border rounded-lg text-slate-800 dark:text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1 text-right">حالة الجمعية:</label>
                        <select
                          value={activeAssoc.status}
                          disabled={!canModify}
                          onChange={(e) => {
                            const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, status: e.target.value as any } : a);
                            saveAssociationsState(updated);
                            writeAuditLog(activeAssoc.id, activeAssoc.id, 'إعدادات', 'edit', activeAssoc.status, `تعديل حالة الجمعية إلى: ${e.target.value}`);
                          }}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-800 border rounded-lg text-xs font-bold"
                        >
                          <option value="active">نشطة (جارية العمل والمحاسبة)</option>
                          <option value="completed">مكتملة (مصروفة بالكامل)</option>
                          <option value="paused">متوقفة مؤقتاً</option>
                          <option value="closed">مغلقة نهائياً</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-500 mb-1 text-right">قيمة القسط الموحد:</label>
                        <input
                          type="number"
                          value={activeAssoc.installmentAmount}
                          disabled={!canModify}
                          onChange={(e) => {
                            const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, installmentAmount: Number(e.target.value) } : a);
                            saveAssociationsState(updated);
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border rounded-lg text-slate-850 dark:text-white text-xs font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1 text-right">تاريخ بداية السريان:</label>
                        <input
                          type="date"
                          value={activeAssoc.startDate}
                          disabled={!canModify}
                          onChange={(e) => {
                            const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, startDate: e.target.value } : a);
                            saveAssociationsState(updated);
                          }}
                          className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border rounded-lg text-slate-850 dark:text-white text-xs font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-slate-500 mb-1 text-right">الوصفيات والملاحظات:</label>
                      <textarea
                        value={activeAssoc.notes || ''}
                        disabled={!canModify}
                        onChange={(e) => {
                          const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, notes: e.target.value } : a);
                          saveAssociationsState(updated);
                        }}
                        className="w-full px-3 py-1.5 bg-white dark:bg-zinc-800 border rounded-lg text-xs h-16 resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold leading-relaxed">
                    
                    {/* General postings */}
                    <div className="space-y-4">
                      {/* Post to general ledger */}
                      <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-810/30 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <div>
                          <span className="block text-slate-805 dark:text-white">ترحيل الحركات للحسابات العامة الموحدة:</span>
                          <span className="text-[10px] text-slate-400 block font-normal">عند السداد يتم إنشاء قيد تلقائي بدفاتر الشركة.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={activeAssoc.postToGeneralLedger}
                          disabled={!canModify}
                          onChange={(e) => {
                            const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, postToGeneralLedger: e.target.checked } : a);
                            saveAssociationsState(updated);
                            writeAuditLog(activeAssoc.id, activeAssoc.id, 'إعدادات', 'edit', '', `تعديل خيار الترحيل للحسابات إلى: ${e.target.checked}`);
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-550 border-slate-205 rounded"
                        />
                      </div>

                      {/* Display balance formats */}
                      <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-810/30 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                        <div>
                          <span className="block text-slate-805 dark:text-white">نوع رصيد كشف الحساب والملخص المختار:</span>
                          <span className="text-[10px] text-slate-400 block font-normal">تغيير الأسلوب بين رصيد تراكمي أو رصيد التزام متبقي قادم.</span>
                        </div>
                        <select
                          value={activeAssoc.balanceCalculationType}
                          disabled={!canModify}
                          onChange={(e) => {
                            const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, balanceCalculationType: e.target.value as 'cumulative' | 'outstanding' } : a);
                            saveAssociationsState(updated);
                            writeAuditLog(activeAssoc.id, activeAssoc.id, 'إعدادات', 'edit', '', `تغيير نوع احتساب رصيد الكشف إلى: ${e.target.value}`);
                          }}
                          className="px-2.5 py-1.5 text-2xs bg-white dark:bg-zinc-800 border rounded-lg"
                        >
                          <option value="cumulative">رصيد تراكمي مدفوع بالصندوق</option>
                          <option value="outstanding">رصيد التزام متبقي مقطوع</option>
                        </select>
                      </div>
                    </div>

                    {/* Fees penalty rules */}
                    <div className="space-y-4">
                      {/* Enable late penalty fees */}
                      <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-zinc-810/30 rounded-xl border border-slate-105 dark:border-zinc-800/40">
                        <div>
                          <span className="block text-slate-805 dark:text-white">تفعيل غرامة التأخر المقررة للالتزام:</span>
                          <span className="text-[10px] text-slate-400 block font-normal">احتساب مبالغ التأخير تلقائياً للدوائر المحددة.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={activeAssoc.penaltyEnabled}
                          disabled={!canModify}
                          onChange={(e) => {
                            const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, penaltyEnabled: e.target.checked } : a);
                            saveAssociationsState(updated);
                            writeAuditLog(activeAssoc.id, activeAssoc.id, 'إعدادات', 'edit', '', `تعديل خيار غرامة المتأخرات إلى: ${e.target.checked}`);
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-550 border-slate-205 rounded"
                        />
                      </div>

                      {activeAssoc.penaltyEnabled && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-rose-50/40 border border-rose-100 rounded-xl animate-fade-in text-[11px]">
                          <div>
                            <span className="block text-slate-500 mb-1">نوع الغرامة:</span>
                            <select
                              value={activeAssoc.penaltyType}
                              onChange={(e) => {
                                const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, penaltyType: e.target.value as 'fixed' | 'percentage' } : a);
                                saveAssociationsState(updated);
                              }}
                              className="w-full px-2 py-1 bg-white border rounded text-2xs"
                            >
                              <option value="fixed">مبلغ مالي ثابت مقطوع</option>
                              <option value="percentage">نسبة مئوية من قسط الدورة</option>
                            </select>
                          </div>
                          <div>
                            <span className="block text-slate-500 mb-1">القيمة المقررة:</span>
                            <input
                              type="number"
                              value={activeAssoc.penaltyValue}
                              onChange={(e) => {
                                const updated = associations.map(a => a.id === activeAssoc.id ? { ...a, penaltyValue: Number(e.target.value) } : a);
                                saveAssociationsState(updated);
                              }}
                              className="w-full px-2 py-1 bg-white border rounded text-2xs text-center"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* 4. MODALS & SUBMISSIONS DIALOGS PORTS */}

      {/* Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 w-full h-full flex items-center justify-center z-50 p-4" id="create-assoc-modal">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-black text-slate-905 dark:text-white text-sm md:text-base flex items-center gap-2">
                <Coins className="text-indigo-650" size={18} />
                <span>تهيئة وتأسيس جمعية جديدة بالدفتر</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 px-2 hover:bg-slate-50 rounded">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAssociation} className="mt-4 space-y-4 text-xs font-bold leading-normal text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">اسم الجمعية التعاونية:</label>
                  <input
                    type="text"
                    required
                    value={newAssocForm.name}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: جمعية الموظفين الكبرى"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">نوع الجمعية المعتمد:</label>
                  <select
                    value={newAssocForm.type}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-850 border border-slate-205 rounded-lg text-slate-800 dark:text-white"
                  >
                    <option value="daily">يومية جارية (مسجلة كل يوم)</option>
                    <option value="weekly">أسبوعية جارية (مسجلة كل 7 أيام)</option>
                    <option value="monthly">شهرية دورية (مسجلة شهرياً)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">وضعيتك وصفتك بالجمعية:</label>
                  <select
                    value={newAssocForm.role}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-850 border border-slate-205 rounded-lg text-slate-800 dark:text-white"
                  >
                    <option value="member">أنا مشترك (مساهم بانتظار استلام حصتي)</option>
                    <option value="manager">أنا مدير الجمعية (أدير مشتركين وصندوق جاري)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">مبلغ قسط الاشتراك الدورى:</label>
                  <input
                    type="number"
                    required
                    value={newAssocForm.installmentAmount}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, installmentAmount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">تاريخ بداية السريان:</label>
                  <input
                    type="date"
                    required
                    value={newAssocForm.startDate}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">عدد الدورات والأقساط الكلي:</label>
                  <input
                    type="number"
                    required
                    value={newAssocForm.cyclesCount}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, cyclesCount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-center font-mono"
                  />
                </div>
              </div>

              {newAssocForm.role === 'member' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border">
                  <div>
                    <label className="block text-slate-550 mb-1">ترتيب واستلامك للدور:</label>
                    <input
                      type="number"
                      value={newAssocForm.receiveTurn}
                      onChange={(e) => setNewAssocForm(prev => ({ ...prev, receiveTurn: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 bg-white border rounded text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-550 mb-1">تاريخ الاستلام التقدييري:</label>
                    <input
                      type="date"
                      value={newAssocForm.receiveDate}
                      onChange={(e) => setNewAssocForm(prev => ({ ...prev, receiveDate: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border rounded text-center font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-500 mb-1">عدد المشتركين بالجمعية جاري:</label>
                  <input
                    type="number"
                    value={newAssocForm.membersCount}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, membersCount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-center font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">اسم المسؤول المباشر للجمعية:</label>
                  <input
                    type="text"
                    value={newAssocForm.managerName}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, managerName: e.target.value }))}
                    placeholder="مثال: أمين الشيباني"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">رقم هاتف المسؤول / للتواصل:</label>
                  <input
                    type="text"
                    value={newAssocForm.phone}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono text-center"
                  />
                </div>
              </div>

              {/* General Post ledger sync */}
              <div className="flex items-center justify-between p-3 bg-indigo-50/20 border border-indigo-100 rounded-xl">
                <div>
                  <span className="block text-slate-800">تفعيل الترحيل التلقائي للحسابات العامة:</span>
                  <span className="text-[10px] text-slate-400 font-normal">ترحيل الدفعات تلقائياً إلى شاشة القيود والسحوبات.</span>
                </div>
                <input
                  type="checkbox"
                  checked={newAssocForm.postToGeneralLedger}
                  onChange={(e) => setNewAssocForm(prev => ({ ...prev, postToGeneralLedger: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-550 border-slate-250 rounded"
                />
              </div>

              {newAssocForm.postToGeneralLedger && newAssocForm.role === 'member' && (
                <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <span className="text-slate-500 font-bold block">تسجيل دفعات الجمعية ضمن:</span>
                  <select
                    value={newAssocForm.paymentDestinationType}
                    onChange={(e) => setNewAssocForm(prev => ({ ...prev, paymentDestinationType: e.target.value as any }))}
                    className="px-2.5 py-1 bg-white border rounded text-2xs"
                  >
                    <option value="drawing">السحوبات المالية الشخصية (Drawing)</option>
                    <option value="expense">المصروفات العامة المباشرة (Expenses)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-500 mb-1">ملاحظات ووصف الجمعية:</label>
                <textarea
                  value={newAssocForm.notes}
                  onChange={(e) => setNewAssocForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md font-black"
                >
                  تعميد وتأسيس الجمعية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment / Group operation entry Modal */}
      {isPaymentModalOpen && activeAssoc && (
        <div className="fixed inset-0 bg-slate-900/60 w-full h-full flex items-center justify-center z-50 p-4" id="post-payment-modal">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-805">
              <h3 className="font-black text-slate-905 dark:text-white text-base">
                {activeAssoc.role === 'member' ? 'قيد سداد دفعة قسط للجمعية' : 'قيد حركة محاسبية جديدة بالدفتر'}
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 px-2 hover:bg-slate-50 rounded">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {activeAssoc.role === 'member' ? (
              /* Subscriber Simple Payment Form */
              <form onSubmit={handlePayInstallment} className="mt-4 space-y-4 text-xs font-bold text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">تاريخ السداد الفعلي:</label>
                    <input
                      type="date"
                      required
                      value={newPaymentForm.date}
                      onChange={(e) => setNewPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-slate-50 border rounded font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">المبلغ المدفوع المقيد:</label>
                    <input
                      type="number"
                      required
                      value={newPaymentForm.amount || activeAssoc.installmentAmount}
                      onChange={(e) => setNewPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 bg-slate-50 border rounded text-center font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">تفاصيل وبيان قيد السند:</label>
                  <input
                    type="text"
                    required
                    value={newPaymentForm.statement}
                    onChange={(e) => setNewPaymentForm(prev => ({ ...prev, statement: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-55 border rounded"
                  />
                </div>

                {activeAssoc.postToGeneralLedger && (
                  <div>
                    <label className="block text-slate-550 mb-1">ربط الترحيل بموظف معين (اختياري للاستقطاع):</label>
                    <select
                      value={newPaymentForm.linkedEmployeeId}
                      onChange={(e) => setNewPaymentForm(prev => ({ ...prev, linkedEmployeeId: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                    >
                      <option value="">-- ترحيل عام على الصندوق --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-3.5 py-2 bg-slate-100 text-slate-500 rounded">تراجع</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded shadow font-black">حفظ وتعمد السند</button>
                </div>
              </form>
            ) : (
              /* Manager Multi-operations Ledger Form */
              <form onSubmit={handleAddGroupTransaction} className="mt-4 space-y-4 text-xs font-bold text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">تاريخ المعاملة المالي:</label>
                    <input
                      type="date"
                      required
                      value={newGroupOpForm.date}
                      onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-slate-50 border rounded font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">نوع الحركة والتبويب:</label>
                    <select
                      value={newGroupOpForm.type}
                      onChange={(e) => {
                        const typeVal = e.target.value as any;
                        let defaultStmt = '';
                        if (typeVal === 'payment') defaultStmt = 'استلام قسط الدورة المعتاد';
                        if (typeVal === 'late_payment') defaultStmt = 'سداد قسط متأخر من المشترك';
                        if (typeVal === 'received_association') defaultStmt = 'تسليم حصة الجمعية للمشتري بالدور';
                        if (typeVal === 'late_fee') defaultStmt = 'قيد رسوم غرامة تأخير السداد';
                        if (typeVal === 'discount') defaultStmt = 'خصم استثنائي أو منحة';
                        if (typeVal === 'expense') defaultStmt = 'مصروف خدمات وعمولات الجمعية';

                        setNewGroupOpForm(prev => ({ 
                          ...prev, 
                          type: typeVal,
                          statement: defaultStmt
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg"
                    >
                      <option value="payment">دفعة قسط معتاد (Credit +)</option>
                      <option value="late_payment">دفعة قسط متأخر (Credit +)</option>
                      <option value="received_association">تسليم العضو/استلام الجمعية (Debit -)</option>
                      <option value="late_fee">غرامة تأخير مطبقة (Credit +)</option>
                      <option value="discount">خصم وتنزيل مستحقات (Debit -)</option>
                      <option value="balance_adjustment">تعديل رصيد صندوقي (Credit +)</option>
                      <option value="refund">استرجاع مبلغ للمشترك (Debit -)</option>
                      <option value="expense">مصروف مرتبط بالجمعية (Debit -)</option>
                      <option value="manual_settlement">تسوية يدوية قيدية (Credit +)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-550 mb-1">المشترك المعني بالحركة:</label>
                    <select
                      value={newGroupOpForm.memberId}
                      onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, memberId: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg"
                    >
                      <option value="">-- صندوق عام للجمعية --</option>
                      {members.filter(m => m.associationId === activeAssoc.id).map(m => (
                        <option key={m.id} value={m.id}>{m.name} (الدور: {m.receiveTurn})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">المبلغ المالي المعتمد:</label>
                    <input
                      type="number"
                      required
                      value={newGroupOpForm.amount || activeAssoc.installmentAmount}
                      onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 bg-slate-50 border rounded text-center font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">البيان المكتوب بالتفصيل:</label>
                  <input
                    type="text"
                    required
                    value={newGroupOpForm.statement}
                    onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, statement: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">رقم الدورة أو الشهر المستهدف:</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={activeAssoc.cyclesCount}
                      value={newGroupOpForm.cycleNumber}
                      onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, cycleNumber: Number(e.target.value) }))}
                      className="w-full px-3 py-1.5 bg-slate-50 border rounded text-center font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">حالة السداد / الصرف:</label>
                    <select
                      value={newGroupOpForm.paymentStatus}
                      onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg"
                    >
                      <option value="paid">كامل / مدفوع بالكامل</option>
                      <option value="partial">جزئي</option>
                      <option value="late">متأخر / مؤجل</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-550 mb-1">ملاحظات ومستندات تدعيمية:</label>
                  <input
                    type="text"
                    value={newGroupOpForm.notes}
                    onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="مثال: سند استلام رقم #1201"
                    className="w-full px-3 py-2 bg-slate-50 border rounded text-slate-800"
                  />
                </div>

                {activeAssoc.postToGeneralLedger && (
                  <div>
                    <label className="block text-slate-550 mb-1">ربط الترحيل بموظف حسابي بالشركة (اختياري):</label>
                    <select
                      value={newGroupOpForm.linkedEmployeeId}
                      onChange={(e) => setNewGroupOpForm(prev => ({ ...prev, linkedEmployeeId: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                    >
                      <option value="">-- ترحيل للصندوق العام للمنشأة --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-3.5 py-2 bg-slate-100 text-slate-500 rounded font-bold">تراجع</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded shadow font-black">تسجيل القيد واعتماده</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Member Insert/Edit Modal */}
      {isMemberModalOpen && activeAssoc && (
        <div className="fixed inset-0 bg-slate-900/60 w-full h-full flex items-center justify-center z-50 p-4" id="manage-member-modal">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="font-black text-slate-905 dark:text-white text-base">
                {editingMemberId ? 'تعديل بيانات المشترك الحالي' : 'إضافة مشترك جديد لجدول الجمعية'}
              </h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="p-1 px-2 hover:bg-slate-50 rounded">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="mt-4 space-y-4 text-xs font-bold text-right leading-loose">
              <div>
                <label className="block text-slate-500 mb-1">اسم المشترك المعتمد:</label>
                <input
                  type="text"
                  required
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="الاسم الثلاثي للمشترك الكلي"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">رقم هاتف المحمول:</label>
                  <input
                    type="text"
                    value={newMemberForm.phone}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">مبلغ قسط المشترك (اختياري):</label>
                  <input
                    type="number"
                    value={newMemberForm.installmentAmount}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, installmentAmount: Number(e.target.value) }))}
                    placeholder={`${activeAssoc.installmentAmount} (الافتراضي)`}
                    className="w-full px-3 py-1.5 bg-slate-50 border rounded text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">دور وترتيب الاستلام:</label>
                  <input
                    type="number"
                    required
                    value={newMemberForm.receiveTurn}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, receiveTurn: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border rounded text-center font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">تاريخ الاستلام الجدولي:</label>
                  <input
                    type="date"
                    value={newMemberForm.receiveDate}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, receiveDate: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border rounded text-center font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 mb-1">حالة المشترك الحالية:</label>
                  <select
                    value={newMemberForm.status}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-xs"
                  >
                    <option value="regular">منتظم</option>
                    <option value="late">متأخر</option>
                    <option value="withdrawn">منسحب</option>
                    <option value="received">استلم دوره</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">تاريخ انضمام المشترك:</label>
                  <input
                    type="date"
                    required
                    value={newMemberForm.joinedDate}
                    onChange={(e) => setNewMemberForm(prev => ({ ...prev, joinedDate: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border rounded text-center font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">ملاحظات العضو الخاصة:</label>
                <textarea
                  value={newMemberForm.notes}
                  onChange={(e) => setNewMemberForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-55 border rounded h-16 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsMemberModalOpen(false)} className="px-3.5 py-2 bg-slate-100 text-slate-500 rounded">إلغاء</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded shadow font-black">حفظ العضو</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Export printable preview container */}
      {isPDFOpen && activeAssoc && (
        <AssociationsPDF
          assoc={activeAssoc}
          members={members}
          txs={groupTransactions}
          payments={payments}
          appSettings={appSettings}
          loggedInUserName={loggedInUserName}
          onClose={() => setIsPDFOpen(false)}
        />
      )}

    </div>
  );
}
