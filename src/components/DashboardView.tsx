import React from 'react';
import { motion } from 'motion/react';
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Wallet,
  Coins,
  ChevronLeft,
  CalendarDays,
  Download,
  Laptop,
  Archive,
  Award,
  Bell,
  Percent,
  Building
} from 'lucide-react';
import { Employee, Transaction, TransactionType } from '../types';

interface DashboardViewProps {
  employees: Employee[];
  transactions: Transaction[];
  setActiveTab: (tab: string) => void;
  setSelectedEmployeeIdForReport?: (id: string) => void;
}

export default function DashboardView({
  employees,
  transactions,
  setActiveTab,
  setSelectedEmployeeIdForReport
}: DashboardViewProps) {
  // PWA states and listeners inside DashboardView for deep reactivity
  const [pwaPrompt, setPwaPrompt] = React.useState<any>(() => (window as any).pwaPrompt || null);
  const [isInstalled, setIsInstalled] = React.useState<boolean>(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      (window as any).pwaInstalled === true
    );
  });
  
  const [showHelperModal, setShowHelperModal] = React.useState(false);
  const [chromeMessage, setChromeMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handlePrompt = (e: any) => {
      const promptEvent = e.detail || e;
      setPwaPrompt(promptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setPwaPrompt(null);
    };

    window.addEventListener('pwa-prompt-available', handlePrompt);
    window.addEventListener('pwa-app-installed', handleInstalled);
    window.addEventListener('beforeinstallprompt', handlePrompt);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePrompt);
      window.removeEventListener('pwa-app-installed', handleInstalled);
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, []);

  const handleInstallButtonClick = async () => {
    if (isInstalled || (window as any).pwaInstalled) {
      alert('النظام مثبت بالفعل على الشاشة الرئيسية.');
      return;
    }

    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      alert('📲 ميزة التثبيت المباشر على الشاشة الرئيسية:\n\nأنت تتصفح النظام حالياً من داخل إطار المعاينة المعزول.\n\nلتثبيت التطبيق مباشرة على جوالك وبكبسة زر واحدة:\n1. اضغط على أيقونة (فتح في نافذة جديدة / Open in new tab) أعلى يسار المتصفح.\n2. اضغط على زر "تثبيت النظام على الشاشة الرئيسية" هناك وسيعمل معك فوراً وبسرعة فائقة!');
      return;
    }

    const activePrompt = pwaPrompt || (window as any).pwaPrompt;
    const userAgent = navigator.userAgent || '';
    const isChrome = /Chrome|CriOS/i.test(userAgent) && !/Edge|Edg|OPR|Opera/i.test(userAgent);

    if (activePrompt) {
      if (isChrome) {
        setChromeMessage('اضغط على تثبيت لإضافة نظام الشيباني للحلول التقنية إلى الشاشة الرئيسية.');
        
        setTimeout(async () => {
          try {
            await activePrompt.prompt();
            const { outcome } = await activePrompt.userChoice;
            if (outcome === 'accepted') {
              (window as any).pwaInstalled = true;
              setIsInstalled(true);
              setPwaPrompt(null);
            }
          } catch (err) {
            console.error('PWA install prompt error:', err);
          } finally {
            setChromeMessage(null);
          }
        }, 1200);
      } else {
        try {
          await activePrompt.prompt();
          const { outcome } = await activePrompt.userChoice;
          if (outcome === 'accepted') {
            (window as any).pwaInstalled = true;
            setIsInstalled(true);
            setPwaPrompt(null);
          }
        } catch (err) {
          console.error('PWA install prompt error:', err);
        }
      }
    } else {
      setShowHelperModal(true);
    }
  };

  const activeEmployees = employees.filter(e => !e.isArchived);
  const archivedCount = employees.filter(e => e.isArchived).length;

  // Comprehensive Financial Calculatings
  // Total basic salary of active employees
  const totalBasicSalaries = activeEmployees.reduce((sum, emp) => sum + emp.salary, 0);

  // 1. Total Outstanding Advances (السلف القائمة: السلف وسلف الخميس والعهدة والملابس)
  const totalOutstandingAdvances = transactions.reduce((sum, tx) => {
    if (tx.type === TransactionType.ADVANCE || tx.type === TransactionType.THURSDAY_ADVANCE || tx.type === TransactionType.CUSTODY || tx.type === 'custody' || tx.type === TransactionType.EID_CLOTHES || tx.type === 'eid_clothes') {
      return sum + (tx.debit || 0);
    }
    return sum;
  }, 0);

  // 2. Total Regular Monthly Installments (إجمالي الأقساط الشهرية)
  const totalRegularInstallments = transactions.reduce((sum, tx) => {
    if (tx.type === TransactionType.INSTALLMENT || tx.type === 'installment') {
      return sum + (tx.debit || 0);
    }
    return sum;
  }, 0);

  // 3. Total Deductions and Absence (إجمالي الخصومات والغياب المعاقب عليها)
  const totalDeductions = transactions.reduce((sum, tx) => {
    if (tx.type === TransactionType.DEDUCTION || tx.type === TransactionType.ABSENCE || tx.type === 'deduction' || tx.type === 'absence') {
      return sum + (tx.debit || 0);
    }
    return sum;
  }, 0);

  // 4. Total Bonuses and Allowances (إجمالي المكافآت والبدلات المضافة كصرف دائن)
  const totalBonusesAllowances = transactions.reduce((sum, tx) => {
    if (
      tx.type === TransactionType.BONUS || 
      tx.type === TransactionType.TRANSPORT || 
      tx.type === TransactionType.HOUSING || 
      tx.type === TransactionType.CUSTODY_RETURN ||
      tx.type === 'bonus' || 
      tx.type === 'transport' || 
      tx.type === 'housing'
    ) {
      return sum + (tx.credit || 0);
    }
    return sum;
  }, 0);

  // 5. Active Associations Count (عدد الجمعيات النشطة المشتركة)
  const currentUserId = localStorage.getItem('amin_sh_user_id') || '';
  const cachedUserRole = localStorage.getItem('amin_sh_user_role') || 'ADMIN';
  const isCustomWorkspace = cachedUserRole === 'USER' && !!currentUserId && !['admin', 'accountant', 'viewer'].includes(currentUserId);
  const associationsKey = isCustomWorkspace ? `amin_sh_associations_${currentUserId}` : 'amin_sh_associations';
  
  const associationsStr = localStorage.getItem(associationsKey);
  let activeAssociationsCount = 0;
  if (associationsStr) {
    try {
      const associationsList = JSON.parse(associationsStr);
      activeAssociationsCount = associationsList.filter((a: any) => a.status === 'active' || a.status === 'نشطة').length;
    } catch (e) {
      console.error('Error parsing associations in dashboard', e);
    }
  }

  // Net salaries = (Total basic salaries of active employees) + (Total Additional Credit) - (Total Debits)
  // Let's compute individual current balance for each active employee
  const activeEmployeeBalanceSum = activeEmployees.reduce((total, emp) => {
    let empCredit = emp.salary;
    let empDebit = 0;

    transactions.forEach(tx => {
      if (tx.employeeId === emp.id) {
        empDebit += tx.debit || 0;
        empCredit += tx.credit || 0;
      }
    });
    
    return total + (empCredit - empDebit);
  }, 0);

  // Generate Internal Real-time Administrative Alerts (Offline Alerts)
  const generateDashboardAlerts = () => {
    const alertsList: { id: string; text: string; type: 'warning' | 'error' | 'info'; actionText?: string; tab?: string }[] = [];
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"

    // 1. More than 1 open/outstanding advance per active employee
    activeEmployees.forEach(emp => {
      const empTxs = transactions.filter(t => t.employeeId === emp.id);
      const advancesCount = empTxs.filter(t => t.type === 'advance' || t.type === 'thursday_advance' || t.type === TransactionType.ADVANCE || t.type === TransactionType.THURSDAY_ADVANCE).length;
      
      const totalAdvances = empTxs
        .filter(t => t.type === 'advance' || t.type === 'thursday_advance' || t.type === TransactionType.ADVANCE || t.type === TransactionType.THURSDAY_ADVANCE)
        .reduce((sum, t) => sum + (t.debit || 0), 0);
      const totalRepaidAmount = empTxs
        .filter(t => t.type === 'installment' || t.type === 'returned_advance' || t.type === TransactionType.INSTALLMENT || t.type === 'returned_advance')
        .reduce((sum, t) => sum + (t.credit || 0), 0);
      
      const netAdvances = Math.max(0, totalAdvances - totalRepaidAmount);
      
      if (advancesCount > 1 && netAdvances > 1000) {
        alertsList.push({
          id: `multi-advance-${emp.id}`,
          text: `الرقابة المالية: الموظف "${emp.name}" لديه عدد (${advancesCount}) سلفيات مسجلة مع مديونية ذمة متبقية بقيمة ${netAdvances.toLocaleString()} ر.ي`,
          type: 'warning',
          actionText: 'الملف المالي',
          tab: 'employees'
        });
      }
    });

    // 2. Active Employee has high monthly deductions (> 30% of base salary)
    activeEmployees.forEach(emp => {
      const empTxs = transactions.filter(t => t.employeeId === emp.id && t.date.startsWith(currentMonthStr));
      const totalDeductions = empTxs
        .filter(t => t.type === 'deduction' || t.type === 'absence' || t.type === TransactionType.DEDUCTION || t.type === 'absence')
        .reduce((sum, t) => sum + (t.debit || 0), 0);
      
      if (emp.salary > 0 && totalDeductions > emp.salary * 0.3) {
        alertsList.push({
          id: `high-deductions-${emp.id}`,
          text: `تنبيه رقابي: خصميات الموظف "${emp.name}" بلغت ${totalDeductions.toLocaleString()} ر.ي هذا الشهر، وهي تتجاوز حاجز (30%) من راتبه الأساسي!`,
          type: 'error',
          actionText: 'التسوية الشهرية',
          tab: 'employees'
        });
      }
    });

    // 3. Active Employee has no settlement processed for current month/year
    const curYearNum = Number(currentMonthStr.slice(0, 4));
    const curMonthNum = Number(currentMonthStr.slice(5, 7));
    const isCustomWorkspace = localStorage.getItem('amin_sh_custom_workspace') === 'true';
    const currentUserId = localStorage.getItem('amin_sh_current_user_id') || 'default';
    
    const settleKey = isCustomWorkspace ? "amin_sh_settlements_" + currentUserId : "amin_sh_settlements";
    const settleStr = localStorage.getItem(settleKey);
    let dashboardSettlements: any[] = [];
    if (settleStr) {
      try { dashboardSettlements = JSON.parse(settleStr); } catch(e) {}
    }

    activeEmployees.forEach(emp => {
      const hasSettlement = dashboardSettlements.some(s => 
        s.employeeId === emp.id && 
        s.year === curYearNum && 
        s.month === curMonthNum
      );
      if (!hasSettlement) {
        alertsList.push({
          id: `no-settlement-${emp.id}`,
          text: `الرواتب المتأخرة: الموظف "${emp.name}" لم يتم إجراء أو اعتماد تسوية ميزانية راتبه لشهر ${curMonthNum}/${curYearNum} حتى الآن.`,
          type: 'warning',
          actionText: 'إصدار تسوية',
          tab: 'employees'
        });
      }
    });

    // 4. Association schedules late for multiple months (>= 2 months)
    const schedulesKey = isCustomWorkspace ? `amin_sh_due_schedules_${currentUserId}` : 'amin_sh_due_schedules';
    const schedulesStr = localStorage.getItem(schedulesKey);
    if (schedulesStr) {
      try {
        const schedules = JSON.parse(schedulesStr);
        const todayStr = new Date().toISOString().split('T')[0];
        const memberLateCounts: { [key: string]: { name: string, count: number } } = {};
        
        schedules.forEach((s: any) => {
          if (s.status === 'late' || s.status === 'متأخر' || (s.status === 'pending' && s.dueDate < todayStr)) {
            if (!memberLateCounts[s.memberId]) {
              memberLateCounts[s.memberId] = { name: s.memberName, count: 0 };
            }
            memberLateCounts[s.memberId].count++;
          }
        });
        
        Object.keys(memberLateCounts).forEach(mId => {
          const item = memberLateCounts[mId];
          if (item.count >= 2) {
            alertsList.push({
              id: `member-late-multi-${mId}`,
              text: `تحصيل متعثر: المشترك "${item.name}" بالجمعية متأخر عن سداد الأقساط لعدد (${item.count}) أشهر متتالية بالفترة المنصرمة!`,
              type: 'error',
              actionText: 'إدارة الجمعيات',
              tab: 'associations'
            });
          }
        });
      } catch(e){}
    }

    // Load active and closed associations
    const assocKey = isCustomWorkspace ? "amin_sh_associations_" + currentUserId : "amin_sh_associations";
    const associationsStr = localStorage.getItem(assocKey);
    let dashboardAssocs: any[] = [];
    if (associationsStr) {
      try { dashboardAssocs = JSON.parse(associationsStr); } catch(e) {}
    }

    const membersKey = isCustomWorkspace ? "amin_sh_association_members_" + currentUserId : "amin_sh_association_members";
    const membersStr = localStorage.getItem(membersKey);
    let dashboardMembers: any[] = [];
    if (membersStr) {
      try { dashboardMembers = JSON.parse(membersStr); } catch(e) {}
    }

    const gTxKey = isCustomWorkspace ? "amin_sh_group_transactions_" + currentUserId : "amin_sh_group_transactions";
    const gTxStr = localStorage.getItem(gTxKey);
    let dashboardGTxs: any[] = [];
    if (gTxStr) {
      try { dashboardGTxs = JSON.parse(gTxStr); } catch(e) {}
    }

    // 5. Association has high arrears/outstanding balance > 2 total monthly cycles contributions
    dashboardAssocs.forEach(assoc => {
      if (assoc.status === 'active') {
        const assocMembers = dashboardMembers.filter(m => m.associationId === assoc.id);
        const assocTxs = dashboardGTxs.filter(t => t.associationId === assoc.id);
        
        let assocOutstanding = 0;
        assocMembers.forEach(mem => {
          const memPayments = assocTxs.filter(t => t.memberId === mem.id && (t.type === 'payment' || t.type === 'late_payment'));
          const memPaid = memPayments.reduce((sum, p) => sum + p.credit, 0);
          const memRequired = assoc.installmentAmount * assoc.cyclesCount;
          assocOutstanding += Math.max(0, memRequired - memPaid);
        });

        const doubleCycleAmount = assoc.installmentAmount * assocMembers.length * 2;
        if (assocOutstanding > doubleCycleAmount && doubleCycleAmount > 0) {
          alertsList.push({
            id: `assoc-high-arrears-${assoc.id}`,
            text: `تنبيه رقابي: الجمعية "${assoc.name}" تجاوز إجمالي متأخرات التحصيل لديها ${assocOutstanding.toLocaleString()} ر.ي وهو يتخطى قسط دورتين!`,
            type: 'error',
            actionText: 'إدارة الجمعيات',
            tab: 'associations'
          });
        }
      }
    });

    // 6. Association underfunded (balance can't cover next payout)
    dashboardAssocs.forEach(assoc => {
      if (assoc.status === 'active') {
        const assocMembers = dashboardMembers.filter(m => m.associationId === assoc.id);
        const assocTxs = dashboardGTxs.filter(t => t.associationId === assoc.id);
        
        const totalCreditsAssoc = assocTxs.reduce((sum, t) => sum + (t.credit || 0), 0);
        const totalDebitsAssoc = assocTxs.reduce((sum, t) => sum + (t.debit || 0), 0);
        const chestBalance = totalCreditsAssoc - totalDebitsAssoc;
        
        const pendingPayoutMembers = assocMembers.filter(m => m.receiveStatus === 'not_received');
        if (pendingPayoutMembers.length > 0) {
          const payoutRequired = assoc.installmentAmount * assocMembers.length;
          if (chestBalance < payoutRequired) {
            alertsList.push({
              id: `assoc-underfunded-${assoc.id}`,
              text: `عجز السيولة: رصيد صندوق الجمعية "${assoc.name}" (${chestBalance.toLocaleString()} ر.ي) غير كافٍ للصرف بالدورة القادمة (${payoutRequired.toLocaleString()} ر.ي)`,
              type: 'warning',
              actionText: 'كشف الصندوق',
              tab: 'associations'
            });
          }
        }
      }
    });

    // 7. Closed associations with non-zero (unliquidated) balance
    dashboardAssocs.forEach(assoc => {
      if (assoc.status === 'completed' || assoc.status === 'closed') {
        const assocTxs = dashboardGTxs.filter(t => t.associationId === assoc.id);
        const totalCreditsAssoc = assocTxs.reduce((sum, t) => sum + (t.credit || 0), 0);
        const totalDebitsAssoc = assocTxs.reduce((sum, t) => sum + (t.debit || 0), 0);
        const chestBalance = totalCreditsAssoc - totalDebitsAssoc;
        
        if (Math.abs(chestBalance) > 100) {
          alertsList.push({
            id: `assoc-unliquidated-${assoc.id}`,
            text: `تصفية مالية: الصندوق المكتمل/المغلق "${assoc.name}" لديه رصيد غير مصفى ومتبقي قدره ${chestBalance.toLocaleString()} ر.ي !`,
            type: 'error',
            actionText: 'التسوية النهائية',
            tab: 'associations'
          });
        }
      }
    });

    // 8. Long time since last backup (> 7 days)
    const settingsKeyLocal = isCustomWorkspace ? "amin_sh_settings_" + currentUserId : "amin_sh_settings";
    const settingsStr = localStorage.getItem(settingsKeyLocal);
    let lastBackupStr = '';
    if (settingsStr) {
      try {
        const settingsObj = JSON.parse(settingsStr);
        lastBackupStr = settingsObj.lastBackupDate || '';
      } catch (e) {}
    }

    let needsBackupAlert = false;
    let backupDaysDiff = 0;
    if (!lastBackupStr) {
      needsBackupAlert = true;
    } else {
      const lastBackupDate = new Date(lastBackupStr);
      const diffTime = Math.abs(new Date().getTime() - lastBackupDate.getTime());
      backupDaysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (backupDaysDiff > 7) {
        needsBackupAlert = true;
      }
    }

    if (needsBackupAlert) {
      alertsList.push({
        id: `backup-safety-alert`,
        text: lastBackupStr 
          ? `أمن البيانات: لم يتم ترحيل أو نسخ احتياطي لقاعدة البيانات منذ (${backupDaysDiff}) أيام. تذكر المزامنة الفورية لمكاملة وحفظ السجلات.`
          : `أمن البيانات: لا يوجد أي لقطة نسخ احتياطي مسجلة أوفلاين لقاعدة قيود وسلفيات النظام الحالية. يرجى أخذ نسخة الآن.`,
        type: 'info',
        actionText: 'إنشاء لقطة دعم',
        tab: 'settings'
      });
    }

    return alertsList;
  };

  const dashboardAlerts = generateDashboardAlerts();
  const importantAlertsCount = dashboardAlerts.length;

  // Let's list recent cash withdrawals / operations
  const recentTransactions = [...transactions]
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getTransactionBadgeStyle = (type: string) => {
    switch(type) {
      case TransactionType.SALARY: return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-100 dark:border-blue-900/30';
      case TransactionType.ADVANCE: return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-100 dark:border-amber-900/30';
      case TransactionType.THURSDAY_ADVANCE: return 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-100 dark:border-orange-900/30';
      case TransactionType.DEDUCTION: return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-100 dark:border-red-900/30';
      case TransactionType.BONUS: return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30';
      default: return 'bg-slate-50 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-100 dark:border-zinc-700';
    }
  };

  const getArabicTypeName = (type: string) => {
    switch(type) {
      case TransactionType.SALARY: return 'راتب ربع شهري/أساسي';
      case TransactionType.INSTALLMENT: return 'قسط شهري مالي';
      case TransactionType.ADVANCE: return 'سلفة معتمدة';
      case TransactionType.DEDUCTION: return 'خصم إداري';
      case TransactionType.ABSENCE: return 'خصم غياب يومي';
      case TransactionType.BONUS: return 'مكافأة تمكين';
      case TransactionType.TRANSPORT: return 'بدل مواصلات';
      case TransactionType.HOUSING: return 'بدل سكن';
      case TransactionType.CUSTODY: return 'صرف عهدة';
      case TransactionType.CUSTODY_RETURN: return 'استرداد عهدة فائض';
      case TransactionType.THURSDAY_ADVANCE: return 'سلفة الخميس';
      case TransactionType.EID_CLOTHES: return 'ملابس العيد وثياب';
      case TransactionType.FROZEN_DEBT: return 'تجميد مديونية';
      default: return type || 'عملية مخصصة';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">لوحة المراقبة والإحصاءات المالية الذكية</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">تحديث آني وفوري لصافي الرواتب واستحقاقات السحب للموظفين النشطين.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-lg px-3 py-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
          <CalendarDays size={14} />
          <span>التاريخ اليوم: {new Date().toLocaleDateString('ar-YE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* PWA Prominent Installation Block */}
      <div className="bg-gradient-to-l from-slate-900 to-indigo-950 dark:from-zinc-900 dark:to-zinc-950 p-5 md:p-6 rounded-2xl border border-indigo-500/20 shadow-lg relative overflow-hidden text-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/15 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
          {/* Circular app icon of the system */}
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-emerald-500/20 scale-100 hover:scale-105 transition-all duration-300">
            ش
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-base font-black text-white">تثبيت نظام الشيباني للحلول التقنية</h3>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-bold">تطبيق هجين مستقل (PWA)</span>
            </div>
            <p className="text-xs text-slate-300 dark:text-zinc-400 leading-relaxed max-w-xl">
              تصفح ملفات الموظفين، سجل السحوبات، واصنع التقارير والقيود من الشاشة الرئيسية مباشرة كأنه تطبيق جوال رسمي وبسرعة استثنائية دون اتصال بالإنترنت.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="relative z-10 shrink-0 w-full md:w-auto">
          {isInstalled ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 text-xs font-black justify-center w-full">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>النظام مثبت بالفعل على الشاشة الرئيسية.</span>
            </div>
          ) : (
            <button
              onClick={handleInstallButtonClick}
              className="w-full md:w-auto whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black py-3 px-5 rounded-xl shadow-lg shadow-indigo-600/25 border-0 hover:shadow-indigo-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download size={14} />
              <span>تثبيت النظام على الشاشة الرئيسية</span>
            </button>
          )}
        </div>
      </div>

      {/* GORGEOUS INSTRUCTIONAL MODAL (نافذة إرشادية لتثبيت التطبيق يدوياً) */}
      {showHelperModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setShowHelperModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 md:p-8 text-slate-900 dark:text-zinc-100" dir="rtl">
            
            <div className="text-center space-y-2 mb-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <Laptop size={24} />
              </div>
              <h2 className="text-md font-black">خطوات تثبيت النظام يدوياً</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-bold max-w-xs mx-auto leading-relaxed">
                متصفحك الحالي لا يدعم التثبيت المباشر التلقائي من صفحة الويب، يمكنك إضافته وتثبيته كبرنامج مستقل بسهولة وبثوانٍ معدودة عبر التعليمات التالية:
              </p>
            </div>

            {/* List of Steps */}
            <div className="space-y-4 bg-slate-50 dark:bg-zinc-850 p-4 rounded-2xl border border-slate-150 dark:border-zinc-800">
              <div className="flex gap-3 leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-mono text-xs font-black">1</span>
                <div>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white">افتح قائمة Chrome (⋮) أو متصفحك الحالي</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">اضغط على زر الخيارات الثلاث نقاط الرأسية في أعلى يسار المتصفح (أو زر المشاركة 📤 في متصفح سفاري للآيفون).</p>
                </div>
              </div>

              <div className="flex gap-3 leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-mono text-xs font-black">2</span>
                <div>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white">اختر "إضافة إلى الشاشة الرئيسية" أو "Install App"</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">ابحث عن خيار التثبيت الرسمي في القائمة المنسدلة.</p>
                </div>
              </div>

              <div className="flex gap-3 leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-mono text-xs font-black">3</span>
                <div>
                  <h4 className="text-xs font-black text-slate-850 dark:text-white">اضغط "تثبيت" لتأكيد الإضافة</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">اضغط على تثبيت لإضافة نظام الشيباني للحلول التقنية إلى الشاشة الرئيسية.</p>
                </div>
              </div>
            </div>

            {/* Close button */}
            <div className="mt-6">
              <button
                onClick={() => setShowHelperModal(false)}
                className="w-full bg-slate-900 text-white hover:bg-slate-850 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-xs font-black py-3 rounded-xl transition-all cursor-pointer border-0"
              >
                فهمت الأمر، حسناً
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CHROME CONFIRMATION MESSAGE OVERLAY */}
      {chromeMessage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs" />
          <div className="relative bg-slate-900 border border-slate-800 text-white rounded-2xl py-4 px-6 shadow-2xl flex items-center gap-3 animate-bounce shadow-emerald-500/5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
            <span className="text-xs font-black leading-relaxed">{chromeMessage}</span>
          </div>
        </div>
      )}

      {/* Grid of Statistical Cards (Phase 1 Bento Grid - 10 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Count of Active Employees */}
        <div 
          onClick={() => setActiveTab('employees')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-indigo-500"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">الموظفون النشطون</span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <Users size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">{activeEmployees.length}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold">موظف</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>الذين هم حالياً قيد الخدمة والعمل.</span>
          </div>
        </div>

        {/* Card 2: Count of Archived Employees */}
        <div 
          onClick={() => setActiveTab('employees')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-indigo-500"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">الموظفون المؤرشفون</span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-500 hover:text-white transition-all">
              <Archive size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">{archivedCount}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold">ملف</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>حقوق وملفات مجمدة في الأرشيف الإداري.</span>
          </div>
        </div>

        {/* Card 3: Total Basic Salaries */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">إجمالي الرواتب الأساسية</span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalBasicSalaries.toLocaleString()}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold">ر.ي</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>الالتزام المالي الثابت للرواتب دون الإضافي.</span>
          </div>
        </div>

        {/* Card 4: Total Outstanding Advances */}
        <div 
          onClick={() => setActiveTab('transactions')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-amber-500"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">إجمالي السلف القائمة</span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
              <TrendingDown size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalOutstandingAdvances.toLocaleString()}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold">ر.ي</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>يشمل السلف العامة وسلف يوم الخميس والعهد المالية.</span>
          </div>
        </div>

        {/* Card 5: Total Deductions */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">إجمالي الخصومات والغياب</span>
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-650 dark:text-red-400">
              <AlertCircle size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalDeductions.toLocaleString()}</span>
            <span className="text-slate-500 dark:text-zinc-400 text-[9px] font-bold">ر.ي</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>الجزاءات والاستقطاعات ومحاضر الغياب المنفذة.</span>
          </div>
        </div>

        {/* Card 6: Total regular Installments */}
        <div 
          onClick={() => setActiveTab('transactions')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-orange-500"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">إجمالي الأقساط الشهرية</span>
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
              <Percent size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalRegularInstallments.toLocaleString()}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold">ر.ي</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>الخصميات المنتظمة المجدولة شهرياً لقضاء السلف.</span>
          </div>
        </div>

        {/* Card 7: Total Bonuses & Allowances */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">إجمالي المكافآت والبدلات</span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Award size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalBonusesAllowances.toLocaleString()}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[9px] font-bold">ر.ي</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>مكافآت الإنتاج والبدلات المضافة كاستحقاق دائن.</span>
          </div>
        </div>

        {/* Card 8: Active Associations Count */}
        <div 
          onClick={() => setActiveTab('associations')}
          className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-purple-500"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">الجمعيات النشطة</span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
              <Building size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">{activeAssociationsCount}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold">جمعية</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>صناديق الجمعيات النشطة والمفتوحة للتصفية.</span>
          </div>
        </div>

        {/* Card 9: Important Alerts Count */}
        <div 
          onClick={() => {
            const el = document.getElementById('admin-alerts-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-red-500"
        >
          <div className="flex justify-between items-start">
            <span className="text-slate-400 dark:text-zinc-500 text-[11px] font-bold">تنبيهات إدارية هامة</span>
            <div className={`p-2 rounded-lg transition-all ${dashboardAlerts.length > 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <Bell size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900 dark:text-white">{dashboardAlerts.length}</span>
            <span className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold">إشعار</span>
          </div>
          <div className="mt-1.5 text-[9px] text-slate-400">
            <span>فحص الأقساط والرواتب والنسخ الأوفلاين مالي.</span>
          </div>
        </div>

        {/* Card 10: Net Salary Due Area */}
        <div className="bg-gradient-to-br from-indigo-650 to-indigo-850 text-white p-4 rounded-xl border border-indigo-705 shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-indigo-200 text-[11px] font-bold">صافي الرواتب المستحقة</span>
            <div className="p-2 rounded-lg bg-indigo-505/30 text-white">
              <Wallet size={15} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-xl font-black text-white">{activeEmployeeBalanceSum.toLocaleString()}</span>
            <span className="text-indigo-200 text-[9px] font-bold">ر.ي</span>
          </div>
          <div className="mt-1.5 text-[9px] text-indigo-200 flex items-center gap-1">
            <Coins size={10} />
            <span>السيولة المستحقة للصرف للموظفين للتصفية الجارية.</span>
          </div>
        </div>
      </div>

      {/* Dynamic Offline Alerts and Warnings Notification Console (Phase 1 Requirement 5) */}
      <div id="admin-alerts-section" className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 p-5 rounded-2xl no-print space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            <h3 className="text-sm font-black text-slate-905 dark:text-white flex items-center gap-1.5">
              <span>نظام التنبيهات الإدارية والمالية (مستوى أوفلاين ذكي)</span>
              <span className="bg-indigo-50 text-indigo-750 dark:bg-indigo-950/50 dark:text-indigo-305 text-[9px] font-extrabold px-2 py-0.5 rounded-lg font-mono">INTELLIGENCE CONSOLE</span>
            </h3>
          </div>
          <span className="text-[10px] text-slate-450 font-bold">تدقيق مستمر للبيانات المحفوظة محلياً</span>
        </div>

        {dashboardAlerts.length === 0 ? (
          <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/30 rounded-xl text-center">
            <p className="text-emerald-855 dark:text-emerald-400 font-bold text-xs">✨ ممتاز! لا توجد أي متأخرات مالية أو تنبيهات إدارية غائبة في السجلات حتى الآن.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1 select-none scrollbar-thin">
            {dashboardAlerts.slice(0, 10).map((alert) => (
              <div 
                key={alert.id}
                className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all hover:scale-[1.002] duration-200 ${
                  alert.type === 'error' 
                    ? 'bg-rose-50/40 border-rose-100 text-rose-950 dark:bg-rose-950/10 dark:border-rose-900/20'
                    : alert.type === 'warning'
                      ? 'bg-amber-50/40 border-amber-100 text-amber-950 dark:bg-amber-950/10 dark:border-amber-900/20'
                      : 'bg-indigo-50/40 border-indigo-100 text-indigo-950 dark:bg-indigo-950/10 dark:border-indigo-900/20'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  alert.type === 'error' ? 'text-red-650' : alert.type === 'warning' ? 'text-amber-600' : 'text-indigo-650'
                }`}>
                  <AlertCircle size={14} />
                </div>
                
                <div className="space-y-1.5 flex-1">
                  <p className="text-2xs font-extrabold leading-relaxed text-slate-800 dark:text-zinc-200">{alert.text}</p>
                  
                  {alert.actionText && alert.tab && (
                    <button
                      onClick={() => setActiveTab(alert.tab!)}
                      className={`text-[10px] font-black inline-flex items-center gap-1 hover:underline transition-all cursor-pointer ${
                        alert.type === 'error' ? 'text-red-600' : alert.type === 'warning' ? 'text-amber-605' : 'text-indigo-600'
                      }`}
                    >
                      <span>🔄 {alert.actionText}</span>
                      <ChevronLeft size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Analytical Allocation Chart & Recent Transactions list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Visual Graph of Salaries Allocation */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>توزيع السيولة والرواتب المستحقة للموظفين النشطين</span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            رسم بياني يوضح الرصيد المتبقي الإيجابي (الراتب المتبقي) بعد احتساب السلف والأقساط.
          </p>

          <div className="mt-6 space-y-4">
            {activeEmployees.slice(0, 5).map((emp) => {
              // Calculate specific employee totals inside
              let empCredit = emp.salary;
              let empDebit = 0;
              transactions.forEach(t => {
                if (t.employeeId === emp.id) {
                  empDebit += t.debit || 0;
                  empCredit += t.credit || 0;
                }
              });
              const balance = empCredit - empDebit;
              const ratio = Math.max(0, Math.min(100, Math.round((balance / (emp.salary || 1)) * 100)));
              
              return (
                <div key={emp.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-zinc-300">{emp.name} ({emp.jobTitle})</span>
                    <span className="text-slate-500 dark:text-zinc-400 font-mono">
                      {balance.toLocaleString()} ر.ي من {emp.salary.toLocaleString()} ({ratio}%)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        ratio > 70 
                          ? 'bg-emerald-500' 
                          : ratio > 40 
                            ? 'bg-indigo-500' 
                            : ratio > 15 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                      }`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {activeEmployees.length > 5 && (
              <button 
                onClick={() => setActiveTab('employees')}
                className="w-full text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 mt-2 font-semibold"
              >
                <span>شاهد تفاصيل جميع الموظفين ({activeEmployees.length - 5} موظفين آخرين)</span>
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">آخر الحركات المالية المقيدة</h3>
            <button 
              onClick={() => setActiveTab('transactions')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              عرض الكل
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">آخر 5 قيود محاسبية مسجلة في الدفاتر.</p>

          <div className="mt-4 flex-1 space-y-3.5">
            {recentTransactions.map((tx) => {
              const emp = employees.find(e => e.id === tx.employeeId);
              return (
                <div key={tx.id} className="p-3 bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-zinc-200 line-clamp-1">{tx.statement}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500">
                      <span>{emp ? emp.name : 'موظف مجهول'}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap flex flex-col items-end gap-1">
                    {tx.debit > 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-bold font-mono">-{tx.debit.toLocaleString()} ر.ي</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">+{tx.credit.toLocaleString()} ر.ي</span>
                    )}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getTransactionBadgeStyle(tx.type)}`}>
                      {getArabicTypeName(tx.type)}
                    </span>
                  </div>
                </div>
              );
            })}

            {recentTransactions.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 py-12 gap-2 text-center">
                <AlertCircle size={32} className="text-slate-300" />
                <p>لا توجد أي قيود أو حركات مالية مسجلة حتى الآن.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced System Features Highlights */}
      <div className="bg-indigo-950 text-slate-100 p-5 rounded-2xl border border-indigo-900 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-800/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <span className="bg-indigo-600 text-white text-[9px] tracking-wider font-extrabold px-2 py-0.5 rounded-full uppercase">المحاسبة الذكية والتدقيق</span>
            <h4 className="text-base font-bold text-white">هل ترغب بفحص الحسابات ورصد الأخطاء فوراً؟</h4>
            <p className="text-xs text-indigo-300 leading-relaxed">
              قم بزيارة قسم المساعد الذكي "أمين الخبير" المستند إلى نموذج الذكاء الاصطناعي لرصد السحوبات المرتفعة، تنبيه غياب الموظفين وإصدار توصيات شهرية فحصية فورية.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('ai-assistant')}
            className="whitespace-nowrap bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer transition-all self-start md:self-auto"
          >
            تفعيل الفحص الذكي ✨
          </button>
        </div>
      </div>

      {/* WhatsApp API Settings Quick Link */}
      <div id="whatsapp-settings-card" className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Laptop size={20} />
          </div>
          <div className="space-y-1 text-right">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">إعدادات بوابة WhatsApp API التقنية</h4>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              إدارة مفتاح التوثيق (API Token)، معرف النسخة (Instance ID) وفحص استقرار واجهة اتصال الإشعارات.
            </p>
          </div>
        </div>
        <button 
          id="btn-goto-whatsapp-settings"
          onClick={() => setActiveTab('whatsapp-settings')}
          className="whitespace-nowrap inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-95 text-slate-800 dark:text-zinc-200 text-xs font-semibold py-2.5 px-4 rounded-xl cursor-pointer transition-all"
        >
          <span>تعديل إعدادات الاتصال</span>
          <ChevronLeft size={16} />
        </button>
      </div>
    </div>
  );
}
