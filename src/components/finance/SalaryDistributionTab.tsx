import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockEmployees } from "@/data/mockData";
import { getGlobalPayments, type PaymentEntry } from "@/pages/Finance";

/**
 * Demo data: how many days each employee spent on each project in the current period.
 * In production this comes from time-tracking entries.
 */
const demoTimeDistribution: Record<string, Record<string, number>> = {
  "user-1": { "proj-1": 14, "proj-2": 5, "proj-3": 3 },
  "user-2": { "proj-1": 10, "proj-3": 8 },
  "user-3": { "proj-1": 12, "proj-2": 8 },
  "user-4": { "proj-2": 9, "proj-4": 6 },
  "user-5": {},
  "user-6": { "proj-1": 0 }, // contract worker, attached to proj-1
  "user-7": { "proj-1": 6, "proj-2": 7, "proj-4": 5 },
  "user-8": { "proj-3": 10, "proj-4": 8 },
};

const projectNames: Record<string, string> = {
  "proj-1": "Агропромышленный комплекс «Рассвет»",
  "proj-2": "Парковый ансамбль «Зелёный квартал»",
  "proj-3": "Бизнес-центр «Восток»",
  "proj-4": "Школа на 1100 мест",
};

interface EmployeeDistribution {
  employee: {
    id: string;
    name: string;
    isContract: boolean;
    dailyRate: number;
    contractRate: number | null;
  };
  totalDays: number;
  totalAccrued: number;
  totalPaid: number;
  projects: {
    projectId: string;
    projectName: string;
    days: number;
    proportion: number;
    accrued: number;
    paid: number;
  }[];
  payments: {
    date: string;
    amount: number;
    type: string;
    weekIndex: number;
    projectBreakdown: { projectId: string; projectName: string; amount: number }[];
  }[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Extract all salary payments from globalPayments, grouped by employee */
function getSalaryPaymentsByEmployee(): Record<string, { amount: number; weekIndex: number; taskTitle: string }[]> {
  const payments = getGlobalPayments();
  const npPayments = payments["__no_project__"] || {};
  const result: Record<string, { amount: number; weekIndex: number; taskTitle: string }[]> = {};

  for (const [wi, entries] of Object.entries(npPayments)) {
    for (const entry of entries) {
      if (entry.reason !== "salary" || !entry.employeePayments) continue;
      for (const ep of entry.employeePayments) {
        if (!result[ep.id]) result[ep.id] = [];
        result[ep.id].push({
          amount: ep.amount,
          weekIndex: Number(wi),
          taskTitle: entry.taskTitle || "Выплата ЗП",
        });
      }
    }
  }
  return result;
}

/** Map weekIndex to approximate date label */
function weekIndexToDate(weekIndex: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const halfStart = month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
  const date = new Date(halfStart);
  date.setDate(date.getDate() + weekIndex * 7);
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default function SalaryDistributionTab() {
  const distributions = useMemo<EmployeeDistribution[]>(() => {
    const salaryPayments = getSalaryPaymentsByEmployee();

    return mockEmployees
      .filter((emp) => !emp.roles.includes("accountant"))
      .map((emp) => {
        const isContract = !!emp.contractRate;
        const timeData = demoTimeDistribution[emp.id] || {};
        const totalDays = Object.values(timeData).reduce((s, d) => s + d, 0);

        // Calculate accrued amount
        const totalAccrued = isContract
          ? (emp.contractRate || 0)
          : totalDays * (emp.dailyRate || 0);

        // Build project breakdown
        const projects = Object.entries(timeData)
          .filter(([, days]) => days > 0 || isContract)
          .map(([projId, days]) => {
            const proportion = isContract ? 1 : (totalDays > 0 ? days / totalDays : 0);
            return {
              projectId: projId,
              projectName: projectNames[projId] || projId,
              days,
              proportion,
              accrued: isContract ? (emp.contractRate || 0) : days * (emp.dailyRate || 0),
              paid: 0, // calculated below
            };
          });

        // Get payments for this employee
        const empPayments = salaryPayments[emp.id] || [];
        const totalPaid = empPayments.reduce((s, p) => s + p.amount, 0);

        // Distribute payments proportionally across projects
        const payments = empPayments.map((p) => ({
          date: weekIndexToDate(p.weekIndex),
          amount: p.amount,
          type: p.taskTitle.toLowerCase().includes("аванс") ? "Аванс" : "ЗП",
          weekIndex: p.weekIndex,
          projectBreakdown: projects.map((proj) => ({
            projectId: proj.projectId,
            projectName: proj.projectName,
            amount: Math.round(p.amount * proj.proportion),
          })),
        }));

        // Sum paid per project
        for (const payment of payments) {
          for (const pb of payment.projectBreakdown) {
            const proj = projects.find((p) => p.projectId === pb.projectId);
            if (proj) proj.paid += pb.amount;
          }
        }

        return {
          employee: {
            id: emp.id,
            name: emp.fullName,
            isContract,
            dailyRate: emp.dailyRate || 0,
            contractRate: emp.contractRate,
          },
          totalDays,
          totalAccrued,
          totalPaid,
          projects,
          payments,
        };
      })
      .filter((d) => d.totalAccrued > 0);
  }, []);

  // Project summary
  const projectSummary = useMemo(() => {
    const summary: Record<string, { name: string; accrued: number; paid: number }> = {};
    for (const dist of distributions) {
      for (const proj of dist.projects) {
        if (!summary[proj.projectId]) {
          summary[proj.projectId] = { name: proj.projectName, accrued: 0, paid: 0 };
        }
        summary[proj.projectId].accrued += proj.accrued;
        summary[proj.projectId].paid += proj.paid;
      }
    }
    return summary;
  }, [distributions]);

  const grandTotalAccrued = distributions.reduce((s, d) => s + d.totalAccrued, 0);
  const grandTotalPaid = distributions.reduce((s, d) => s + d.totalPaid, 0);

  return (
    <div className="space-y-6">
      {/* Main distribution table */}
      <div className="rounded-lg border border-border overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Сотрудник</TableHead>
              <TableHead className="text-center min-w-[80px]">Тип</TableHead>
              <TableHead className="min-w-[200px]">Проект</TableHead>
              <TableHead className="text-right min-w-[80px]">Дней</TableHead>
              <TableHead className="text-right min-w-[100px]">Ставка</TableHead>
              <TableHead className="text-right min-w-[110px]">Начислено</TableHead>
              <TableHead className="text-right min-w-[110px]">Выплачено</TableHead>
              <TableHead className="text-right min-w-[110px]">Остаток</TableHead>
              <TableHead className="text-center min-w-[90px]">Дата</TableHead>
              <TableHead className="text-center min-w-[80px]">Вид</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributions.map((dist) => {
              const rowCount = dist.projects.length + dist.payments.length + 1;
              const remaining = dist.totalAccrued - dist.totalPaid;

              return (
                <> 
                  {/* Employee summary row */}
                  <TableRow key={dist.employee.id} className="bg-muted/30 font-semibold border-t-2 border-border">
                    <TableCell>{dist.employee.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={dist.employee.isContract ? "secondary" : "outline"} className="text-xs">
                        {dist.employee.isContract ? "Контракт" : "Штат"}
                      </Badge>
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">{dist.employee.isContract ? "—" : dist.totalDays}</TableCell>
                    <TableCell className="text-right">
                      {dist.employee.isContract
                        ? formatCurrency(dist.employee.contractRate || 0)
                        : `${formatCurrency(dist.employee.dailyRate)}/день`}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(dist.totalAccrued)}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(dist.totalPaid)}</TableCell>
                    <TableCell className={`text-right ${remaining > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                      {formatCurrency(remaining)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>

                  {/* Project breakdown rows */}
                  {dist.projects.map((proj) => (
                    <TableRow key={`${dist.employee.id}-${proj.projectId}`}>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-sm">{proj.projectName}</TableCell>
                      <TableCell className="text-right text-sm">{dist.employee.isContract ? "—" : proj.days}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {Math.round(proj.proportion * 100)}%
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(proj.accrued)}</TableCell>
                      <TableCell className="text-right text-sm text-primary">{formatCurrency(proj.paid)}</TableCell>
                      <TableCell className={`text-right text-sm ${(proj.accrued - proj.paid) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                        {formatCurrency(proj.accrued - proj.paid)}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  ))}

                  {/* Payment history rows */}
                  {dist.payments.map((payment, pi) => (
                    <TableRow key={`${dist.employee.id}-pay-${pi}`} className="text-muted-foreground">
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-xs italic pl-6">
                        {payment.projectBreakdown.map((pb) => (
                          <span key={pb.projectId} className="block">
                            → {pb.projectName}: {formatCurrency(pb.amount)}
                          </span>
                        ))}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right text-sm font-medium text-foreground">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-center text-xs">{payment.date}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {payment.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}

            {/* Grand total */}
            <TableRow className="bg-muted/50 border-t-2 border-border font-bold">
              <TableCell>Итого по сотрудникам</TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell className="text-right">{formatCurrency(grandTotalAccrued)}</TableCell>
              <TableCell className="text-right text-primary">{formatCurrency(grandTotalPaid)}</TableCell>
              <TableCell className={`text-right ${(grandTotalAccrued - grandTotalPaid) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                {formatCurrency(grandTotalAccrued - grandTotalPaid)}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Project summary */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Сводка по проектам (нагрузка ЗП на бюджет)</h3>
        <div className="rounded-lg border border-border overflow-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Проект</TableHead>
                <TableHead className="text-right min-w-[130px]">Начислено (ЗП)</TableHead>
                <TableHead className="text-right min-w-[130px]">Выплачено (ЗП)</TableHead>
                <TableHead className="text-right min-w-[130px]">Остаток (ЗП)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(projectSummary).map(([projId, data]) => (
                <TableRow key={projId}>
                  <TableCell className="font-medium">{data.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.accrued)}</TableCell>
                  <TableCell className="text-right text-primary">{formatCurrency(data.paid)}</TableCell>
                  <TableCell className={`text-right ${(data.accrued - data.paid) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                    {formatCurrency(data.accrued - data.paid)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold border-t">
                <TableCell>Итого</TableCell>
                <TableCell className="text-right">{formatCurrency(Object.values(projectSummary).reduce((s, d) => s + d.accrued, 0))}</TableCell>
                <TableCell className="text-right text-primary">{formatCurrency(Object.values(projectSummary).reduce((s, d) => s + d.paid, 0))}</TableCell>
                <TableCell className={`text-right ${(grandTotalAccrued - grandTotalPaid) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                  {formatCurrency(Object.values(projectSummary).reduce((s, d) => s + (d.accrued - d.paid), 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
