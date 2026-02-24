import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { differenceInDays, parseISO, startOfWeek, addWeeks, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import SalaryDistributionTab from "@/components/finance/SalaryDistributionTab";
import SalaryPaymentsTab from "@/components/finance/SalaryPaymentsTab";
import { getSalaryPaidOnDate, getSalaryDatesForHalfYear, getProjectFOT } from "@/data/salaryStore";

interface Project {
  id: string;
  name: string;
  budget: number;
  endDate: string;
  startDate: string;
}

export interface PaymentEntry {
  amount: number;
  taskId?: string;
  taskTitle?: string;
  reason?: string;
  employeePayments?: { id: string; name: string; amount: number }[];
}

// Generate weeks for the current half-year
export function generateWeeks(_projects?: { startDate: string; endDate: string }[]): Date[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const halfStart = month < 6 ? new Date(year, 0, 1) : new Date(year, 6, 1);
  const halfEnd = month < 6 ? new Date(year, 5, 30) : new Date(year, 11, 31);
  const minDate = startOfWeek(halfStart, { weekStartsOn: 1 });
  const weeks: Date[] = [];
  let current = minDate;
  while (current <= halfEnd) {
    weeks.push(current);
    current = addWeeks(current, 1);
  }
  return weeks;
}

export function groupByMonth(weeks: Date[]): { label: string; weeks: Date[] }[] {
  const groups: { label: string; weeks: Date[] }[] = [];
  for (const w of weeks) {
    const label = format(w, "LLLL yyyy", { locale: ru });
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.weeks.push(w);
    } else {
      groups.push({ label, weeks: [w] });
    }
  }
  return groups;
}

export function weekLabel(date: Date): string {
  return format(date, "dd.MM");
}

// Shared payments store
function buildInitialPayments(): Record<string, Record<number, PaymentEntry[]>> {
  return {
    "proj-1": {
      4: [{ amount: 850000, taskId: "acc-2", taskTitle: "Оплата субподрядчику СтройМонтаж", reason: "subcontract" }],
      5: [{ amount: 45000, taskId: "acc-3", taskTitle: "Доп. расходы: командировка на площадку", reason: "additional" }],
      7: [{ amount: 320000, taskId: "acc-5", taskTitle: "Оплата ИП Кузнецов — изыскания", reason: "subcontract" }],
    },
    "proj-2": {
      1: [{ amount: 200000, taskId: "acc-8", taskTitle: "Оформление КС-2/КС-3 — «Парковый»", reason: "subcontract" }],
      6: [{ amount: 95000, reason: "additional", taskTitle: "Расходы на экспертизу — «Парковый»" }],
    },
    "proj-3": {
      3: [{ amount: 600000, reason: "subcontract", taskTitle: "Аванс ГеоИзыскания — «Восток»" }],
    },
    "proj-4": {
      1: [{ amount: 350000, reason: "subcontract", taskTitle: "Остаток субподряд — Школа" }],
    },
    "__no_project__": {
      2: [{ amount: 250000, taskId: "acc-1", taskTitle: "Выплата ЗП за март", reason: "salary", employeePayments: [{ id: "user-1", name: "Иванов И.И.", amount: 75000 }, { id: "user-2", name: "Петров П.П.", amount: 67500 }, { id: "user-3", name: "Сидорова А.С.", amount: 52500 }, { id: "user-4", name: "Козлов В.М.", amount: 55000 }] }],
      4: [{ amount: 385000, taskId: "acc-7", taskTitle: "Выплата ЗП (общая) за май", reason: "salary", employeePayments: [{ id: "user-1", name: "Иванов И.И.", amount: 75000 }, { id: "user-2", name: "Петров П.П.", amount: 67500 }, { id: "user-3", name: "Сидорова А.С.", amount: 52500 }, { id: "user-4", name: "Козлов В.М.", amount: 55000 }, { id: "user-6", name: "Волков Д.К.", amount: 30000 }, { id: "user-7", name: "Лебедева О.Н.", amount: 48000 }, { id: "user-8", name: "Новиков С.В.", amount: 57000 }] }],
      5: [{ amount: 180000, taskId: "acc-4", taskTitle: "Выплата аванса за апрель", reason: "salary", employeePayments: [{ id: "user-2", name: "Петров П.П.", amount: 67500 }, { id: "user-3", name: "Сидорова А.С.", amount: 52500 }, { id: "user-6", name: "Волков Д.К.", amount: 60000 }] }],
    },
  };
}

