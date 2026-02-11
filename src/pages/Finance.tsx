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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { differenceInDays, parseISO, startOfWeek, addWeeks, format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus } from "lucide-react";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

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

// Generate weeks for the current half-year (Jan-Jun or Jul-Dec)
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

// Shared payments store — arrays per cell for multiple payments
let globalPayments: Record<string, Record<number, PaymentEntry[]>> = {};
export function getGlobalPayments() { return globalPayments; }
export function setGlobalPayments(p: Record<string, Record<number, PaymentEntry[]>>) { globalPayments = p; }

// Shared income store — arrays per cell
let globalIncomes: Record<string, Record<number, PaymentEntry[]>> = {};
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
  return Object.values(p)
    .flat()
    .filter((v) => v.reason === "subcontract")
    .reduce((sum, v) => sum + v.amount, 0);
}

const reasonLabels: Record<string, string> = {
  salary: "ЗП / Аванс",
  subcontract: "Субподрядчики",
  additional: "Доп. затраты",
  other: "Другое",
};

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
  const monthGroups = useMemo(() => groupByMonth(weeks), [weeks]);

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

  // Resolve employee list from selected task
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
      const next = {
        ...incomes,
        [editCell.projectId]: {
          ...incomes[editCell.projectId],
          [editCell.weekIndex]: [...existing, entry],
        },
      };
      updateIncomes(next);
    } else {
      if (!dialogTaskId || dialogTaskId === "none") return;
      const task = getSelectedTask();
      let totalAmount: number;
      let empPayments: { id: string; name: string; amount: number }[] | undefined;

      if (hasEmployees) {
        empPayments = dialogTaskEmployees
          .map((e) => ({ id: e.id, name: e.name, amount: parseFloat(employeeAmounts[e.id] || "") || 0 }))
          .filter((e) => e.amount > 0);
        totalAmount = empPayments.reduce((s, e) => s + e.amount, 0);
        if (totalAmount <= 0) return;
      } else {
        totalAmount = parseFloat(dialogAmount) || 0;
        if (totalAmount <= 0) return;
      }

      const entry: PaymentEntry = {
        amount: totalAmount,
        taskId: dialogTaskId,
        taskTitle: task?.title || "",
        reason: task?.accountingSubtype || undefined,
        employeePayments: empPayments,
      };
      const existing = payments[editCell.projectId]?.[editCell.weekIndex] || [];
      const next = {
        ...payments,
        [editCell.projectId]: {
          ...payments[editCell.projectId],
          [editCell.weekIndex]: [...existing, entry],
        },
      };
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
    return allTasks.filter(
      (t: any) => t.projectId === projectId && t.taskType === "accounting",
    );
  };

  const today = new Date();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}?tab=finance`);
  };

  const handleCreateTaskForProject = (projectId: string) => {
    setCreateTaskProjectId(projectId);
    setIsCreateTaskOpen(true);
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

        <div className="rounded-lg border border-border overflow-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-muted min-w-[200px]" rowSpan={2}>
                  Название проекта
                </TableHead>
                <TableHead className="text-center bg-muted min-w-[120px]" rowSpan={2}>
                  Сумма по договору
                </TableHead>
                <TableHead className="text-center bg-muted min-w-[100px]" rowSpan={2}>
                  Приходы
                </TableHead>
                <TableHead className="text-center bg-muted min-w-[100px]" rowSpan={2}>
                  Оплачено
                </TableHead>
                <TableHead className="text-center bg-muted min-w-[100px]" rowSpan={2}>
                  Остаток
                </TableHead>
                <TableHead className="text-center bg-muted min-w-[80px]" rowSpan={2}>
                  Дней
                </TableHead>
                {monthGroups.map((mg) => (
                  <TableHead
                    key={mg.label}
                    className="text-center bg-muted border-l border-border capitalize"
                    colSpan={mg.weeks.length}
                  >
                    {mg.label}
                  </TableHead>
                ))}
              </TableRow>
              <TableRow>
                {weeks.map((w, i) => (
                  <TableHead key={i} className="text-center bg-muted text-xs min-w-[80px] border-l border-border">
                    {weekLabel(w)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeProjects.map((project) => {
                const paid = getTotalPaid(project.id);
                const income = getTotalIncome(project.id);
                const remaining = project.budget - paid;
                const daysLeft = Math.max(0, differenceInDays(parseISO(project.endDate), today));

                return (
                  <>
                    {/* Payments row */}
                    <TableRow key={project.id}>
                      <TableCell className="sticky left-0 z-10 bg-card font-medium" rowSpan={2}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleProjectClick(project.id)}
                            className="text-primary hover:underline text-left"
                          >
                            {project.name}
                          </button>
                          {isAdminOrGip && (
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
                      <TableCell className="text-center tabular-nums" rowSpan={2}>
                        {project.budget.toLocaleString("ru-RU")} ₽
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-green-600 dark:text-green-400" rowSpan={2}>
                        {income.toLocaleString("ru-RU")} ₽
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-primary" rowSpan={2}>
                        {paid.toLocaleString("ru-RU")} ₽
                      </TableCell>
                      <TableCell className="text-center tabular-nums" rowSpan={2}>
                        {remaining.toLocaleString("ru-RU")} ₽
                      </TableCell>
                      <TableCell className="text-center tabular-nums" rowSpan={2}>{daysLeft}</TableCell>
                      {weeks.map((_, wi) => {
                        const entries = payments[project.id]?.[wi] || [];
                        const cellTotal = getCellTotal(project.id, wi);
                        return (
                          <TableCell
                            key={wi}
                            className="p-1 border-l border-border transition-colors"
                            onClick={() => !isReadOnly && openPaymentDialog(project.id, wi)}
                          >
                            {entries.length > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="h-7 min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-destructive">
                                    −{cellTotal.toLocaleString("ru-RU")}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px]">
                                  <p className="font-semibold text-xs mb-1">Расходы:</p>
                                  <div className="space-y-1">
                                    {entries.map((e, idx) => (
                                      <div key={idx} className="flex justify-between gap-4 text-xs">
                                        <span className="truncate">
                                          {e.reason ? reasonLabels[e.reason] || e.reason : ""}{" "}
                                          {e.taskTitle || ""}
                                        </span>
                                        <span className="font-medium whitespace-nowrap">
                                          {formatCurrency(e.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="h-7 min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-muted-foreground">
                                —
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Income row */}
                    <TableRow key={`${project.id}-income`} className="border-b-2 border-border">
                      {weeks.map((_, wi) => {
                        const entries = incomes[project.id]?.[wi] || [];
                        const cellTotal = getIncomeCellTotal(project.id, wi);
                        return (
                          <TableCell
                            key={wi}
                            className="p-1 border-l border-border transition-colors"
                            onClick={() => !isReadOnly && openIncomeDialog(project.id, wi)}
                          >
                            {entries.length > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="h-7 min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-green-600 dark:text-green-400">
                                    +{cellTotal.toLocaleString("ru-RU")}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[300px]">
                                  <p className="font-semibold text-xs mb-1">Приходы:</p>
                                  <div className="space-y-1">
                                    {entries.map((e, idx) => (
                                      <div key={idx} className="flex justify-between gap-4 text-xs">
                                        <span className="truncate">{e.taskTitle || "Приход"}</span>
                                        <span className="font-medium whitespace-nowrap">
                                          {formatCurrency(e.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="h-7 min-w-[70px] flex items-center justify-center text-xs tabular-nums rounded-md border border-transparent hover:border-border text-muted-foreground">
                                —
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>

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
                      {editCell &&
                        getProjectAccountantTasks(editCell.projectId).map((task: any) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.title}
                          </SelectItem>
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

              {/* Per-employee amounts when task has employees */}
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
                          {emp.rate ? (
                            <span className="text-xs text-muted-foreground">Ставка: {emp.rate.toLocaleString("ru-RU")} ₽</span>
                          ) : null}
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
                  <Input
                    placeholder="Напр. Оплата от заказчика за этап 1"
                    value={dialogNote}
                    onChange={(e) => setDialogNote(e.target.value)}
                  />
                </div>
              )}

              {/* Single amount field - shown for income or payment without employees */}
              {(dialogMode === "income" || !hasEmployees) && (
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">
                    {dialogMode === "income" ? "Сумма прихода *" : "Сумма выплаты *"}
                  </Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    placeholder="Введите сумму"
                    value={dialogAmount}
                    onChange={(e) => setDialogAmount(e.target.value)}
                    autoFocus
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
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
