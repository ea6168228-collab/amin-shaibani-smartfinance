import { Association, AssociationPayment, AssociationMember, AssociationTransaction, Employee, Transaction } from '../types';

/**
 * Calculates all scheduled installment dates for a given start date, number of cycles, and interval type.
 */
export function getScheduleDates(startDateStr: string, count: number, type: 'daily' | 'weekly' | 'monthly'): string[] {
  const dates: string[] = [];
  if (!startDateStr || count <= 0) return dates;

  for (let i = 0; i < count; i++) {
    const d = new Date(startDateStr);
    if (type === 'daily') {
      d.setDate(d.getDate() + i);
    } else if (type === 'weekly') {
      d.setDate(d.getDate() + (i * 7));
    } else if (type === 'monthly') {
      d.setMonth(d.getMonth() + i);
    }
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Normalizes Date string to human-friendly YYYY-MM-DD
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

/**
 * Calculates late penalty fee based on settings and days over
 */
export function calculatePenalty(amount: number, days: number, enabled: boolean, type: 'fixed' | 'percentage', value: number): number {
  if (!enabled || days <= 0 || value <= 0) return 0;
  if (type === 'fixed') {
    return value; // Fixed fee
  } else {
    // Percentage per installment
    return Math.round(amount * (value / 100));
  }
}

/**
 * Core Subscriber metrics calculator
 */
export interface SubscriberStats {
  totalPaid: number;
  totalRequired: number;
  totalRemaining: number;
  totalLate: number;
  paidCount: number;
  requiredCount: number;
  lateCount: number;
  remainingCount: number;
  progressPercent: number;
  nextDueDate: string | null;
  daysDelayed: number;
  isPayoutReceived: boolean;
  upcomingAlarms: string[];
}

export function computeSubscriberStats(
  assoc: Association,
  payments: AssociationPayment[]
): SubscriberStats {
  const matchingPayments = payments.filter(p => p.associationId === assoc.id);
  const totalRequired = assoc.installmentAmount * assoc.cyclesCount;
  const totalPaid = matchingPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalRemaining = Math.max(0, totalRequired - totalPaid);
  
  // Schedule
  const scheduleDates = getScheduleDates(assoc.startDate, assoc.cyclesCount, assoc.type);
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  let paidCount = 0;
  let lateCount = 0;
  let totalLate = 0;
  let remainingCount = 0;
  let nextDueDate: string | null = null;
  let daysDelayed = 0;
  const upcomingAlarms: string[] = [];

  scheduleDates.forEach((dueDateStr, idx) => {
    // Check if there is a payment matching this cycle index
    // For subscriber mode, payments are sequential or mapped
    const hasPaid = idx < matchingPayments.filter(p => p.status === 'paid').length;

    if (hasPaid) {
      paidCount++;
    } else {
      const dueDate = new Date(dueDateStr);
      if (dueDate < today) {
        lateCount++;
        const gap = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        if (gap > daysDelayed) {
          daysDelayed = gap;
        }
        totalLate += assoc.installmentAmount + calculatePenalty(
          assoc.installmentAmount,
          gap,
          assoc.penaltyEnabled,
          assoc.penaltyType,
          assoc.penaltyValue
        );
      } else {
        remainingCount++;
        if (!nextDueDate) {
          nextDueDate = dueDateStr;
        }
      }
    }
  });

  const progressPercent = totalRequired > 0 ? Math.round((totalPaid / totalRequired) * 100) : 0;
  const isPayoutReceived = assoc.payoutStatus === 'received';

  // Warnings
  if (nextDueDate === todayStr) {
    upcomingAlarms.push("لديك قسط مستحق السداد اليوم!");
  }
  if (nextDueDate && new Date(nextDueDate).getTime() - today.getTime() < 3 * 24 * 60 * 60 * 1000 && nextDueDate !== todayStr) {
    upcomingAlarms.push(`اقترب موعد القسط القادم بتاريخ (${nextDueDate})`);
  }
  if (lateCount > 0) {
    upcomingAlarms.push(`تنبيه: لديك عدد (${lateCount}) أقساط متأخرة عن السداد!`);
  }
  if (!isPayoutReceived && assoc.receiveDate && new Date(assoc.receiveDate).getTime() - today.getTime() < 5 * 24 * 60 * 60 * 1000) {
    upcomingAlarms.push(`اقترب موعد استلامك للجمعية بتاريخ (${assoc.receiveDate})`);
  }

  return {
    totalPaid,
    totalRequired,
    totalRemaining,
    totalLate,
    paidCount,
    requiredCount: assoc.cyclesCount,
    lateCount,
    remainingCount,
    progressPercent,
    nextDueDate,
    daysDelayed,
    isPayoutReceived,
    upcomingAlarms
  };
}

/**
 * Core Manager metrics calculator
 */
export interface ManagerStats {
  activeMembersCount: number;
  totalCollected: number;
  totalOutstanding: number;
  membersWithLateCount: number;
  receivedPayoutCount: number;
  notReceivedPayoutCount: number;
  chestBalance: number;
  totalLateFeesCollected: number;
  totalExpenses: number;
  upcomingAlarms: string[];
}

export function computeManagerStats(
  assoc: Association,
  members: AssociationMember[],
  txs: AssociationTransaction[]
): ManagerStats {
  const assocTxs = txs.filter(t => t.associationId === assoc.id);
  const assocMembers = members.filter(m => m.associationId === assoc.id);

  const activeMembersCount = assocMembers.length;
  
  // Total Collected (Installments paid by members)
  const totalCollected = assocTxs
    .filter(t => t.type === 'payment' || t.type === 'late_payment')
    .reduce((sum, t) => sum + t.credit, 0);

  // Total late fees collected
  const totalLateFeesCollected = assocTxs
    .filter(t => t.type === 'late_fee')
    .reduce((sum, t) => sum + t.credit, 0);

  // Total expenses
  const totalExpenses = assocTxs
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.debit, 0);

  // Total Payouts done
  const totalPayouts = assocTxs
    .filter(t => t.type === 'received_association')
    .reduce((sum, t) => sum + t.debit, 0);

  // General chest balance = credit - debit
  const totalCredits = assocTxs.reduce((sum, t) => sum + t.credit, 0);
  const totalDebits = assocTxs.reduce((sum, t) => sum + t.debit, 0);
  const chestBalance = totalCredits - totalDebits;

  // Outstanding amounts mapping per member
  const scheduleDates = getScheduleDates(assoc.startDate, assoc.cyclesCount, assoc.type);
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  let membersWithLateCount = 0;
  let receivedPayoutCount = 0;
  let notReceivedPayoutCount = 0;
  let totalOutstanding = 0;

  assocMembers.forEach(mem => {
    if (mem.receiveStatus === 'received') {
      receivedPayoutCount++;
    } else {
      notReceivedPayoutCount++;
    }

    // Member payments
    const memPayments = assocTxs.filter(t => t.memberId === mem.id && (t.type === 'payment' || t.type === 'late_payment'));
    const memPaid = memPayments.reduce((sum, p) => sum + p.credit, 0);
    const memRequired = mem.installmentAmount * assoc.cyclesCount;
    const memOutstanding = Math.max(0, memRequired - memPaid);
    totalOutstanding += memOutstanding;

    // Check if this member is late
    let isLate = false;
    scheduleDates.forEach((dueDateStr, idx) => {
      const hasPaid = idx < memPayments.length;
      if (!hasPaid) {
        const dueDate = new Date(dueDateStr);
        if (dueDate < today) {
          isLate = true;
        }
      }
    });

    if (isLate) {
      membersWithLateCount++;
    }
  });

  // Warnings
  const upcomingAlarms: string[] = [];
  if (membersWithLateCount > 0) {
    upcomingAlarms.push(`يوجد عدد (${membersWithLateCount}) مشتركين متأخرين عن السدادات المستحقة!`);
  }
  
  // Check if chest balance is enough for incomingPayout cycle
  const currentOrNextPayoutMember = assocMembers
    .filter(m => m.receiveStatus === 'not_received')
    .sort((a,b) => a.receiveTurn - b.receiveTurn)[0];

  if (currentOrNextPayoutMember) {
    const payoutRequired = assoc.installmentAmount * assocMembers.length;
    if (chestBalance < payoutRequired) {
      upcomingAlarms.push(`صندوق الجمعية غير كافٍ للتسليم القادم للعضو (${currentOrNextPayoutMember.name}) - المطلوب: ${payoutRequired}, المتوفر: ${chestBalance}`);
    }
    
    if (currentOrNextPayoutMember.receiveDate) {
      const pDate = new Date(currentOrNextPayoutMember.receiveDate);
      if (pDate.getTime() - today.getTime() < 3 * 24 * 60 * 60 * 1000) {
        upcomingAlarms.push(`اقترب دور تسليم المشترك (${currentOrNextPayoutMember.name}) بتاريخ (${currentOrNextPayoutMember.receiveDate})`);
      }
    }
  }

  const allCyclesPaid = assocMembers.every(m => {
    const paidTxs = assocTxs.filter(t => t.memberId === m.id && (t.type === 'payment' || t.type === 'late_payment'));
    return paidTxs.length >= assoc.cyclesCount;
  });

  const allPayoutsCompleted = assocMembers.every(m => m.receiveStatus === 'received');

  if (allCyclesPaid && allPayoutsCompleted && assoc.status !== 'completed') {
    upcomingAlarms.push("جميع دفعات وقبوضات الجمعية مكتملة 100%، يمكنك إغلاق الجمعية الآن.");
  }

  return {
    activeMembersCount,
    totalCollected,
    totalOutstanding,
    membersWithLateCount,
    receivedPayoutCount,
    notReceivedPayoutCount,
    chestBalance,
    totalLateFeesCollected,
    totalExpenses,
    upcomingAlarms
  };
}