function buildInitialIncomes(): Record<string, Record<number, PaymentEntry[]>> {
  return {
    "proj-1": {
      0: [{ amount: 3750000, taskTitle: "Аванс от заказчика — «Рассвет»", reason: "income" }],
      5: [{ amount: 2500000, taskTitle: "Второй транш — «Рассвет»", reason: "income" }],
    },
    "proj-2": {
      0: [{ amount: 2460000, taskTitle: "Аванс от заказчика — «Парковый»", reason: "income" }],
      4: [{ amount: 1640000, taskTitle: "Оплата этапа — «Парковый»", reason: "income" }],
    },
    "proj-3": {
      1: [{ amount: 2040000, taskTitle: "Аванс от заказчика — «Восток»", reason: "income" }],
    },
    "proj-4": {
      0: [{ amount: 4500000, taskTitle: "Финальный расчёт — Школа", reason: "income" }],
    },
  };
}

let globalPayments: Record<string, Record<number, PaymentEntry[]>> = buildInitialPayments();
export function getGlobalPayments() { return globalPayments; }
export function setGlobalPayments(p: Record<string, Record<number, PaymentEntry[]>>) { globalPayments = p; }

let globalIncomes: Record<string, Record<number, PaymentEntry[]>> = buildInitialIncomes();
export function getGlobalIncomes() { return globalIncomes; }
export function setGlobalIncomes(p: Record<string, Record<number, PaymentEntry[]>>) { globalIncomes = p; }

export function getProjectPaidTotal(projectId: string): number {
  const p = globalPayments[projectId];
  if (!p) return 0;
  return Object.values(p).reduce((sum, entries) => sum + entries.reduce((s, e) => s + e.amount, 0), 0);
}
export function getProjectIncomeTotal(projectId: string): number {
  const p = globalIncomes[projectId];
  if (!p) return 0;
  return Object.values(p).reduce((sum, entries) => sum + entries.reduce((s, e) => s + e.amount, 0), 0);
}
export function getProjectSubcontractorPaid(projectId: string, _subcontractorId: string): number {
  const p = globalPayments[projectId];
  if (!p) return 0;
  return Object.values(p).flat().filter((v) => v.reason === "subcontract").reduce((sum, v) => sum + v.amount, 0);
}

const reasonLabels: Record<string, string> = {
  salary: "ЗП / Аванс",
  subcontract: "Субподрядчики",
  additional: "Доп. затраты",
  other: "Другое",
};

const SUMMARY_COLUMNS = [
  { key: "budget", label: "Сумма по договору" },
  { key: "income", label: "Поступления" },
  { key: "saldoIncome", label: "Сальдо (Остаток к поступлению)" },
  { key: "opex", label: "Операционные расходы" },
  { key: "fot", label: "ФОТ" },
  { key: "totalExpenses", label: "Общие расходы" },
  { key: "saldoBalance", label: "Сальдо (Между поступлениями и расходами)" },
] as const;

type ColumnVisibility = Record<typeof SUMMARY_COLUMNS[number]["key"], boolean>;

