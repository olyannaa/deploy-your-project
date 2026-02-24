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
import { Plus, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import SalaryDistributionTab from "@/components/finance/SalaryDistributionTab";
import SalaryPaymentsTab from "@/components/finance/SalaryPaymentsTab";
import { getSalaryPaidOnDate, getProjectSalaryOnDate, getSalaryDatesForHalfYear, getProjectFOT, getTotalFOT } from "@/data/salaryStore";

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

/* ============================== ANALYTICS COLUMNS ============================== */
const ANALYTICS_COLUMNS = [
  { key: "budget", label: "Сумма по договору" },
  { key: "income", label: "Поступления" },
  { key: "balanceIncome", label: "Сальдо\n(Остаток к поступлению)" },
  { key: "opex", label: "Операционные расходы" },
  { key: "fot", label: "ФОТ" },
  { key: "totalExpenses", label: "Общие расходы" },
  { key: "balance", label: "Сальдо (Между\nпоступлениями\nи расходами)" },
] as const;

type AnalyticsColumnKey = typeof ANALYTICS_COLUMNS[number]["key"];

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

  // Unified columns: weeks + salary dates, sorted chronologically
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

  const columnMonthGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = [];
    for (const col of columns) {
      const d = col.type === "week" ? col.date : new Date(col.date);
      const label = format(d, "LLLL yyyy", { locale: ru });
      const last = groups[groups.length - 1];
      if (last && last.label === label) { last.count++; } else { groups.push({ label, count: 1 }); }
    }
    return groups;
  }, [columns]);

  const [payments, setPayments] = useState<Record<string, Record<number, PaymentEntry[]>>>(globalPayments);
  const [incomes, setIncomes] = useState<Record<string, Record<number, PaymentEntry[]>>>(globalIncomes);
  const updatePayments = (next: Record<string, Record<number, PaymentEntry[]>>) => { setPayments(next); setGlobalPayments(next); };
  const updateIncomes = (next: Record<string, Record<number, PaymentEntry[]>>) => { setIncomes(next); setGlobalIncomes(next); };

  // View mode (Факт / План)
  const [viewMode, setViewMode] = useState<"fact" | "plan">("fact");

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<AnalyticsColumnKey>>(
    new Set(ANALYTICS_COLUMNS.map((c) => c.key))
  );
  const toggleCol = (key: AnalyticsColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
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
    setDialogAmount(""); setDialogTaskId(""); setDialogNote(""); setEmployeeAmounts({});
    setDialogOpen(true);
  };
  const openIncomeDialog = (projectId: string, weekIndex: number) => {
    setEditCell({ projectId, weekIndex });
    setDialogMode("income");
    setDialogAmount(""); setDialogTaskId(""); setDialogNote("");
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
  const computeTotalFromEmployees = () =>
    Object.values(employeeAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);

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
      updateIncomes({ ...incomes, [editCell.projectId]: { ...incomes[editCell.projectId], [editCell.weekIndex]: [...existing, entry] } });
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
      updatePayments({ ...payments, [editCell.projectId]: { ...payments[editCell.projectId], [editCell.weekIndex]: [...existing, entry] } });
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
    if (projectId === "__no_project__") return allTasks.filter((t: any) => t.taskType === "accounting" && !t.projectId);
    return allTasks.filter((t: any) => t.projectId === projectId && t.taskType === "accounting");
  };

  const today = new Date();
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);
  const fmtNum = (value: number) => value.toLocaleString("ru-RU");

  const handleProjectClick = (projectId: string) => navigate(`/projects/${projectId}?tab=finance`);
  const handleCreateTaskForProject = (projectId: string) => { setCreateTaskProjectId(projectId); setIsCreateTaskOpen(true); };

  /* ============================== Analytics per project ============================== */
  const getProjectAnalytics = (projectId: string) => {
    const budget = activeProjects.find((p) => p.id === projectId)?.budget || 0;
    const income = getTotalIncome(projectId);
    const opex = getTotalPaid(projectId); // operational expenses
    const fot = getProjectFOT(projectId);
    const totalExpenses = opex + fot;
    const balanceIncome = budget - income; // остаток к поступлению
    const balance = income - totalExpenses; // сальдо
    return { budget, income, balanceIncome, opex, fot, totalExpenses, balance };
  };

  const getAnalyticsValue = (a: ReturnType<typeof getProjectAnalytics>, key: AnalyticsColumnKey) => {
    return a[key];
  };

  const analyticsColCount = ANALYTICS_COLUMNS.filter((c) => visibleCols.has(c.key)).length;

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
            {/* Toolbar: Факт/План + Столбцы */}
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex rounded-lg border border-border overflow-hidden">
                <button
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${viewMode === "fact" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                  onClick={() => setViewMode("fact")}
                >
                  Факт
                </button>
                <button
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${viewMode === "plan" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                  onClick={() => setViewMode("plan")}
                >
                  План
                </button>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm hover:bg-muted transition-colors">
                    <SlidersHorizontal className="h-4 w-4" />
                    Столбцы
                    <span className="text-xs text-muted-foreground">{analyticsColCount}/{ANALYTICS_COLUMNS.length}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3">
                  <p className="text-sm font-medium mb-2">Видимые столбцы</p>
                  <div className="space-y-2">
                    {ANALYTICS_COLUMNS.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={visibleCols.has(col.key)}
                          onCheckedChange={() => toggleCol(col.key)}
                        />
                        {col.label.replace(/\n/g, " ")}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-lg border border-border overflow-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-muted min-w-[200px]" rowSpan={2}>
                      Название проекта
                    </TableHead>
                    {ANALYTICS_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                      <TableHead
                        key={col.key}
                        className={`text-center bg-muted min-w-[120px] whitespace-pre-line ${
                          col.key === "income" || col.key === "opex" ? "underline" : ""
                        }`}
                        rowSpan={2}
                      >
                        {col.label}
                      </TableHead>
                    ))}
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
                          col.type === "salary" ? "bg-accent/60 font-semibold" : "bg-muted"
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
                  {activeProjects.map((project) => {
                    const a = getProjectAnalytics(project.id);
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
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Создать задачу"
                                onClick={(e) => { e.stopPropagation(); handleCreateTaskForProject(project.id); }}>
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        {/* Analytics columns */}
                        {ANALYTICS_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => {
                          const val = getAnalyticsValue(a, col.key);
                          let colorClass = "";
                          if (col.key === "balanceIncome") colorClass = "text-destructive font-bold";
                          else if (col.key === "balance") colorClass = "text-green-600 dark:text-green-400 font-bold";
                          else if (col.key === "income") colorClass = "";
                          return (
                            <TableCell key={col.key} className={`text-center tabular-nums ${colorClass}`}>
                              {val > 0 ? `${fmtNum(val)}` : "—"}
                            </TableCell>
                          );
                        })}
                        {/* Date columns - combined income + expense */}
                        {columns.map((col, ci) => {
                          if (col.type === "salary") {
                            const projectSalary = getProjectSalaryOnDate(project.id, col.date);
                            return (
                              <TableCell key={ci} className="p-1 border-l border-border bg-accent/20">
                                <div className="min-w-[70px] flex flex-col items-center justify-center text-xs tabular-nums py-0.5 gap-0.5">
                                  {projectSalary > 0 ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-destructive font-medium cursor-default">−{fmtNum(Math.round(projectSalary))}</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="text-xs">{col.salaryType === "advance" ? "Аванс" : "ЗП"} — доля проекта</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </div>
                              </TableCell>
                            );
                          }
                          const wi = col.weekIndex;
                          const expEntries = payments[project.id]?.[wi] || [];
                          const incEntries = incomes[project.id]?.[wi] || [];
                          const cellExpense = getCellTotal(project.id, wi);
                          const cellIncome = getIncomeCellTotal(project.id, wi);
                          const hasData = cellExpense > 0 || cellIncome > 0;
                          return (
                            <TableCell
                              key={ci}
                              className="p-1 border-l border-border transition-colors cursor-pointer"
                              onClick={() => {
                                if (isReadOnly) return;
                                openPaymentDialog(project.id, wi);
                              }}
                              onContextMenu={(e) => {
                                if (isReadOnly) return;
                                e.preventDefault();
                                openIncomeDialog(project.id, wi);
                              }}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="min-w-[70px] flex flex-col items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border gap-0.5 py-0.5">
                                    <span className={cellExpense > 0 ? "text-destructive" : "text-muted-foreground"}>
                                      {cellExpense > 0 ? `−${fmtNum(cellExpense)}` : "—"}
                                    </span>
                                    <span className={cellIncome > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                                      {cellIncome > 0 ? `+${fmtNum(cellIncome)}` : "—"}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                {hasData && (
                                  <TooltipContent side="top" className="max-w-[300px]">
                                    {incEntries.length > 0 && (
                                      <>
                                        <p className="font-semibold text-xs mb-1 text-green-600">Приходы:</p>
                                        <div className="space-y-1 mb-2">
                                          {incEntries.map((e, idx) => (
                                            <div key={idx} className="flex justify-between gap-4 text-xs">
                                              <span className="truncate">{e.taskTitle || "Приход"}</span>
                                              <span className="font-medium whitespace-nowrap">{formatCurrency(e.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                    {expEntries.length > 0 && (
                                      <>
                                        <p className="font-semibold text-xs mb-1 text-destructive">Расходы:</p>
                                        <div className="space-y-1">
                                          {expEntries.map((e, idx) => (
                                            <div key={idx} className="flex justify-between gap-4 text-xs">
                                              <span className="truncate">{e.reason ? reasonLabels[e.reason] || e.reason : ""} {e.taskTitle || ""}</span>
                                              <span className="font-medium whitespace-nowrap">{formatCurrency(e.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TableCell>
                          );
                        })}
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
                          <TableCell colSpan={1 + analyticsColCount + columns.length} className="sticky left-0 z-10 bg-muted/70 font-semibold text-muted-foreground py-2 text-sm border-t-2 border-border">
                            <div className="flex items-center gap-2">
                              Вне проекта
                              {isAccountant && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Создать задачу вне проекта"
                                  onClick={(e) => { e.stopPropagation(); setCreateTaskProjectId(undefined); setIsCreateTaskOpen(true); }}>
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
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
                                  <span className="text-xs text-muted-foreground ml-2">({reasonLabels[task.accountingSubtype] || task.accountingSubtype})</span>
                                )}
                              </TableCell>
                              {ANALYTICS_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => (
                                <TableCell key={col.key} className="text-center tabular-nums text-muted-foreground">—</TableCell>
                              ))}
                              {columns.map((col, ci) => {
                                if (col.type === "salary") {
                                  return <TableCell key={ci} className="p-1 border-l border-border bg-accent/20"><div className="h-7 min-w-[70px]" /></TableCell>;
                                }
                                const wi = col.weekIndex;
                                const entries = (payments["__no_project__"]?.[wi] || []).filter(e => e.taskId === task.id);
                                const cellTotal = entries.reduce((s, e) => s + e.amount, 0);
                                return (
                                  <TableCell key={ci} className="p-1 border-l border-border transition-colors"
                                    onClick={() => !isReadOnly && openPaymentDialog("__no_project__", wi)}>
                                    {cellTotal > 0 ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="h-7 min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-destructive">
                                            −{fmtNum(cellTotal)}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[300px]">
                                          <div className="space-y-1">
                                            {entries.map((e, idx) => (
                                              <div key={idx} className="flex justify-between gap-4 text-xs">
                                                <span className="truncate">{e.reason ? reasonLabels[e.reason] || e.reason : ""} {e.taskTitle || ""}</span>
                                                <span className="font-medium whitespace-nowrap">{formatCurrency(e.amount)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <div className="h-7 min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-muted-foreground">—</div>
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
                    const totalFot = getTotalFOT();
                    const totalExp = totalOpex + totalFot;
                    const totalBalanceIncome = totalBudget - totalIncome;
                    const totalBalance = totalIncome - totalExp;

                    const totals: Record<AnalyticsColumnKey, number> = {
                      budget: totalBudget,
                      income: totalIncome,
                      balanceIncome: totalBalanceIncome,
                      opex: totalOpex,
                      fot: totalFot,
                      totalExpenses: totalExp,
                      balance: totalBalance,
                    };

                    return (
                      <TableRow className="bg-muted/50 border-t-2 border-border font-semibold">
                        <TableCell className="sticky left-0 z-10 bg-muted/50 font-bold">Итого</TableCell>
                        {ANALYTICS_COLUMNS.filter((c) => visibleCols.has(c.key)).map((col) => {
                          const val = totals[col.key];
                          let colorClass = "font-bold";
                          if (col.key === "balanceIncome") colorClass += " text-destructive";
                          else if (col.key === "balance") colorClass += " text-green-600 dark:text-green-400";
                          else if (col.key === "income") colorClass += " text-green-600 dark:text-green-400";
                          return (
                            <TableCell key={col.key} className={`text-center tabular-nums ${colorClass}`}>
                              {fmtNum(val)}
                            </TableCell>
                          );
                        })}
                        {columns.map((col, ci) => {
                          if (col.type === "salary") {
                            const salaryTotal = getSalaryPaidOnDate(col.date);
                            return (
                              <TableCell key={ci} className="p-1 border-l border-border bg-accent/20">
                                <div className="min-w-[70px] flex flex-col items-center justify-center text-[10px] tabular-nums py-0.5 gap-0.5">
                                  <span className={salaryTotal > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                                    {salaryTotal > 0 ? `−${fmtNum(salaryTotal)}` : "—"}
                                  </span>
                                  <span className="text-muted-foreground">—</span>
                                </div>
                              </TableCell>
                            );
                          }
                          const wi = col.weekIndex;
                          const weekPaid = activeProjects.reduce((s, p) => s + getCellTotal(p.id, wi), 0) + getCellTotal("__no_project__", wi);
                          const weekIncome = activeProjects.reduce((s, p) => s + getIncomeCellTotal(p.id, wi), 0) + getIncomeCellTotal("__no_project__", wi);
                          return (
                            <TableCell key={ci} className="p-1 border-l border-border">
                              <div className="min-w-[70px] flex flex-col items-center justify-center text-[10px] tabular-nums py-0.5 gap-0.5">
                                <span className={weekPaid > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                                  {weekPaid > 0 ? `−${fmtNum(weekPaid)}` : "—"}
                                </span>
                                <span className={weekIncome > 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-muted-foreground"}>
                                  {weekIncome > 0 ? `+${fmtNum(weekIncome)}` : "—"}
                                </span>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="mt-0">
            <SalaryPaymentsTab onPayrollProcessed={() => setSalaryRefresh((v) => v + 1)} />
          </TabsContent>

          <TabsContent value="salary" className="mt-0">
            <SalaryDistributionTab />
          </TabsContent>
        </Tabs>

        {/* Payment / Income dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[540px]">
            <DialogHeader>
              <DialogTitle>{dialogMode === "income" ? "Ввод прихода" : "Ввод выплаты"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {dialogMode === "payment" && (
                <div className="space-y-2">
                  <Label>Задача *</Label>
                  <Select value={dialogTaskId} onValueChange={(v) => { setDialogTaskId(v); setEmployeeAmounts({}); }}>
                    <SelectTrigger><SelectValue placeholder="Выберите задачу" /></SelectTrigger>
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
                    <span className="text-xs text-muted-foreground">Итого: {computeTotalFromEmployees().toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                    {dialogTaskEmployees.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{emp.name}</span>
                          {emp.rate ? <span className="text-xs text-muted-foreground">Ставка: {emp.rate.toLocaleString("ru-RU")} ₽</span> : null}
                        </div>
                        <Input type="number" className="w-32" placeholder="Сумма" value={employeeAmounts[emp.id] || ""}
                          onChange={(e) => setEmployeeAmounts((prev) => ({ ...prev, [emp.id]: e.target.value }))} />
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
                  <Input id="payment-amount" type="number" placeholder="Введите сумму" value={dialogAmount}
                    onChange={(e) => setDialogAmount(e.target.value)} autoFocus />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              <Button onClick={saveEntry}
                disabled={dialogMode === "payment" ? (!dialogTaskId || dialogTaskId === "none") || (hasEmployees ? computeTotalFromEmployees() <= 0 : !dialogAmount) : !dialogAmount}>
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
