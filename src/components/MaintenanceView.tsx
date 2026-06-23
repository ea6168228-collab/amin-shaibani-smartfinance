import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Wrench, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Database, 
  Coins, 
  ShieldAlert, 
  Trash2, 
  Clock, 
  Terminal, 
  BarChart3, 
  Sparkles,
  Search,
  FileCheck2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Employee, Transaction, UserRole } from '../types';
import { addAuditLog } from '../utils/auditLogger';

interface MaintenanceViewProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUserRole: UserRole;
  isReadOnly?: boolean;
}

interface IntegrityIssue {
  id: string;
  category: 'invoice' | 'voucher' | 'treasury' | 'association' | 'client' | 'employee' | 'activation' | 'backup';
  severity: 'critical' | 'medium' | 'info';
  title: string;
  description: string;
  isFixable: boolean;
  affectedId?: string;
  extraData?: any;
}

export default function MaintenanceView({
  employees,
  setEmployees,
  transactions,
  setTransactions,
  currentUserRole,
  isReadOnly = false
}: MaintenanceViewProps) {
  // Resolved prefixes & keys
  const customUserId = localStorage.getItem('amin_sh_user_id') || '';
  const isCustomWorkspace = currentUserRole === UserRole.USER && !!customUserId && !['admin', 'accountant', 'viewer'].includes(customUserId);
  const prefix = isCustomWorkspace ? `_${customUserId}` : '';

  const clientsKey = `amin_sh_clients${prefix}`;
  const servicesKey = `amin_sh_client_services${prefix}`;
  const debtsKey = `amin_sh_client_debts${prefix}`;
  const collectionsKey = `amin_sh_client_collections${prefix}`;
  const treasuryKey = `amin_sh_treasury_state${prefix}`;
  const vouchersKey = `amin_sh_vouchers${prefix}`;
  const invoicesKey = `amin_sh_invoices${prefix}`;
  const quotationsKey = `amin_sh_quotations${prefix}`;
  const ordersKey = `amin_sh_orders${prefix}`;
  const associationsKey = `amin_sh_associations${prefix}`;
  const groupTxsKey = `amin_sh_group_txs${prefix}`;
  const paymentsKey = `amin_sh_payments${prefix}`;
  const membersKey = `amin_sh_members${prefix}`;

  // State Management
  const [activeSubTab, setActiveSubTab] = useState<'checker' | 'stats' | 'logs'>('checker');
  const [recordCounts, setRecordCounts] = useState<Record<string, number>>({});
  const [lastBackup, setLastBackup] = useState<string>('لا يوجد نسخ احتياطي مسجل');
  const [lastImport, setLastImport] = useState<string>('لم يتم في هذه الجلسة');
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [logsSearch, setLogsSearch] = useState<string>('');
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

  // System general configs
  const systemVersion = "v3.1 - النسخة الإنتاجية المستقرة النهائية";
  const isOnlineSupported = false; // Works fully offline

  useEffect(() => {
    loadDashboardStats();
    loadAuditLogs();
    // Run initial scan automatically on mount
    runSystemScanner(false);
  }, [employees, transactions]);

  const loadDashboardStats = () => {
    try {
      const clients = JSON.parse(localStorage.getItem(clientsKey) || '[]');
      const invoices = JSON.parse(localStorage.getItem(invoicesKey) || '[]');
      const quotes = JSON.parse(localStorage.getItem(quotationsKey) || '[]');
      const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
      const assocs = JSON.parse(localStorage.getItem(associationsKey) || '[]');
      const vouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
      const treasury = JSON.parse(localStorage.getItem(treasuryKey) || '{"activities":[]}');
      const collections = JSON.parse(localStorage.getItem(collectionsKey) || '[]');

      setRecordCounts({
        employees: employees.length,
        transactions: transactions.length,
        clients: clients.length,
        invoices: invoices.length,
        quotations: quotes.length,
        orders: orders.length,
        associations: assocs.length,
        vouchers: vouchers.length,
        treasuryActivities: treasury.activities ? treasury.activities.length : 0,
        collections: collections.length
      });

      // Load last backup date from local snapshots or audit log
      const snapshotsStr = localStorage.getItem('amin_sh_local_snapshots') || '[]';
      const snapshots = JSON.parse(snapshotsStr);
      if (Array.isArray(snapshots) && snapshots.length > 0) {
        const lastSnap = snapshots[0];
        const date = new Date(lastSnap.timestamp).toLocaleString('ar-YE', { hour12: true });
        setLastBackup(`${date} (${lastSnap.desc})`);
      } else {
        setLastBackup('لم يتم تحديد كترتيب محلي بعد - ننصح بإنشاء نسخة احتياطية الآن');
      }

      // Check for last import activity
      const audit = localStorage.getItem('amin_sh_system_audit_logs') || '[]';
      const parsedAudit = JSON.parse(audit);
      const importLog = parsedAudit.find((log: any) => log.actionType === 'استعادة نسخة احتياطية' || log.actionType === 'استيراد بوابات');
      if (importLog) {
        setLastImport(new Date(importLog.timestamp).toLocaleString('ar-YE'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditLogs = () => {
    try {
      const logsStr = localStorage.getItem('amin_sh_system_audit_logs') || '[]';
      setSystemLogs(JSON.parse(logsStr));
    } catch {
      setSystemLogs([]);
    }
  };

  // Integrity Scanner Engine
  const runSystemScanner = (showFeedback = true) => {
    setIsScanning(true);
    setFixMessage(null);
    const scannedIssues: IntegrityIssue[] = [];

    // Simulate small scanner delay for aesthetic/visual verification
    setTimeout(() => {
      try {
        // ----------------------------------------------------
        // 1. INVOICES CHECK: Matching payments & calculated balance
        // ----------------------------------------------------
        const invoices = JSON.parse(localStorage.getItem(invoicesKey) || '[]');
        invoices.forEach((inv: any) => {
          const paymentsSum = Array.isArray(inv.payments) 
            ? inv.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
            : 0;
          
          const expectedRemaining = Math.max(0, inv.totalAmount - inv.discount - paymentsSum);
          
          if (Math.abs(inv.remainingAmount - expectedRemaining) > 0.1) {
            scannedIssues.push({
              id: `inv_bal_${inv.id}`,
              category: 'invoice',
              severity: 'critical',
              title: `تفاوت الرصيد في الفاتورة رقم (${inv.id})`,
              description: `الرصيد المتبقي المسجل (${inv.remainingAmount} ر.ي) لا يتطابق مع القيمة الإجمالية مطروحاً منها الدفعات المعتمدة (المتوقع: ${expectedRemaining} ر.ي).`,
              isFixable: true,
              affectedId: inv.id,
              extraData: { expectedRemaining, paymentsSum }
            });
          }

          // Invoices Status Check
          let correctStatus = inv.status;
          if (paymentsSum === 0) {
            correctStatus = 'unpaid';
          } else if (expectedRemaining <= 0) {
            correctStatus = 'paid';
          } else if (paymentsSum > 0 && expectedRemaining > 0) {
            correctStatus = 'partial';
          }

          if (inv.status !== 'cancelled' && inv.status !== 'draft' && inv.status !== correctStatus) {
            scannedIssues.push({
              id: `inv_status_${inv.id}`,
              category: 'invoice',
              severity: 'medium',
              title: `حالة غير دقيقة للفاتورة رقم (${inv.id})`,
              description: `الحالة المسجلة هي (${inv.status}) بينما العمليات المادية تشير لكونها (${correctStatus}).`,
              isFixable: true,
              affectedId: inv.id,
              extraData: { correctStatus, paymentsSum }
            });
          }
        });

        // ----------------------------------------------------
        // 2. ORPHAN VOUCHERS CHECK: Vouchers pointing to deleted accounts
        // ----------------------------------------------------
        const vouchers = JSON.parse(localStorage.getItem(vouchersKey) || '[]');
        const assocs = JSON.parse(localStorage.getItem(associationsKey) || '[]');
        
        vouchers.forEach((v: any) => {
          if (v.status !== 'cancelled') {
            if (v.relatedEntityType === 'employee' && v.relatedEntityId) {
              const empExists = employees.some(e => e.id === v.relatedEntityId);
              if (!empExists) {
                scannedIssues.push({
                  id: `vouch_orphan_${v.id}`,
                  category: 'voucher',
                  severity: 'medium',
                  title: `سند رقم (${v.id}) مرتبط بموظف غير موجود`,
                  description: `السند مقيد لصالح الموظف صاحب المعرف (${v.relatedEntityId}) وهو مفقود أو تم حذفه من سجل الموظفين الحالي.`,
                  isFixable: false,
                  affectedId: v.id
                });
              }
            } else if (v.relatedEntityType === 'association' && v.relatedEntityId) {
              const assocExists = assocs.some((a: any) => a.id === v.relatedEntityId);
              if (!assocExists) {
                scannedIssues.push({
                  id: `vouch_orphan_assoc_${v.id}`,
                  category: 'voucher',
                  severity: 'medium',
                  title: `سند رقم (${v.id}) مرتبط بجمعية غير موجودة`,
                  description: `السند مقيد للجمعية صاحب المعرف (${v.relatedEntityId}) المعرف يبدو مفقوداً أو تم حذفه.`,
                  isFixable: false,
                  affectedId: v.id
                });
              }
            }
          }
        });

        // ----------------------------------------------------
        // 3. TREASURY BALANCE CHECK: Discrepancy with activity ledger
        // ----------------------------------------------------
        const treasury = JSON.parse(localStorage.getItem(treasuryKey) || '{"initialBalance":0,"currentBalance":0,"activities":[]}');
        const initial = treasury.initialBalance || 0;
        let runningTreastury = initial;
        
        if (Array.isArray(treasury.activities)) {
          treasury.activities.forEach((act: any) => {
            if (act.direction === 'in') {
              runningTreastury += (act.amount || 0);
            } else if (act.direction === 'out') {
              runningTreastury -= (act.amount || 0);
            }
          });
        }
        
        if (Math.abs((treasury.currentBalance || 0) - runningTreastury) > 0.1) {
          scannedIssues.push({
            id: `treasury_balance_mismatch`,
            category: 'treasury',
            severity: 'critical',
            title: `عدم تطابق الرصيد النهائي للخزينة`,
            description: `رصيد الخزينة النهائي المسجل هو (${treasury.currentBalance || 0} ر.ي) بينما التراكمي الفعلي المسجل بالدفتر هو (${runningTreastury} ر.ي).`,
            isFixable: true,
            extraData: { expectedBalance: runningTreastury }
          });
        }

        // ----------------------------------------------------
        // 4. CLIENT DEBTS & RECEIPTS CHECK
        // ----------------------------------------------------
        const debts = JSON.parse(localStorage.getItem(debtsKey) || '[]');
        const collections = JSON.parse(localStorage.getItem(collectionsKey) || '[]');
        
        debts.forEach((debt: any) => {
          // Sum paid collections linked to this debt
          const matchingCollections = collections.filter((c: any) => c.debtId === debt.id);
          const collectedSum = matchingCollections.reduce((sum: number, c: any) => sum + (c.amountCollected || 0), 0);
          const computedRemaining = Math.max(0, debt.amount - collectedSum);

          if (Math.abs(debt.paid - collectedSum) > 0.1 || Math.abs(debt.remaining - computedRemaining) > 0.1) {
            scannedIssues.push({
              id: `debt_calc_${debt.id}`,
              category: 'client',
              severity: 'medium',
              title: `تفاوت حساب الدين للعميل المعرف (${debt.customerId})`,
              description: `حساب مديونية السند (${debt.id}) يظهر متبقي غير متناسب مع الدفعات المسددة بالتحصيل (المتبقي: ${debt.remaining}، المحسوب: ${computedRemaining} ر.ي).`,
              isFixable: true,
              affectedId: debt.id,
              extraData: { computedRemaining, collectedSum }
            });
          }
        });

        // ----------------------------------------------------
        // 5. EMPLOYEE LEDGER SEQUENCE CHECK (Sequential balances)
        // ----------------------------------------------------
        employees.forEach((emp: any) => {
          const empTxs = transactions
            .filter(t => t.employeeId === emp.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          let lastBal = 0;
          let sequenceDrift = false;
          
          empTxs.forEach((tx: any) => {
            lastBal += (tx.credit || 0) - (tx.debit || 0);
            if (tx.balance !== undefined && Math.abs(tx.balance - lastBal) > 0.1) {
              sequenceDrift = true;
            }
          });

          if (sequenceDrift) {
            scannedIssues.push({
              id: `emp_ledger_drift_${emp.id}`,
              category: 'employee',
              severity: 'medium',
              title: `انزياح تراكمي بكشف حساب الموظف (${emp.name})`,
              description: `يفرز الجدول أرصدة كشف تراكمية لا تطابق ميزان المراجعة الحسابي الدقيق لترتيب الحركات.`,
              isFixable: true,
              affectedId: emp.id
            });
          }
        });

        // ----------------------------------------------------
        // 6. ASSOCIATIONS BALANCES
        // ----------------------------------------------------
        const groupTxs = JSON.parse(localStorage.getItem(groupTxsKey) || '[]');
        assocs.forEach((assoc: any) => {
          const txs = groupTxs.filter((t: any) => t.associationId === assoc.id);
          const totalCredits = txs.reduce((sum: number, t: any) => sum + (t.credit || 0), 0);
          const totalDebits = txs.reduce((sum: number, t: any) => sum + (t.debit || 0), 0);
          const expectedChest = totalCredits - totalDebits;

          if (assoc.status === 'active' && assoc.role === 'manager' && Math.abs(expectedChest - (assoc.totalAmount || 0)) > 10) {
            scannedIssues.push({
              id: `assoc_chest_${assoc.id}`,
              category: 'association',
              severity: 'info',
              title: `تفاوت صندوق جمعية (${assoc.name})`,
              description: `صندوق الجمعية بالدفتر لا يتكامل بالكامل مع الأرصدة المصروفة أو الدفعات الحقيقية المقيدة (الصندوق: ${expectedChest} ر.ي) وتتطلب الفرز والتحقق.`,
              isFixable: false,
              affectedId: assoc.id
            });
          }
        });

        // ----------------------------------------------------
        // 7. LICENSE/PACKAGE VERIFICATION
        // ----------------------------------------------------
        const activationCode = localStorage.getItem('amin_sh_activation_credential');
        if (!activationCode) {
          scannedIssues.push({
            id: `license_missing`,
            category: 'activation',
            severity: 'info',
            title: `يعمل النظام بوضعية الترخيص المفتوح الافتراضية`,
            description: `لم يتم استيراد ملف ترخيص خارجي أو تفعيل قفل تجاري مخصص. النظام مستقر تجارياً وصالح للاستخدام دون انقطاع.`,
            isFixable: false
          });
        }

        setIssues(scannedIssues);
        if (showFeedback) {
          setFixMessage(`🔍 اكتمل تدقيق النظام الشامل! تم رصد (${scannedIssues.length}) ملاحظات في وحدات البيانات الفنية.`);
        }
      } catch (err: any) {
        setIssues([]);
        setFixMessage(`❌ حدثت مشكلة أثناء الفحص الفني: ${err?.message || err}`);
      } finally {
        setIsScanning(false);
      }
    }, 850);
  };

  // Automated Re-aligning and Healing of the state databases (Safe Fixes)
  const handleAutoFix = (issue: IntegrityIssue) => {
    try {
      if (issue.category === 'invoice' && issue.extraData) {
        const invoices = JSON.parse(localStorage.getItem(invoicesKey) || '[]');
        const updatedInvoices = invoices.map((inv: any) => {
          if (inv.id === issue.affectedId) {
            const paymentsSum = Array.isArray(inv.payments) 
              ? inv.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
              : 0;
            const correctRemaining = Math.max(0, inv.totalAmount - inv.discount - paymentsSum);
            
            let correctStatus = inv.status;
            if (correctRemaining <= 0) {
              correctStatus = 'paid';
            } else if (paymentsSum > 0) {
              correctStatus = 'partial';
            } else {
              correctStatus = 'unpaid';
            }

            return {
              ...inv,
              remainingAmount: correctRemaining,
              status: correctStatus
            };
          }
          return inv;
        });

        localStorage.setItem(invoicesKey, JSON.stringify(updatedInvoices));
        addAuditLog(
          'صيانة تلقائية',
          'إدارة الفواتير',
          `إصلاح ومزامنة مبالغ بقايا الفاتورة بنجاح ودقة لمطابقة دفعاتها الفعلية الدفترية المعرّفة برقم: ${issue.affectedId}`
        );
        setFixMessage(`✅ تم إصلاح وتسوية موازنة متبقي الفاتورة (${issue.affectedId}) وإعادة تعيين وضعها المحاسبي.`);
        runSystemScanner(false);
      } 
      
      else if (issue.category === 'treasury' && issue.extraData) {
        const treasury = JSON.parse(localStorage.getItem(treasuryKey) || '{"initialBalance":0,"currentBalance":0,"activities":[]}');
        const expected = issue.extraData.expectedBalance;
        treasury.currentBalance = expected;
        localStorage.setItem(treasuryKey, JSON.stringify(treasury));

        addAuditLog(
          'صيانة تلقائية',
          'الخزنة العامة',
          `إعادة توازن ومعادلة القيمة النقدية الفعلية للخزينة وتوحيدها لمجموع الدفاتر (الرصيد المحاذي: ${expected})`
        );
        setFixMessage(`✅ تم معايرة ومعادلة رصيد الصندوق الفعلي في الخزنة كلياً إلى القيمة المتزنة بالكامل: ${expected} ر.ي.`);
        runSystemScanner(false);
      } 
      
      else if (issue.category === 'client' && issue.extraData) {
        const debts = JSON.parse(localStorage.getItem(debtsKey) || '[]');
        const updatedDebts = debts.map((d: any) => {
          if (d.id === issue.affectedId) {
            const correctRemaining = issue.extraData.computedRemaining;
            const correctPaid = issue.extraData.collectedSum;
            return {
              ...d,
              paid: correctPaid,
              remaining: correctRemaining,
              status: correctRemaining <= 0 ? 'paid' : d.status
            };
          }
          return d;
        });

        localStorage.setItem(debtsKey, JSON.stringify(updatedDebts));
        addAuditLog(
          'صيانة تلقائية',
          'شؤون العملاء',
          `تسوية ومعايرة سند الذمم والديون المنحازة للعميل صاحب السند: ${issue.affectedId}`
        );
        setFixMessage(`✅ تم مواءمة مبالغ سداد الذمم للعميل للسند المحاسبي رقم (${issue.affectedId}) بالتطابق مع التحصيلات الموثقة.`);
        runSystemScanner(false);
      } 
      
      else if (issue.category === 'employee') {
        // Safe fix for employee balances chronological reconstruction
        const empId = issue.affectedId;
        const sortedTxs = [...transactions]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let cumulative = 0;
        const rebuilt = sortedTxs.map(t => {
          if (t.employeeId === empId) {
            cumulative += (t.credit || 0) - (t.debit || 0);
            return { ...t, balance: cumulative };
          }
          return t;
        });

        setTransactions(rebuilt);
        localStorage.setItem(`amin_sh_transactions${prefix}`, JSON.stringify(rebuilt));

        addAuditLog(
          'صيانة تلقائية',
          'شؤون الموظفين',
          `إعادة تشييد الأرصدة كلياً وحل مشاكل التسلسلات التراكمية في حساب الموظف بالمعرّف الرقمي: ${empId}`
        );
        setFixMessage(`✅ تم إعادة توحيد وبناء التسلسل التراكمي لدفتر حساب الموظف برقم (${empId}).`);
        runSystemScanner(false);
      }
    } catch (err: any) {
      setFixMessage(`❌ تعذر إصلاح العطل تلقائياً: ${err?.message || err}`);
    }
  };

  // Run the massive Unified Balance Re-evaluators globally (زر إعادة احتساب الأرصدة التراكمية)
  const handleRunMassiveRecomputation = () => {
    setIsScanning(true);
    setFixMessage(null);

    setTimeout(() => {
      try {
        // --- 1. Employees Chronological Transaction Recompilation ---
        const uniqueEmpIds = Array.from(new Set(employees.map(e => e.id)));
        let updatedGlobalTxs = [...transactions];

        uniqueEmpIds.forEach(empId => {
          // Filter matching employee transactions chronologically
          const empTxs = updatedGlobalTxs
            .filter(t => t.employeeId === empId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          let currentRunning = 0;
          const mapRebuiltIds = new Map<string, number>();
          
          empTxs.forEach(tx => {
            currentRunning += (tx.credit || 0) - (tx.debit || 0);
            mapRebuiltIds.set(tx.id, currentRunning);
          });

          // Apply back
          updatedGlobalTxs = updatedGlobalTxs.map(t => {
            if (t.employeeId === empId && mapRebuiltIds.has(t.id)) {
              return { ...t, balance: mapRebuiltIds.get(t.id)! };
            }
            return t;
          });
        });

        setTransactions(updatedGlobalTxs);
        localStorage.setItem(`amin_sh_transactions${prefix}`, JSON.stringify(updatedGlobalTxs));

        // --- 2. Invoices Verification & Recalculation ---
        const invoices = JSON.parse(localStorage.getItem(invoicesKey) || '[]');
        const correctedInvoices = invoices.map((inv: any) => {
          const paymentsSum = Array.isArray(inv.payments) 
            ? inv.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
            : 0;
          const expectedRemaining = Math.max(0, inv.totalAmount - inv.discount - paymentsSum);
          
          let correctStatus = inv.status;
          if (inv.status !== 'cancelled' && inv.status !== 'draft') {
            if (expectedRemaining <= 0) correctStatus = 'paid';
            else if (paymentsSum > 0) correctStatus = 'partial';
            else correctStatus = 'unpaid';
          }

          return {
            ...inv,
            paidAmount: paymentsSum,
            remainingAmount: expectedRemaining,
            status: correctStatus
          };
        });
        localStorage.setItem(invoicesKey, JSON.stringify(correctedInvoices));

        // --- 3. Treasury Balances Matching Activities ---
        const treasury = JSON.parse(localStorage.getItem(treasuryKey) || '{"initialBalance":0,"currentBalance":0,"activities":[]}');
        let calculatedTreasury = treasury.initialBalance || 0;
        
        if (Array.isArray(treasury.activities)) {
          // Re-sort activities sequentially to prevent asynchronous jumps
          treasury.activities.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          treasury.activities.forEach((act: any) => {
            if (act.direction === 'in') {
              calculatedTreasury += (act.amount || 0);
            } else if (act.direction === 'out') {
              calculatedTreasury -= (act.amount || 0);
            }
          });
        }
        treasury.currentBalance = calculatedTreasury;
        localStorage.setItem(treasuryKey, JSON.stringify(treasury));

        // --- 4. Client Debts Aligning ---
        const debts = JSON.parse(localStorage.getItem(debtsKey) || '[]');
        const collections = JSON.parse(localStorage.getItem(collectionsKey) || '[]');
        const correctedDebts = debts.map((d: any) => {
          const collectedSum = collections
            .filter((c: any) => c.debtId === d.id)
            .reduce((sum: number, c: any) => sum + (c.amountCollected || 0), 0);
          
          const rem = Math.max(0, d.amount - collectedSum);
          return {
            ...d,
            paid: collectedSum,
            remaining: rem,
            status: rem <= 0 ? 'paid' : d.status
          };
        });
        localStorage.setItem(debtsKey, JSON.stringify(correctedDebts));

        // Update counters locally
        loadDashboardStats();
        addAuditLog(
          'معايرة ميكانيكية شاملة',
          'البنية التحتية للنظام',
          'تم استدعاء معالج إعادة الاحتساب الشامل للأرصدة المطابقة والتسلسلات الزمنية للحسابات وموازين الكشوفات لضمان عدم ازدواجية الأثر المالي.'
        );

        setFixMessage('🚀 تمت عملية إعادة الاحتساب الشاملة للأرصدة التراكمية بنجاح! تم تسوية كشوف حسابات الموظفين، الفواتير المستحقة، أرصدة الخزينة وذمم العملاء الدفترية تزامناً بدون إنترنت بنسبة 100%.');
        runSystemScanner(false);
      } catch (err: any) {
        setFixMessage(`❌ حدث خطأ غير متوقع أثناء الفحص والمعايرة الكلية: ${err?.message || err}`);
      } finally {
        setIsScanning(false);
      }
    }, 1200);
  };

  // Safe manual cleaning of temporary operations or garbage logs
  const handlePruneSystemAuditLogs = () => {
    if (!window.confirm('🚨 تحذير: هل أنت متأكد من تنظيف السجلات الإدارية القديمة للاحتفاظ بآخر 20 سجل عمل نشط فقط؟ هذا يحمي طاقة تخزين المتصفح.')) {
      return;
    }

    try {
      const logsStr = localStorage.getItem('amin_sh_system_audit_logs') || '[]';
      const logs = JSON.parse(logsStr);
      
      const pruned = logs.slice(0, 20); // Keep only recent 20
      localStorage.setItem('amin_sh_system_audit_logs', JSON.stringify(pruned));
      
      addAuditLog('صيانة دورية', 'سجل الأنشطة', 'تم تنظيف الأرشيف المتراكم من سجلات التدقيق لتسريع أداء المتصفح.');
      loadAuditLogs();
      setFixMessage('🗑️ تم تنظيف السجلات المؤقتة بنجاح والاحتفاظ بآخر ٢٠ عملية حساسة للتحقق منها.');
    } catch (e: any) {
      alert(`عذراً، فشل التنظيف: ${e?.message}`);
    }
  };

  // Filtered system logs display
  const filteredLogs = systemLogs.filter(log => {
    const term = logsSearch.toLowerCase();
    return (
      log.actionType.toLowerCase().includes(term) ||
      log.entity.toLowerCase().includes(term) ||
      (log.notes && log.notes.toLowerCase().includes(term)) ||
      log.user.toLowerCase().includes(term)
    );
  });

  const getSubTabHeadingClass = (tab: typeof activeSubTab) => {
    const isSel = activeSubTab === tab;
    return `px-5 py-3 text-xs md:text-sm font-black transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
      isSel 
        ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-450 bg-slate-100/60 dark:bg-zinc-800/40' 
        : 'border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
    }`;
  };

  return (
    <div className="space-y-6 text-slate-800 dark:text-zinc-150" id="maintenance_panel">
      
      {/* Visual Diagnostic Banner */}
      <div className="relative bg-gradient-to-r from-indigo-900 to-slate-900 dark:from-zinc-950 dark:to-indigo-950 p-6 md:p-8 rounded-2xl text-white shadow-xl overflow-hidden border border-indigo-850/40 no-print">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-cover" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1500&q=80')" }}></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-200 tracking-wider">
              <Wrench size={12} />
              منظومة الرقابة المالية والحماية الذكية
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight font-sans">
              لوحة الصيانة والتشخيص والتحقق المحاسبي
            </h2>
            <p className="text-xs text-indigo-200/80 font-medium max-w-2xl leading-relaxed">
              محرك دقيق وذكي مخصص للمدير والمحاسب المسؤول لمصادقة البيانات الحسابية المتقاطعة، رصد الثغرات الحسابية والقيود المشبوهة، وإمالة كتل الفواتير والخزانات تلقائياً لدوام الاتساق والعمل بالوضعية المنفردة بنسبة 100%.
            </p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={handleRunMassiveRecomputation}
              disabled={isScanning || isReadOnly}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              title="معالجة الاختلافات وإعادة احتساب الأرصدة بدقة"
            >
              <RefreshCw size={15} className={isScanning ? "animate-spin" : ""} />
              <span>إعادة احتساب وتزامن الأرصدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Control Links/SubTabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden no-print">
        <div className="flex border-b border-slate-150 dark:border-zinc-800">
          <button
            onClick={() => setActiveSubTab('checker')}
            className={getSubTabHeadingClass('checker')}
          >
            <ShieldAlert size={16} />
            <span>محرك فحص سلامة النظام وتماسك الخلايا</span>
          </button>
          <button
            onClick={() => setActiveSubTab('stats')}
            className={getSubTabHeadingClass('stats')}
          >
            <BarChart3 size={16} />
            <span>الإحصائيات الإنشائية وفهرس الوحدات</span>
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={getSubTabHeadingClass('logs')}
          >
            <Terminal size={16} />
            <span>سجل حركة الأمان والأنشطة التدقيقية</span>
          </button>
        </div>

        {/* Message Zone */}
        {fixMessage && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 dark:bg-zinc-800/80 dark:border-zinc-700/80 animate-fadeIn text-xs font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex-1">{fixMessage}</div>
            <button 
              onClick={() => setFixMessage(null)} 
              className="text-slate-400 hover:text-slate-600 text-base font-bold px-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        <div className="p-6">
          {/* TAB 1: INTEGRITY CHECKER */}
          {activeSubTab === 'checker' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Activity size={16} className="text-indigo-500" />
                    نتائج فحص السلامة التقنية والمالية للنسخة
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 dark:text-zinc-400 font-medium">
                    يقوم المفحوص التلقائي بتحليل كل الفواتير والسندات وأرصدة الدائن والمدين للخزائن للتنقيب عن الشذوذ أو الازدواج.
                  </p>
                </div>
                <button
                  onClick={() => runSystemScanner(true)}
                  disabled={isScanning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white text-xs font-black rounded-lg active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow"
                >
                  <Activity size={14} className={isScanning ? "animate-pulse" : ""} />
                  <span>تشغيل فحص جديد</span>
                </button>
              </div>

              {isScanning ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="animate-spin text-indigo-500" size={32} />
                  <span className="text-xs text-slate-500 dark:text-zinc-405 font-bold">جاري الفحص البرمجي لدفتر الأقساط والخزائن ومطابقة الديون...</span>
                </div>
              ) : issues.length === 0 ? (
                <div className="border border-emerald-100 rounded-xl p-8 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-400">تماسك كامل 100% - سلامة النظام حديدية!</h4>
                  <p className="text-[11px] text-emerald-600 dark:text-zinc-400 max-w-lg mx-auto mt-1 leading-relaxed">
                    لم يكتشف محرك الفحص أي تفاوت مالي في الرواتب، الديون، أو الخزنة. تتجانس الفواتير المستحقة مع التحصيلات الفورية المقيدة بالنظام بالكامل.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={15} />
                    عثر الفاحص على ({issues.length}) ملاحظة في تطابق البيانات:
                  </span>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {issues.map(iss => {
                      const isCrit = iss.severity === 'critical';
                      const isMed = iss.severity === 'medium';
                      return (
                        <div 
                          key={iss.id} 
                          className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                            isCrit 
                              ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40' 
                              : isMed 
                                ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40' 
                                : 'bg-slate-50/60 border-slate-200 dark:bg-zinc-800/40 dark:border-zinc-850'
                          }`}
                        >
                          <div className="flex gap-3">
                            <span className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isCrit 
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-450' 
                                : isMed 
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-450' 
                                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              <AlertCircle size={16} />
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-900 dark:text-white">{iss.title}</span>
                                <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-full uppercase ${
                                  isCrit 
                                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400' 
                                    : isMed 
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400' 
                                      : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400'
                                }`}>
                                  {isCrit ? 'حرِج ملحوظ' : isMed ? 'متوسط مواءمة' : 'تنبيه فني'}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                {iss.description}
                              </p>
                            </div>
                          </div>
                          
                          {iss.isFixable && !isReadOnly && (
                            <button
                              onClick={() => handleAutoFix(iss)}
                              className="px-4 py-2 shrink-0 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-extrabold rounded-lg border border-slate-200 dark:border-zinc-700 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Wrench size={12} className="text-indigo-500" />
                              <span>إصلاح وتعديل القيمة تلقائياً</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SYSTEM STATS INVENTORY */}
          {activeSubTab === 'stats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-905 dark:text-white flex items-center gap-1.5">
                  <Database size={16} className="text-indigo-500" />
                  عدد وحجم السجلات في قاعدة البيانات الدفترية للأقسام
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 dark:text-zinc-400 font-medium">
                  قائمة تحليلية موحدة لإطراء كفاية التخزين المحلي والتحقق من حجم البيانات المسجلة عبر الأقراص الدفترية.
                </p>
              </div>

              {/* Stats Visual Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">الموظفون المسجلون</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {recordCounts.employees || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">الحركات الدفترية</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {recordCounts.transactions || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">العملاء النشِطين</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {recordCounts.clients || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">فواتير ومعاملات</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {recordCounts.invoices || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">عروض الأسعار والطلبات</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {(recordCounts.quotations || 0) + (recordCounts.orders || 0)}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">سندات القبض والصرف</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {recordCounts.vouchers || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">الجمعيات والصناديق</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {recordCounts.associations || 0}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-150 dark:border-zinc-800 text-center">
                  <span className="text-xs text-slate-500 dark:text-zinc-405 block font-bold">حركات الخزينة وقبوضاتها</span>
                  <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 tracking-tight mt-1 block">
                    {recordCounts.treasuryActivities || 0}
                  </span>
                </div>
              </div>

              {/* Technical indicators / backups history */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-5 border border-slate-150 dark:border-zinc-850 rounded-xl space-y-3.5">
                  <h4 className="text-xs md:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock size={15} className="text-indigo-500" />
                    النسخ الاحتياطي ومزامنات الجلسة الحالية
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-zinc-800">
                      <span className="text-slate-500 dark:text-zinc-450 font-bold">آخر نقطة تصدير / نسخ احتياطي:</span>
                      <span className="font-extrabold text-slate-800 dark:text-zinc-100 text-right">{lastBackup}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-zinc-800">
                      <span className="text-slate-500 dark:text-zinc-450 font-bold">آخر تراجع مستورد معالج بالتعديل:</span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-400">{lastImport}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 border border-slate-150 dark:border-zinc-850 rounded-xl space-y-3.5">
                  <h4 className="text-xs md:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Activity size={15} className="text-indigo-500" />
                    مؤشرات البنية البرمجية والتشغيلية للأشخاص الميدانيين
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-zinc-800">
                      <span className="text-slate-500 dark:text-zinc-450 font-bold">إصدار النظام التشغيلي الميداني:</span>
                      <span className="font-extrabold text-slate-800 dark:text-zinc-150 font-mono">{systemVersion}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-100 dark:border-zinc-800">
                      <span className="text-slate-500 dark:text-zinc-450 font-bold">طريقة الاستجابة والحيازة المحلية:</span>
                      <span className="font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        يدعم العمل بدون إنترنت (Offline-Ready)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM AUDIT LOGS DISPLAY */}
          {activeSubTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-905 dark:text-white flex items-center gap-1.5">
                    <Terminal size={16} className="text-indigo-500" />
                    سجل المتابعة لقرارات المحاسبين والعمليات الحساسة
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 dark:text-zinc-400 font-medium font-mono">
                    شريط رقابي آمن لرصد ومتابعة تسجيلات الدخول والرواتب والفواتير والتعديل المالي المسجود.
                  </p>
                </div>
                
                {/* Pruning tool is visible to owner role only */}
                {currentUserRole === UserRole.ADMIN && !isReadOnly && (
                  <button
                    onClick={handlePruneSystemAuditLogs}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 text-xs font-black rounded-lg border border-rose-100 dark:border-rose-900/30 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 size={13} />
                    <span>ضغط وتطهير السجلات</span>
                  </button>
                )}
              </div>

              {/* Logs Search Input */}
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="ابحث تصفية السجل (باسم المحاسب، نوع العملية، الراتب، الخزنة...)"
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  className="w-full text-xs font-bold pl-3 pr-10 py-2.5 rounded-xl border border-slate-205 dark:border-zinc-800 bg-white"
                />
              </div>

              {/* Logs chronological feed layout */}
              <div className="border border-slate-150 dark:border-zinc-850 rounded-xl overflow-hidden shadow-inner max-h-[350px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50/50">
                    لا يوجد أنشطة تدقيق تطابق كلمة الاستعلام الحالية.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-zinc-850 text-xs bg-white dark:bg-zinc-900">
                    {filteredLogs.map((log) => {
                      const isFix = log.actionType.includes('تعديل') || log.actionType.includes('حذف') || log.actionType.includes('صيانة');
                      return (
                        <div key={log.id} className="p-3 hover:bg-slate-50/40 dark:hover:bg-zinc-800/30 transition-all">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  isFix 
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' 
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-455'
                                }`}>
                                  {log.actionType}
                                </span>
                                <span className="font-black text-slate-700 dark:text-zinc-200">{log.entity}</span>
                                <span className="text-[10px] text-slate-400 font-medium">بواسطة: {log.user}</span>
                              </div>
                              <p className="text-[10.5px] font-bold text-slate-650 dark:text-zinc-350 mt-1.5">
                                {log.notes}
                              </p>
                              
                              {/* Display oldValue and newValue to user if they are present for financial changes */}
                              {(log.oldValue || log.newValue) && (
                                <div className="mt-2 p-2 bg-slate-50 dark:bg-zinc-950/60 border border-slate-100 dark:border-zinc-850/60 rounded-lg flex items-center gap-4 text-[10px] font-mono leading-none">
                                  {log.oldValue && (
                                    <div className="text-slate-500">
                                      <span className="font-bold text-slate-550 dark:text-zinc-400">القيمة السابقة:</span>{' '}
                                      <span className="text-rose-600 dark:text-rose-400 font-extrabold">{log.oldValue}</span>
                                    </div>
                                  )}
                                  {log.newValue && (
                                    <div className="text-slate-500">
                                      <span className="font-bold text-slate-550 dark:text-zinc-400">القيمة الجديدة:</span>{' '}
                                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{log.newValue}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <span className="text-[10px] text-slate-400 shrink-0 font-medium font-serif mt-0.5">
                              {new Date(log.timestamp).toLocaleString('ar-YE', { hour12: true })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