export default function Finance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAccountant = user?.roles?.includes("accountant");
  const isAdminOrGip = user?.roles?.some((r: string) => ["admin", "gip"].includes(r));
  const isReadOnly = !isAccountant;

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/projects"),
  });
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => apiFetch("/tasks"),
  });
  const { data: allEmployees = [] } = useQuery<any[]>({
    queryKey: ["users", "all"],
    queryFn: () => apiFetch("/users"),
  });
  const { data: allSubcontractors = [] } = useQuery<any[]>({
    queryKey: ["all-subcontractors"],
    queryFn: async () => {
      const results: any[] = [];
      for (const p of projects) {
        const subs = await apiFetch<any[]>(`/projects/${p.id}/subcontractors`);
        results.push(...subs);
      }
      return results;
    },
    enabled: projects.length > 0,
  });

  const activeProjects = useMemo(
    () => projects.filter((p: any) => p.status === "active" || p.status === "completed"),
    [projects],
  );

  const weeks = useMemo(() => generateWeeks(activeProjects), [activeProjects]);
  const salaryDates = useMemo(() => getSalaryDatesForHalfYear(), []);
  const [salaryRefresh, setSalaryRefresh] = useState(0);

  // Unified column list: weeks + salary dates, sorted chronologically
  const columns = useMemo(() => {
    const allCols: Array<
      | { type: "week"; weekIndex: number; date: Date; label: string; sortKey: number }
      | { type: "salary"; date: string; label: string; salaryType: "salary" | "advance"; sortKey: number }
    > = [];
    weeks.forEach((w, i) => {
      allCols.push({ type: "week", weekIndex: i, date: w, label: weekLabel(w), sortKey: w.getTime() });
    });
    salaryDates.forEach((sd) => {
      const d = new Date(sd.date);
      allCols.push({ type: "salary", date: sd.date, label: sd.label, salaryType: sd.type, sortKey: d.getTime() });
    });
    allCols.sort((a, b) => a.sortKey - b.sortKey);
    return allCols;
  }, [weeks, salaryDates]);

  // Group columns by month for header
  const columnMonthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    for (const col of columns) {
      const d = col.type === "week" ? col.date : new Date(col.date);
      const label = format(d, "LLLL yyyy", { locale: ru });
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.count++;
      } else {
        groups.push({ label, count: 1 });
      }
    }
    return groups;
  }, [columns]);

  const [payments, setPayments] = useState<Record<string, Record<number, PaymentEntry[]>>>(globalPayments);
  const [incomes, setIncomes] = useState<Record<string, Record<number, PaymentEntry[]>>>(globalIncomes);

  const updatePayments = (next: Record<string, Record<number, PaymentEntry[]>>) => {
    setPayments(next);
    setGlobalPayments(next);
  };
  const updateIncomes = (next: Record<string, Record<number, PaymentEntry[]>>) => {
    setIncomes(next);
    setGlobalIncomes(next);
  };

  // New state
  const [viewMode, setViewMode] = useState<"fact" | "plan">("fact");
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    budget: true, income: true, saldoIncome: true,
    opex: true, fot: true, totalExpenses: true, saldoBalance: true,
  });

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key as keyof ColumnVisibility] }));
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"payment" | "income">("payment");
  const [editCell, setEditCell] = useState<{ projectId: string; weekIndex: number } | null>(null);
  const [dialogAmount, setDialogAmount] = useState("");
  const [dialogTaskId, setDialogTaskId] = useState<string>("");
  const [dialogNote, setDialogNote] = useState("");
  const [employeeAmounts, setEmployeeAmounts] = useState<Record<string, string>>({});
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | undefined>();

  const openPaymentDialog = (projectId: string, weekIndex: number) => {
    setEditCell({ projectId, weekIndex });
    setDialogMode("payment");
    setDialogAmount("");
    setDialogTaskId("");
    setDialogNote("");
    setEmployeeAmounts({});
    setDialogOpen(true);
  };

  const openIncomeDialog = (projectId: string, weekIndex: number) => {
    setEditCell({ projectId, weekIndex });
    setDialogMode("income");
    setDialogAmount("");
    setDialogTaskId("");
    setDialogNote("");
    setDialogOpen(true);
  };

  const getSelectedTask = () => {
    if (!dialogTaskId || dialogTaskId === "none") return null;
    return allTasks.find((t: any) => t.id === dialogTaskId);
  };

  const getTaskEmployeeList = (task: any): { id: string; name: string; rate?: number }[] => {
    if (!task?.selectedEmployeeIds?.length) return [];
    const subtype = task.accountingSubtype;
    return task.selectedEmployeeIds.map((eid: string) => {
      if (subtype === "subcontract" || subtype === "subcontractors") {
        const sub = allSubcontractors.find((s: any) => s.id === eid);
        if (sub) return { id: eid, name: sub.contractorName, rate: sub.contractAmount };
      }
      const emp = allEmployees.find((e: any) => e.id === eid);
      if (emp) return { id: eid, name: emp.fullName, rate: emp.dailyRate || emp.contractRate || 0 };
      return { id: eid, name: eid, rate: 0 };
    });
  };

  const dialogTaskEmployees = useMemo(() => {
    const task = getSelectedTask();
    return task ? getTaskEmployeeList(task) : [];
  }, [dialogTaskId, allTasks, allEmployees, allSubcontractors]);

  const hasEmployees = dialogTaskEmployees.length > 0;

  const computeTotalFromEmployees = () => {
    return Object.values(employeeAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  };

  const saveEntry = () => {
    if (!editCell) return;
    if (dialogMode === "income") {
      const amount = parseFloat(dialogAmount) || 0;
      if (amount <= 0) return;
      const entry: PaymentEntry = {
        amount,
        taskId: dialogTaskId !== "none" ? dialogTaskId : undefined,
        taskTitle: dialogTaskId !== "none" ? getSelectedTask()?.title : dialogNote || "Приход от заказчика",
        reason: "income",
      };
      const existing = incomes[editCell.projectId]?.[editCell.weekIndex] || [];
      const next = { ...incomes, [editCell.projectId]: { ...incomes[editCell.projectId], [editCell.weekIndex]: [...existing, entry] } };
      updateIncomes(next);
    } else {
      if (!dialogTaskId || dialogTaskId === "none") return;
      const task = getSelectedTask();
      let totalAmount: number;
      let empPayments: { id: string; name: string; amount: number }[] | undefined;
      if (hasEmployees) {
        empPayments = dialogTaskEmployees.map((e) => ({ id: e.id, name: e.name, amount: parseFloat(employeeAmounts[e.id] || "") || 0 })).filter((e) => e.amount > 0);
        totalAmount = empPayments.reduce((s, e) => s + e.amount, 0);
        if (totalAmount <= 0) return;
      } else {
        totalAmount = parseFloat(dialogAmount) || 0;
        if (totalAmount <= 0) return;
      }
      const entry: PaymentEntry = { amount: totalAmount, taskId: dialogTaskId, taskTitle: task?.title || "", reason: task?.accountingSubtype || undefined, employeePayments: empPayments };
      const existing = payments[editCell.projectId]?.[editCell.weekIndex] || [];
      const next = { ...payments, [editCell.projectId]: { ...payments[editCell.projectId], [editCell.weekIndex]: [...existing, entry] } };
      updatePayments(next);
    }
    setDialogOpen(false);
    setEditCell(null);
  };

  const getCellTotal = (projectId: string, weekIndex: number) => {
    const entries = payments[projectId]?.[weekIndex];
    if (!entries || entries.length === 0) return 0;
    return entries.reduce((s, e) => s + e.amount, 0);
  };

  const getTotalPaid = (projectId: string) => {
    const p = payments[projectId];
    if (!p) return 0;
    return Object.values(p).reduce((sum, entries) => sum + entries.reduce((s, e) => s + e.amount, 0), 0);
  };

  const getTotalIncome = (projectId: string) => {
    const p = incomes[projectId];
    if (!p) return 0;
    return Object.values(p).reduce((sum, entries) => sum + entries.reduce((s, e) => s + e.amount, 0), 0);
  };

  const getIncomeCellTotal = (projectId: string, weekIndex: number) => {
    const entries = incomes[projectId]?.[weekIndex];
    if (!entries || entries.length === 0) return 0;
    return entries.reduce((s, e) => s + e.amount, 0);
  };

  const getProjectAccountantTasks = (projectId: string) => {
    if (projectId === "__no_project__") {
      return allTasks.filter((t: any) => t.taskType === "accounting" && !t.projectId);
    }
    return allTasks.filter((t: any) => t.projectId === projectId && t.taskType === "accounting");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}?tab=finance`);
  };

  const handleCreateTaskForProject = (projectId: string) => {
    setCreateTaskProjectId(projectId);
    setIsCreateTaskOpen(true);
  };

  // Compute summary values for a project
  const getProjectSummary = (project: Project) => {
    const income = getTotalIncome(project.id);
    const opex = getTotalPaid(project.id); // All project payments are operational
    const fot = getProjectFOT(project.id);
    const totalExpenses = opex + fot;
    const saldoIncome = project.budget - income;
    const saldoBalance = income - totalExpenses;
    return { income, opex, fot, totalExpenses, saldoIncome, saldoBalance };
  };

  // Render a date cell with both income and expenses
  const renderDateCell = (projectId: string, col: typeof columns[number], ci: number) => {
    if (col.type === "salary") {
      const salaryTotal = getSalaryPaidOnDate(col.date);
      return (
        <TableCell key={ci} className="p-1 border-l border-border bg-primary/5">
          {salaryTotal > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-auto min-h-[28px] min-w-[70px] flex items-center justify-center text-xs tabular-nums text-destructive font-medium">
                  −{formatCurrency(salaryTotal)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{col.salaryType === "advance" ? "Аванс" : "ЗП"} — проведено</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-[28px] min-w-[70px] flex items-center justify-center text-xs tabular-nums text-muted-foreground">—</div>
          )}
        </TableCell>
      );
    }

    const wi = col.weekIndex;
    const expEntries = payments[projectId]?.[wi] || [];
    const incEntries = incomes[projectId]?.[wi] || [];
    const cellExpense = expEntries.reduce((s, e) => s + e.amount, 0);
    const cellIncome = incEntries.reduce((s, e) => s + e.amount, 0);
    const hasData = cellExpense > 0 || cellIncome > 0;

    return (
      <TableCell
        key={ci}
        className="p-1 border-l border-border transition-colors cursor-pointer"
        onClick={() => !isReadOnly && openPaymentDialog(projectId, wi)}
      >
        {hasData ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-h-[28px] min-w-[70px] flex flex-col items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border gap-0.5">
                {cellIncome > 0 && (
                  <span className="text-green-600 dark:text-green-400">+{formatCurrency(cellIncome)}</span>
                )}
                {cellExpense > 0 && (
                  <span className="text-destructive">−{formatCurrency(cellExpense)}</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[300px]">
              {incEntries.length > 0 && (
                <>
                  <p className="font-semibold text-xs mb-1">Приходы:</p>
                  <div className="space-y-1 mb-2">
                    {incEntries.map((e, idx) => (
                      <div key={idx} className="flex justify-between gap-4 text-xs">
                        <span className="truncate">{e.taskTitle || "Приход"}</span>
                        <span className="font-medium whitespace-nowrap text-green-600">+{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {expEntries.length > 0 && (
                <>
                  <p className="font-semibold text-xs mb-1">Расходы:</p>
                  <div className="space-y-1">
                    {expEntries.map((e, idx) => (
                      <div key={idx} className="flex justify-between gap-4 text-xs">
                        <span className="truncate">{e.reason ? reasonLabels[e.reason] || e.reason : ""} {e.taskTitle || ""}</span>
                        <span className="font-medium whitespace-nowrap">−{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="h-[28px] min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-muted-foreground">
            —
          </div>
        )}
      </TableCell>
    );
  };

  const getSummaryColor = (value: number, type: "saldo" | "balance") => {
    if (type === "saldo") {
      // Остаток к поступлению: green = received everything, red = still owed
      return value > 0 ? "text-destructive" : "text-green-600 dark:text-green-400";
    }
    // Баланс: green = positive, red = negative
    return value >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive";
  };

  return (
    <TooltipProvider>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Финансы</h1>
          {(isAccountant || isAdminOrGip) && (
            <Button className="gap-2" onClick={() => { setCreateTaskProjectId(undefined); setIsCreateTaskOpen(true); }}>
              <Plus className="h-4 w-4" />
              Создать задачу
            </Button>
          )}
        </div>

        <Tabs defaultValue="finance" className="space-y-4">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="finance">Финансы</TabsTrigger>
            <TabsTrigger value="payments">Выплаты ЗП</TabsTrigger>
            <TabsTrigger value="salary">Распределение ЗП</TabsTrigger>
          </TabsList>

          <TabsContent value="finance" className="mt-0">
            {/* Controls: Факт/План + Столбцы */}
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setViewMode("fact")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "fact"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Факт
                </button>
                <button
                  onClick={() => setViewMode("plan")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "plan"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  План
                </button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Столбцы {visibleCount}/{SUMMARY_COLUMNS.length}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px]" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Отображаемые столбцы</p>
                    {SUMMARY_COLUMNS.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={visibleColumns[col.key]}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {viewMode === "plan" ? (
              <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">Плановые данные</p>
                <p className="text-sm">Раздел в разработке. Здесь будет плановый бюджет по проектам.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-auto bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-20 bg-muted min-w-[220px]" rowSpan={2}>
                        Название проекта
                      </TableHead>
                      {visibleColumns.budget && (
                        <TableHead className="text-center bg-muted min-w-[120px] border-l border-border" rowSpan={2}>
                          Сумма по<br />договору
                        </TableHead>
                      )}
                      {visibleColumns.income && (
                        <TableHead className="text-center bg-muted min-w-[110px] border-l border-border" rowSpan={2}>
                          <span className="underline underline-offset-4 decoration-muted-foreground/40">Поступления</span>
                        </TableHead>
                      )}
                      {visibleColumns.saldoIncome && (
                        <TableHead className="text-center bg-muted min-w-[130px] border-l border-border" rowSpan={2}>
                          <span className="font-bold">Сальдо</span><br />
                          <span className="text-xs font-normal">(Остаток к поступлению)</span>
                        </TableHead>
                      )}
                      {visibleColumns.opex && (
                        <TableHead className="text-center bg-muted min-w-[130px] border-l border-border" rowSpan={2}>
                          <span className="underline underline-offset-4 decoration-muted-foreground/40">Операционные<br />расходы</span>
                        </TableHead>
                      )}
                      {visibleColumns.fot && (
                        <TableHead className="text-center bg-muted min-w-[90px] border-l border-border" rowSpan={2}>
                          <span className="underline underline-offset-4 decoration-muted-foreground/40">ФОТ</span>
                        </TableHead>
                      )}
                      {visibleColumns.totalExpenses && (
                        <TableHead className="text-center bg-muted min-w-[110px] border-l border-border" rowSpan={2}>
                          <span className="underline underline-offset-4 decoration-muted-foreground/40">Общие<br />расходы</span>
                        </TableHead>
                      )}
                      {visibleColumns.saldoBalance && (
                        <TableHead className="text-center bg-muted min-w-[150px] border-l border-border" rowSpan={2}>
                          <span className="font-bold">Сальдо</span><br />
                          <span className="text-xs font-normal">(Между поступлениями<br />и расходами)</span>
                        </TableHead>
                      )}
                      {columnMonthGroups.map((mg) => (
                        <TableHead
                          key={mg.label}
                          className="text-center bg-muted border-l border-border capitalize"
                          colSpan={mg.count}
                        >
                          {mg.label}
                        </TableHead>
                      ))}
                    </TableRow>
                    <TableRow>
                      {columns.map((col, i) => (
                        <TableHead
                          key={i}
                          className={`text-center text-xs min-w-[80px] border-l border-border ${
                            col.type === "salary" ? "bg-primary/10 font-semibold" : "bg-muted"
                          }`}
                        >
                          {col.label}
                          {col.type === "salary" && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {col.salaryType === "advance" ? "Аванс" : "ЗП"}
                            </div>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Project rows - single row per project */}
                    {activeProjects.map((project) => {
                      const summary = getProjectSummary(project);

                      return (
                        <TableRow key={project.id}>
                          <TableCell className="sticky left-0 z-10 bg-card font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleProjectClick(project.id)}
                                className="text-primary hover:underline text-left"
                              >
                                {project.name}
                              </button>
                              {(isAdminOrGip || isAccountant) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  title="Создать задачу бухгалтеру"
                                  onClick={(e) => { e.stopPropagation(); handleCreateTaskForProject(project.id); }}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {visibleColumns.budget && (
                            <TableCell className="text-center tabular-nums border-l border-border">
                              {formatCurrency(project.budget)}
                            </TableCell>
                          )}
                          {visibleColumns.income && (
                            <TableCell className="text-center tabular-nums border-l border-border text-green-600 dark:text-green-400">
                              {formatCurrency(summary.income)}
                            </TableCell>
                          )}
                          {visibleColumns.saldoIncome && (
                            <TableCell className={`text-center tabular-nums font-bold border-l border-border ${getSummaryColor(summary.saldoIncome, "saldo")}`}>
                              {formatCurrency(summary.saldoIncome)}
                            </TableCell>
                          )}
                          {visibleColumns.opex && (
                            <TableCell className="text-center tabular-nums border-l border-border">
                              {formatCurrency(summary.opex)}
                            </TableCell>
                          )}
                          {visibleColumns.fot && (
                            <TableCell className="text-center tabular-nums border-l border-border">
                              {formatCurrency(summary.fot)}
                            </TableCell>
                          )}
                          {visibleColumns.totalExpenses && (
                            <TableCell className="text-center tabular-nums border-l border-border">
                              {formatCurrency(summary.totalExpenses)}
                            </TableCell>
                          )}
                          {visibleColumns.saldoBalance && (
                            <TableCell className={`text-center tabular-nums font-bold border-l border-border ${getSummaryColor(summary.saldoBalance, "balance")}`}>
                              {formatCurrency(summary.saldoBalance)}
                            </TableCell>
                          )}
                          {columns.map((col, ci) => renderDateCell(project.id, col, ci))}
                        </TableRow>
                      );
                    })}

                    {/* Non-project tasks */}
                    {(() => {
                      const nonProjectTasks = allTasks.filter((t: any) => t.taskType === "accounting" && !t.projectId);
                      if (nonProjectTasks.length === 0) return null;
                      return (
                        <>
                          <TableRow>
                            <TableCell
                              colSpan={1 + visibleCount + columns.length}
                              className="sticky left-0 z-10 bg-muted/70 font-semibold text-muted-foreground py-2 text-sm border-t-2 border-border"
                            >
                              Вне проекта
                            </TableCell>
                          </TableRow>
                          {nonProjectTasks.map((task: any) => {
                            const npPayments = payments["__no_project__"] || {};
                            const taskPaid = Object.values(npPayments).reduce((sum, entries) =>
                              sum + entries.filter(e => e.taskId === task.id).reduce((s, e) => s + e.amount, 0), 0);

                            return (
                              <TableRow key={task.id}>
                                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                                  <span className="text-sm">{task.title}</span>
                                  {task.accountingSubtype && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({reasonLabels[task.accountingSubtype] || task.accountingSubtype})
                                    </span>
                                  )}
                                </TableCell>
                                {visibleColumns.budget && <TableCell className="text-center text-muted-foreground border-l border-border">—</TableCell>}
                                {visibleColumns.income && <TableCell className="text-center text-muted-foreground border-l border-border">—</TableCell>}
                                {visibleColumns.saldoIncome && <TableCell className="text-center text-muted-foreground border-l border-border">—</TableCell>}
                                {visibleColumns.opex && <TableCell className="text-center text-muted-foreground border-l border-border">—</TableCell>}
                                {visibleColumns.fot && <TableCell className="text-center text-muted-foreground border-l border-border">—</TableCell>}
                                {visibleColumns.totalExpenses && <TableCell className="text-center text-muted-foreground border-l border-border">—</TableCell>}
                                {visibleColumns.saldoBalance && <TableCell className="text-center text-muted-foreground border-l border-border">—</TableCell>}
                                {columns.map((col, ci) => {
                                  if (col.type === "salary") {
                                    return (
                                      <TableCell key={ci} className="p-1 border-l border-border bg-primary/5">
                                        <div className="h-[28px] min-w-[70px]" />
                                      </TableCell>
                                    );
                                  }
                                  const wi = col.weekIndex;
                                  const entries = (payments["__no_project__"]?.[wi] || []).filter(e => e.taskId === task.id);
                                  const cellTotal = entries.reduce((s, e) => s + e.amount, 0);
                                  return (
                                    <TableCell key={ci} className="p-1 border-l border-border transition-colors" onClick={() => !isReadOnly && openPaymentDialog("__no_project__", wi)}>
                                      {cellTotal > 0 ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="h-[28px] min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-destructive">
                                              −{formatCurrency(cellTotal)}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[300px]">
                                            <div className="space-y-1">
                                              {entries.map((e, idx) => (
                                                <div key={idx} className="flex justify-between gap-4 text-xs">
                                                  <span className="truncate">{e.reason ? reasonLabels[e.reason] || e.reason : ""} {e.taskTitle || ""}</span>
                                                  <span className="font-medium whitespace-nowrap">−{formatCurrency(e.amount)}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : (
                                        <div className="h-[28px] min-w-[70px] flex items-center justify-center text-xs tabular-nums text-muted-foreground">—</div>
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </>
                      );
                    })()}

                    {/* Итого row */}
                    {(() => {
                      const totalBudget = activeProjects.reduce((s, p) => s + p.budget, 0);
                      const totalIncome = activeProjects.reduce((s, p) => s + getTotalIncome(p.id), 0);
                      const totalOpex = activeProjects.reduce((s, p) => s + getTotalPaid(p.id), 0) + getTotalPaid("__no_project__");
                      const totalFot = activeProjects.reduce((s, p) => s + getProjectFOT(p.id), 0);
                      const totalExpAll = totalOpex + totalFot;
                      const totalSaldoIncome = totalBudget - totalIncome;
                      const totalSaldoBalance = totalIncome - totalExpAll;

                      return (
                        <TableRow className="bg-muted/50 border-t-2 border-border font-semibold">
                          <TableCell className="sticky left-0 z-10 bg-muted/50 font-bold">Итого</TableCell>
                          {visibleColumns.budget && (
                            <TableCell className="text-center tabular-nums font-bold border-l border-border">{formatCurrency(totalBudget)}</TableCell>
                          )}
                          {visibleColumns.income && (
                            <TableCell className="text-center tabular-nums font-bold text-green-600 dark:text-green-400 border-l border-border">{formatCurrency(totalIncome)}</TableCell>
                          )}
                          {visibleColumns.saldoIncome && (
                            <TableCell className={`text-center tabular-nums font-bold border-l border-border ${getSummaryColor(totalSaldoIncome, "saldo")}`}>{formatCurrency(totalSaldoIncome)}</TableCell>
                          )}
                          {visibleColumns.opex && (
                            <TableCell className="text-center tabular-nums font-bold border-l border-border">{formatCurrency(totalOpex)}</TableCell>
                          )}
                          {visibleColumns.fot && (
                            <TableCell className="text-center tabular-nums font-bold border-l border-border">{formatCurrency(totalFot)}</TableCell>
                          )}
                          {visibleColumns.totalExpenses && (
                            <TableCell className="text-center tabular-nums font-bold border-l border-border">{formatCurrency(totalExpAll)}</TableCell>
                          )}
                          {visibleColumns.saldoBalance && (
                            <TableCell className={`text-center tabular-nums font-bold border-l border-border ${getSummaryColor(totalSaldoBalance, "balance")}`}>{formatCurrency(totalSaldoBalance)}</TableCell>
                          )}
                          {columns.map((col, ci) => {
                            if (col.type === "salary") {
                              const salaryTotal = getSalaryPaidOnDate(col.date);
                              return (
                                <TableCell key={ci} className="p-1 border-l border-border bg-primary/5">
                                  {salaryTotal > 0 ? (
                                    <div className="h-[28px] min-w-[70px] flex items-center justify-center text-[10px] tabular-nums text-destructive font-semibold">
                                      −{formatCurrency(salaryTotal)}
                                    </div>
                                  ) : (
                                    <div className="h-[28px] min-w-[70px] flex items-center justify-center text-xs tabular-nums text-muted-foreground">—</div>
                                  )}
                                </TableCell>
                              );
                            }
                            const wi = col.weekIndex;
                            const weekPaid = activeProjects.reduce((s, p) => s + getCellTotal(p.id, wi), 0) + getCellTotal("__no_project__", wi);
                            const weekIncome = activeProjects.reduce((s, p) => s + getIncomeCellTotal(p.id, wi), 0);
                            return (
                              <TableCell key={ci} className="p-1 border-l border-border">
                                {(weekPaid > 0 || weekIncome > 0) ? (
                                  <div className="h-auto min-h-[28px] min-w-[70px] flex flex-col items-center justify-center text-[10px] tabular-nums gap-0.5">
                                    {weekIncome > 0 && <span className="text-green-600 dark:text-green-400">+{formatCurrency(weekIncome)}</span>}
                                    {weekPaid > 0 && <span className="text-destructive">−{formatCurrency(weekPaid)}</span>}
                                  </div>
                                ) : (
                                  <div className="h-[28px] min-w-[70px] flex items-center justify-center text-xs tabular-nums text-muted-foreground">—</div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <SalaryPaymentsTab onPayrollProcessed={() => setSalaryRefresh((v) => v + 1)} />
          </TabsContent>

          <TabsContent value="salary" className="mt-0">
            <SalaryDistributionTab />
          </TabsContent>
        </Tabs>

        {/* Payment/Income Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>
                {dialogMode === "income" ? "Ввод прихода" : "Ввод выплаты"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {dialogMode === "payment" && (
                <div className="space-y-2">
                  <Label>Задача *</Label>
                  <Select value={dialogTaskId} onValueChange={(v) => { setDialogTaskId(v); setEmployeeAmounts({}); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите задачу" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Не выбрана —</SelectItem>
                      {editCell && getProjectAccountantTasks(editCell.projectId).map((task: any) => (
                        <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {dialogMode === "payment" && dialogTaskId && dialogTaskId !== "none" && (() => {
                const task = getSelectedTask();
                return task?.accountingSubtype ? (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    Вид: <span className="font-medium text-foreground">{reasonLabels[task.accountingSubtype] || task.accountingSubtype}</span>
                  </div>
                ) : null;
              })()}
              {dialogMode === "payment" && hasEmployees && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Суммы по сотрудникам</Label>
                    <span className="text-xs text-muted-foreground">
                      Итого: {computeTotalFromEmployees().toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                    {dialogTaskEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{emp.name}</span>
                          {emp.rate ? <span className="text-xs text-muted-foreground">Ставка: {emp.rate.toLocaleString("ru-RU")} ₽</span> : null}
                        </div>
                        <Input
                          type="number"
                          className="w-32"
                          placeholder="Сумма"
                          value={employeeAmounts[emp.id] || ""}
                          onChange={(e) => setEmployeeAmounts((prev) => ({ ...prev, [emp.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {dialogMode === "income" && (
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Input placeholder="Напр. Оплата от заказчика за этап 1" value={dialogNote} onChange={(e) => setDialogNote(e.target.value)} />
                </div>
              )}
              {(dialogMode === "income" || !hasEmployees) && (
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">{dialogMode === "income" ? "Сумма прихода *" : "Сумма выплаты *"}</Label>
                  <Input id="payment-amount" type="number" placeholder="Введите сумму" value={dialogAmount} onChange={(e) => setDialogAmount(e.target.value)} autoFocus />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button
                onClick={saveEntry}
                disabled={
                  dialogMode === "payment"
                    ? (!dialogTaskId || dialogTaskId === "none") || (hasEmployees ? computeTotalFromEmployees() <= 0 : !dialogAmount)
                    : !dialogAmount
                }
              >
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CreateTaskDialog
          open={isCreateTaskOpen}
          onOpenChange={setIsCreateTaskOpen}
          projectId={createTaskProjectId}
          forceTaskType="accounting"
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
        />
      </div>
    </TooltipProvider>
  );
}
