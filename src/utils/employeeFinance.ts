import { Employee, Transaction, TransactionType } from '../types';

export interface EmployeeFinancialSummary {
  openingBalance: number;
  totalSalaries: number;
  totalAdvances: number;
  totalDeductions: number;
  totalInstallments: number;
  totalBonuses: number;
  totalCustody: number;
  totalCustodyReturn: number;
  netDue: number;
  status: 'due_to_them' | 'obligated' | 'balanced'; // مستحق له / عليه التزامات / متوازن
  statusArabic: string;
  lastTransactions: Transaction[];
}

export interface MonthlySettlement {
  id: string;
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  baseSalary: number;
  totalAdvances: number;
  totalDeductions: number;
  totalInstallments: number;
  totalBonuses: number;
  totalAllowances: number; // البدلات (مثل السكن، المواصلات وغيره)
  finalNet: number;
  status: 'draft' | 'approved';
  approvedBy?: string;
  approvedDate?: string;
}

/**
 * Computes on-the-fly financial status and metrics for an employee
 */
export function computeEmployeeFinancialSummary(
  employeeId: string,
  transactions: Transaction[]
): EmployeeFinancialSummary {
  const empTxs = transactions.filter(t => t.employeeId === employeeId);

  // Summarize debit items (money drawn / deductions)
  let totalAdvances = 0;
  let totalDeductions = 0;
  let totalInstallments = 0;
  let totalCustody = 0;

  // Summarize credit items (money earned / returned)
  let totalSalaries = 0;
  let totalBonuses = 0;
  let totalCustodyReturn = 0;
  let totalAllowances = 0;

  empTxs.forEach(tx => {
    const type = tx.type.toLowerCase();
    
    // Advances
    if (type === TransactionType.ADVANCE || type === TransactionType.THURSDAY_ADVANCE || type === 'thursday_advance') {
      totalAdvances += tx.debit;
    } 
    // Installments
    else if (type === TransactionType.INSTALLMENT) {
      totalInstallments += tx.debit;
    } 
    // Deductions & Absence
    else if (type === TransactionType.DEDUCTION || type === TransactionType.ABSENCE || type === 'deduction' || type === 'absence') {
      totalDeductions += tx.debit;
    } 
    // Custody
    else if (type === TransactionType.CUSTODY || type === 'custody') {
      totalCustody += tx.debit;
    } 
    // Salary
    else if (type === TransactionType.SALARY || type === 'salary') {
      totalSalaries += tx.credit;
    } 
    // Bonuses
    else if (type === TransactionType.BONUS || type === 'bonus') {
      totalBonuses += tx.credit;
    } 
    // Allowances
    else if (type === TransactionType.TRANSPORT || type === TransactionType.HOUSING || type === 'transport' || type === 'housing') {
      totalAllowances += tx.credit;
    } 
    // Custody returns
    else if (type === TransactionType.CUSTODY_RETURN || type === 'custody_return') {
      totalCustodyReturn += tx.credit;
    } 
    // Fallback based on debit/credit values
    else {
      if (tx.debit > 0) {
        totalDeductions += tx.debit;
      } else if (tx.credit > 0) {
        totalAllowances += tx.credit;
      }
    }
  });

  const totalCredits = totalSalaries + totalBonuses + totalCustodyReturn + totalAllowances;
  const totalDebits = totalAdvances + totalDeductions + totalInstallments + totalCustody;
  const netDue = totalCredits - totalDebits;

  let status: 'due_to_them' | 'obligated' | 'balanced' = 'balanced';
  let statusArabic = 'متوازن';

  if (netDue > 0) {
    status = 'due_to_them';
    statusArabic = 'مستحق له (رصيد دائن)';
  } else if (netDue < 0) {
    status = 'obligated';
    statusArabic = 'عليه التزامات (رصيد مدين)';
  }

  // Sort and take the last 10 transactions
  const lastTransactions = [...empTxs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return {
    openingBalance: 0, // Default opening is 0
    totalSalaries,
    totalAdvances,
    totalDeductions,
    totalInstallments,
    totalBonuses,
    totalCustody,
    totalCustodyReturn,
    netDue,
    status,
    statusArabic,
    lastTransactions
  };
}

/**
 * Automatically builds monthly stats for creating standard Monthly Settlements
 */
export function calculateMonthlyStatsForSettlement(
  employee: Employee,
  year: number,
  month: number,
  transactions: Transaction[]
): Omit<MonthlySettlement, 'id' | 'status'> {
  const empTxs = transactions.filter(t => {
    if (t.employeeId !== employee.id) return false;
    const txDate = new Date(t.date);
    return txDate.getFullYear() === year && (txDate.getMonth() + 1) === month;
  });

  let totalAdvances = 0;
  let totalDeductions = 0;
  let totalInstallments = 0;
  let totalBonuses = 0;
  let totalAllowances = 0;

  empTxs.forEach(tx => {
    const type = tx.type.toLowerCase();
    
    if (type === TransactionType.ADVANCE || type === TransactionType.THURSDAY_ADVANCE || type === 'thursday_advance') {
      totalAdvances += tx.debit;
    } else if (type === TransactionType.INSTALLMENT) {
      totalInstallments += tx.debit;
    } else if (type === TransactionType.DEDUCTION || type === TransactionType.ABSENCE || type === 'deduction' || type === 'absence') {
      totalDeductions += tx.debit;
    } else if (type === TransactionType.BONUS || type === 'bonus') {
      totalBonuses += tx.credit;
    } else if (type === TransactionType.TRANSPORT || type === TransactionType.HOUSING || type === 'transport' || type === 'housing') {
      totalAllowances += tx.credit;
    } else {
      if (tx.debit > 0) {
        totalDeductions += tx.debit;
      } else if (tx.credit > 0) {
        totalAllowances += tx.credit;
      }
    }
  });

  const finalNet = (employee.salary + totalBonuses + totalAllowances) - (totalAdvances + totalDeductions + totalInstallments);

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    year,
    month,
    baseSalary: employee.salary,
    totalAdvances,
    totalDeductions,
    totalInstallments,
    totalBonuses,
    totalAllowances,
    finalNet
  };
}
