export enum UserRole {
  ADMIN = 'ADMIN', // مدير النظام
  ACCOUNTANT = 'ACCOUNTANT', // محاسب
  USER = 'USER' // مستخدم عادي
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  phone?: string;
}

export interface Employee {
  id: string; // رقم الموظف (عرضي)
  name: string; // الاسم
  jobTitle: string; // الوظيفة
  salary: number; // الراتب الأساسي
  hireDate: string; // تاريخ التوظيف
  phone: string; // رقم الهاتف
  notes: string; // الملاحظات
  isArchived: boolean; // مؤرشف أو نشط
}

export enum TransactionType {
  SALARY = 'salary', // راتب شهري
  INSTALLMENT = 'installment', // قسط شهري
  ADVANCE = 'advance', // سلفة
  DEDUCTION = 'deduction', // خصم
  ABSENCE = 'absence', // غياب
  BONUS = 'bonus', // مكافأة
  TRANSPORT = 'transport', // بدل مواصلات
  HOUSING = 'housing', // بدل سكن
  CUSTODY = 'custody', // عهدة
  CUSTODY_RETURN = 'custody_return', // استرداد عهدة
  THURSDAY_ADVANCE = 'thursday_advance', // سلفة الخميس
  EID_CLOTHES = 'eid_clothes', // ملابس العيد
  FROZEN_DEBT = 'frozen_debt', // مديونية مجمدة
  OTHER = 'other' // مصروفات أخرى
}

export interface Transaction {
  id: string;
  employeeId: string;
  date: string; // تاريخ الحركة
  type: string; // نوع الحركة (مثال: TransactionType أو نوع مخصص)
  statement: string; // البيان
  debit: number; // مدين (سحوبات وسلف وخصميات وقسط وغياب)
  credit: number; // دائن (راتب ومكافأة وبدلات واسترداد عهدة)
  balance: number; // الرصيد التراكمي المحتسب تلقائياً
  notes?: string; // ملاحظات إضافية
}

export interface InstitutionConfig {
  name: string;
  logoText: string;
  phone: string;
  address: string;
  currency: string;
}

export interface AppSettings {
  institution: InstitutionConfig;
  primaryColor: string;
  darkMode: boolean;
  backupFile?: string;
  readonlyMode?: boolean;
}

export interface AIAnalysisResult {
  expenseSummary: string;
  discrepancies: string[];
  recursiveDeductions: string[];
  anomalies: string[];
  monthlySummaryMarkdown: string;
}

export interface Association {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  role: 'member' | 'manager';
  installmentAmount: number;
  startDate: string;
  endDate: string;
  cyclesCount: number;
  membersCount: number;
  receiveTurn: number;
  receiveDate: string;
  totalAmount: number;
  status: 'active' | 'completed' | 'paused';
  managerName: string;
  phone: string;
  notes: string;
  payoutStatus: 'received' | 'not_received';
  receiveAmount: number;
  
  // Settings for the Association (حادي عشر وثامن عشر)
  balanceCalculationType: 'cumulative' | 'outstanding';
  penaltyEnabled: boolean;
  penaltyType: 'fixed' | 'percentage';
  penaltyValue: number;
  continuePayingAfterPayout: boolean;
  postToGeneralLedger: boolean;
  paymentDestinationType: 'drawing' | 'expense';
  showDelayedInDashboard: boolean;
}

export interface AssociationPayment {
  id: string;
  associationId: string;
  memberId?: string;
  date: string;
  amount: number;
  statement: string;
  status: 'paid' | 'late' | 'delayed';
  penaltyApplied: number;
}

export interface AssociationMember {
  id: string;
  associationId: string;
  name: string;
  phone: string;
  installmentAmount: number;
  receiveTurn: number;
  receiveDate: string;
  receiveStatus: 'received' | 'not_received';
  notes: string;
  status?: 'regular' | 'late' | 'withdrawn' | 'received'; // منتظم / متأخر / منسحب / استلم دوره
  joinedDate?: string; // تاريخ الانضمام
  receiveAmount?: number;
  receiveStatusType?: 'completed' | 'partial' | 'postponed'; // كامل / جزئي / مؤجل
  receiveNotes?: string;
}

export interface AssociationTransaction {
  id: string;
  associationId: string;
  date: string;
  statement: string;
  type: 'payment' | 'late_payment' | 'received_association' | 'late_fee' | 'discount' | 'balance_adjustment' | 'refund' | 'expense' | 'manual_settlement';
  debit: number;
  credit: number;
  balance: number;
  status: string;
  memberId?: string;
  memberName?: string;
  cycleNumber?: number;         // رقم الدورة أو الشهر
  paymentStatus?: 'paid' | 'partial' | 'late'; // حالة السداد: (مدفوع / جزئي / متأخر)
  notes?: string;               // ملاحظات ومستند الصرف
}

export interface AssociationAuditLog {
  id: string;
  associationId: string;
  itemId: string;
  itemType: string;
  action: 'create' | 'edit' | 'delete';
  modifier: string;
  date: string;
  oldValue: string;
  newValue: string;
}

export interface AssociationDueSchedule {
  id: string;
  associationId: string;
  memberId: string;
  cycleNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  status: 'pending' | 'paid' | 'partially_paid' | 'late';
}

export interface AssociationReceipt {
  id: string;
  associationId: string;
  transactionId: string;
  memberId: string;
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  recipientName: string;
  notes: string;
}

export interface AssociationSettings {
  id: string;
  associationId: string;
  balanceCalculationType: 'cumulative' | 'outstanding';
  penaltyEnabled: boolean;
  penaltyType: 'fixed' | 'percentage';
  penaltyValue: number;
  continuePayingAfterPayout: boolean;
  postToGeneralLedger: boolean;
  paymentDestinationType: 'drawing' | 'expense';
  notifyBeforeDays: number;
  currency: string;
  showActiveOnly: boolean;
}

