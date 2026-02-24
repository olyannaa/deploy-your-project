/**
 * Shared salary payments store.
 * Single source of truth for all salary/advance payments.
 * Used by: Finance table (salary columns), SalaryPaymentsTab, SalaryDistributionTab.
 */

import { mockEmployees } from "./mockData";

export interface SalaryPaymentRecord {
  employeeId: string;
  employeeName: string;
  amount: number;
  paid: boolean;
}

export interface SalaryPayroll {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** "salary" = ЗП (5-е число), "advance" = Аванс (20-е число) */
  type: "salary" | "advance";
  /** Month label for display */
  monthLabel: string;
  employees: SalaryPaymentRecord[];
  /** Has the payroll been finalized/processed */
  processed: boolean;
}

// Demo time data: days per employee per month
export const demoMonthlyTime: Record<string, Record<string, Record<string, number>>> = {
  "user-1": {
    "2026-01": { "proj-1": 12, "proj-2": 4, "proj-3": 2 },
    "2026-02": { "proj-1": 14, "proj-2": 5, "proj-3": 3 },
  },
  "user-2": {
    "2026-01": { "proj-1": 8, "proj-3": 6 },
    "2026-02": { "proj-1": 10, "proj-3": 8 },
  },
  "user-3": {
    "2026-01": { "proj-1": 10, "proj-2": 6 },
    "2026-02": { "proj-1": 12, "proj-2": 8 },
  },
  "user-4": {
    "2026-01": { "proj-2": 7, "proj-4": 5 },
    "2026-02": { "proj-2": 9, "proj-4": 6 },
  },
  "user-6": {
    "2026-01": { "proj-1": 0 },
    "2026-02": { "proj-1": 0 },
  },
  "user-7": {
    "2026-01": { "proj-1": 5, "proj-2": 6, "proj-4": 4 },
    "2026-02": { "proj-1": 6, "proj-2": 7, "proj-4": 5 },
  },
  "user-8": {
    "2026-01": { "proj-3": 8, "proj-4": 7 },
    "2026-02": { "proj-3": 10, "proj-4": 8 },
  },
};

export const projectNames: Record<string, string> = {
  "proj-1": "Агропромышленный комплекс «Рассвет»",
  "proj-2": "Жилой комплекс «Парковый»",
  "proj-3": "Логистический центр «Восток»",
  "proj-4": "Школа на 550 мест",
};

/** Get employee accrued amount for a given month */
export function getEmployeeAccrued(employeeId: string, month: string): number {
  const emp = mockEmployees.find((e) => e.id === employeeId);
  if (!emp || emp.roles.includes("accountant")) return 0;
  const isContract = !!emp.contractRate;
  if (isContract) return emp.contractRate || 0;
  const timeData = demoMonthlyTime[employeeId]?.[month] || {};
  const totalDays = Object.values(timeData).reduce((s, d) => s + d, 0);
  return totalDays * (emp.dailyRate || 0);
}

/** Build initial demo payrolls */
function buildInitialPayrolls(): SalaryPayroll[] {
  const nonAccountants = mockEmployees.filter((e) => !e.roles.includes("accountant"));

  return [
    // January: advance paid, salary paid
    {
      id: "payroll-2026-01-20",
      date: "2026-01-20",
      type: "advance",
      monthLabel: "Январь 2026",
      processed: true,
      employees: nonAccountants.map((emp) => {
        const accrued = getEmployeeAccrued(emp.id, "2026-01");
        return {
          employeeId: emp.id,
          employeeName: emp.fullName,
          amount: Math.round(accrued * 0.5),
          paid: true,
        };
      }).filter((e) => e.amount > 0),
    },
    {
      id: "payroll-2026-02-05",
      date: "2026-02-05",
      type: "salary",
      monthLabel: "Январь 2026 (остаток)",
      processed: true,
      employees: nonAccountants.map((emp) => {
        const accrued = getEmployeeAccrued(emp.id, "2026-01");
        const advance = Math.round(accrued * 0.5);
        return {
          employeeId: emp.id,
          employeeName: emp.fullName,
          amount: accrued - advance,
          paid: true,
        };
      }).filter((e) => e.amount > 0),
    },
    // February: advance not yet paid
    {
      id: "payroll-2026-02-20",
      date: "2026-02-20",
      type: "advance",
      monthLabel: "Февраль 2026",
      processed: false,
      employees: nonAccountants.map((emp) => {
        const accrued = getEmployeeAccrued(emp.id, "2026-02");
        return {
          employeeId: emp.id,
          employeeName: emp.fullName,
          amount: Math.round(accrued * 0.5),
          paid: false,
        };
      }).filter((e) => e.amount > 0),
    },
  ];
}

let globalPayrolls: SalaryPayroll[] = buildInitialPayrolls();

export function getGlobalPayrolls(): SalaryPayroll[] {
  return globalPayrolls;
}

export function setGlobalPayrolls(p: SalaryPayroll[]) {
  globalPayrolls = p;
}

/** Get total salary paid on a specific date (YYYY-MM-DD) */
export function getSalaryPaidOnDate(date: string): number {
  return globalPayrolls
    .filter((p) => p.date === date && p.processed)
    .reduce((sum, p) => sum + p.employees.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0), 0);
}

/** Get all salary dates in the current half-year for Finance table columns */
export function getSalaryDatesForHalfYear(): { date: string; label: string; type: "salary" | "advance" }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startMonth = month < 6 ? 0 : 6;
  const endMonth = month < 6 ? 5 : 11;

  const dates: { date: string; label: string; type: "salary" | "advance" }[] = [];
  for (let m = startMonth; m <= endMonth; m++) {
    const mm = String(m + 1).padStart(2, "0");
    dates.push({
      date: `${year}-${mm}-05`,
      label: `05.${mm}`,
      type: "salary",
    });
    dates.push({
      date: `${year}-${mm}-20`,
      label: `20.${mm}`,
      type: "advance",
    });
  }
  return dates;
}