export interface AssociationAlert {
  id: string;
  associationId: string;
  memberId: string;
  type: 'late_payment' | 'due_soon' | 'general';
  text: string;
  date: string;
  isRead: boolean;
}

export interface AssociationExport {
  id: string;
  associationId: string;
  exportType: 'pdf' | 'excel' | 'print';
  date: string;
  exportedBy: string;
  fileUrl?: string;
  notes?: string;
}

export interface TreasuryActivity {
  id: string;
  date: string;
  type: 'deposit' | 'withdraw' | 'general_expense' | 'general_revenue' | 'transfer_to_employee' | 'transfer_from_employee' | 'transfer_to_association' | 'transfer_from_association' | 'cash_reconciliation' | 'balance_correction';
  statement: string;
  amount: number;
  direction: 'in' | 'out';
  relatedEntityId?: string;
  relatedEntityType?: 'employee' | 'association' | 'external' | 'general';
  user: string;
  notes?: string;
}

export interface TreasuryState {
  initialBalance: number;
  currentBalance: number;
  lastReconciliationDate?: string;
  activities: TreasuryActivity[];
}

export interface PaymentVoucher {
  id: string; // unique voucher code, i.e. PV-
  date: string;
  type: 'receipt' | 'payment'; // قبض / صرف
  beneficiaryOrPayer: string;
  relatedEntityType: 'employee' | 'association' | 'treasury' | 'external';
  relatedEntityId?: string;
  amount: number;
  statement: string;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'other';
  user: string;
  status: 'draft' | 'approved' | 'cancelled'; // مسودة / معتمد / ملغي
  notes?: string;
  linkedActivityId?: string;
}

export interface GeneralExpenseRevenue {
  id: string;
  date: string;
  type: 'expense' | 'revenue'; // مصروف / إيراد
  category: string;
  statement: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'other';
  isLinkedToTreasury: boolean;
  relatedEntityId?: string;
  relatedEntityType?: 'employee' | 'association' | 'general';
  notes?: string;
  linkedActivityId?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: 'individual' | 'company' | 'agency' | 'other'; // فرد / شركة / جهة / أخرى
  createdAt: string;
  status: 'active' | 'suspended' | 'archived'; // نشط / موقوف / مؤرشف
  notes?: string;
}

export interface ClientService {
  id: string; // رقم معاملة فريد
  customerId: string; // العميل المرتبط
  date: string;
  serviceType: string; // نوع الخدمة
  cost: number; // قيمة الخدمة أو الرسوم
  paidAmount: number; // المبلغ المدفوع
  remainingAmount: number; // المبلغ المتبقي
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'; // جديدة / قيد التنفيذ / مكتملة / ملغية
  notes?: string;
}

export interface ClientDebt {
  id: string;
  customerId: string;
  serviceId?: string; // المعاملة المرتبطة إن وجدت
  dueDate: string;
  amount: number; // المبلغ الأصلي
  paid: number; // المدفوع
  remaining: number; // المتبقي
  status: 'open' | 'paid' | 'overdue' | 'scheduled'; // مفتوح / مسدد / متأخر / مجدول
  notes?: string;
}

export interface ClientCollection {
  id: string;
  customerId: string;
  debtId?: string;
  date: string;
  amountCollected: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'other';
  isLinkedToTreasury: boolean;
  voucherId?: string; // سند القبض المرتبط
  notes?: string;
  linkedActivityId?: string;
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoicePayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'other';
  isLinkedToTreasury: boolean;
  voucherId?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  date: string;
  type: 'service' | 'sale' | 'general';
  items: InvoiceItem[];
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'draft' | 'approved' | 'paid' | 'partial' | 'unpaid' | 'cancelled';
  notes?: string;
  createdBy: string;
  payments: InvoicePayment[];
}

export interface QuotationItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Quotation {
  id: string;
  customerId: string;
  date: string;
  items: QuotationItem[];
  totalAmount: number;
  expiryDate: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  notes?: string;
  createdBy: string;
}

export interface ClientOrder {
  id: string;
  customerId: string;
  date: string;
  orderType: string;
  description: string;
  estimatedValue?: number;
  status: 'new' | 'in_progress' | 'pending_client' | 'completed' | 'cancelled';
  employeeId?: string;
  notes?: string;
  convertedToId?: string;
  convertedToType?: 'quotation' | 'invoice';
}

export interface AppLicense {
  installationId: string;
  licenseKey: string;
  customerName: string;
  phone: string;
  deviceId?: string;
  activatedAt: string;
  expiresAt?: string;
  status: 'trial' | 'active' | 'expired' | 'blocked';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  username?: string;
  action?: string;
  module?: string;
  details?: string;
  deviceType?: string;
  
  // compatibility fields for existing offline audit logs
  user?: string;
  actionType?: string;
  entity?: string;
  notes?: string;
  oldValue?: string;
  newValue?: string;
}

export interface SystemBackupPayload {
  version: '10.5';
  exportedAt: string;
  app: {
    name: string;
    version: string;
  };
  data: {
    settings: AppSettings;
    employees: Employee[];
    financeSummaries?: any[];
    financialOps?: any[];
    associations: Association[];
    associationMembers: AssociationMember[];
    associationTransactions: AssociationTransaction[];
    associationPayments: AssociationPayment[];
    corporateLedgers: GeneralExpenseRevenue[];
    vouchers: PaymentVoucher[];
    customers: Client[];
    customerDebts: ClientDebt[];
    customerCollections: ClientCollection[];
    auditLogs: AuditLog[];
  };
}





