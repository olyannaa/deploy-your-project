import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

// Shared payments store — now stores arrays per cell for multiple payments
let globalPayments: Record<string, Record<number, PaymentEntry[]>> = {};
export function getGlobalPayments() { return globalPayments; }
export function setGlobalPayments(p: Record<string, Record<number, PaymentEntry[]>>) { globalPayments = p; }
export function getProjectPaidTotal(projectId: string): number {
  const p = globalPayments[projectId];
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

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/projects"),
  });

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => apiFetch("/tasks"),
  });

  const activeProjects = useMemo(
    () => projects.filter((p: any) => p.status === "active" || p.status === "completed"),
    [projects],
  );

  const weeks = useMemo(() => generateWeeks(activeProjects), [activeProjects]);
  const monthGroups = useMemo(() => groupByMonth(weeks), [weeks]);

  const [payments, setPayments] = useState<Record<string, Record<number, PaymentEntry[]>>>(globalPayments);

  const updatePayments = (next: Record<string, Record<number, PaymentEntry[]>>) => {
    setPayments(next);
    setGlobalPayments(next);
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCell, setEditCell] = useState<{ projectId: string; weekIndex: number } | null>(null);
  const [dialogAmount, setDialogAmount] = useState("");
  const [dialogTaskId, setDialogTaskId] = useState<string>("");

  const openPaymentDialog = (projectId: string, weekIndex: number) => {
    setEditCell({ projectId, weekIndex });
    setDialogAmount("");
    setDialogTaskId("");
    setDialogOpen(true);
  };

  const getSelectedTask = () => {
    if (!dialogTaskId || dialogTaskId === "none") return null;
    return allTasks.find((t: any) => t.id === dialogTaskId);
  };

  const savePayment = () => {
    if (!editCell || !dialogTaskId || dialogTaskId === "none") return;
    const amount = parseFloat(dialogAmount) || 0;
    if (amount <= 0) return;
    const task = getSelectedTask();
    const entry: PaymentEntry = {
      amount,
      taskId: dialogTaskId,
      taskTitle: task?.title || "",
      reason: task?.accountingSubtype || undefined,
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

  const getProjectAccountantTasks = (projectId: string) => {
    return allTasks.filter(
      (t: any) => t.projectId === projectId && t.taskType === "accounting",
    );
  };

  const today = new Date();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

  const handleProjectClick = (projectId: string) => {
    // Navigate to project and auto-open cost details
    navigate(`/projects/${projectId}?tab=analytics&openCosts=true`);
  };

  return (
    <TooltipProvider>
      <div>
        <h1 className="text-2xl font-bold mb-6">Финансы</h1>

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
                const remaining = project.budget - paid;
                const daysLeft = Math.max(0, differenceInDays(parseISO(project.endDate), today));

                return (
                  <TableRow key={project.id}>
                    <TableCell className="sticky left-0 z-10 bg-card font-medium">
                      <button
                        onClick={() => handleProjectClick(project.id)}
                        className="text-primary hover:underline text-left"
                      >
                        {project.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {project.budget.toLocaleString("ru-RU")} ₽
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-primary">
                      {paid.toLocaleString("ru-RU")} ₽
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {remaining.toLocaleString("ru-RU")} ₽
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{daysLeft}</TableCell>
                    {weeks.map((_, wi) => {
                      const entries = payments[project.id]?.[wi] || [];
                      const cellTotal = getCellTotal(project.id, wi);
                      return (
                        <TableCell
                          key={wi}
                          className="p-1 border-l border-border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => openPaymentDialog(project.id, wi)}
                        >
                          {entries.length > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="h-8 min-w-[70px] flex items-center justify-center text-sm tabular-nums rounded-md border border-transparent hover:border-border">
                                  {cellTotal.toLocaleString("ru-RU")}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
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
                                  {entries.length > 1 && (
                                    <div className="flex justify-between gap-4 text-xs font-bold border-t border-border pt-1 mt-1">
                                      <span>Итого</span>
                                      <span>{formatCurrency(cellTotal)}</span>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="h-8 min-w-[70px] flex items-center justify-center text-sm tabular-nums rounded-md border border-transparent hover:border-border text-muted-foreground">
                              —
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Payment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Ввод выплаты</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Задача *</Label>
                <Select value={dialogTaskId} onValueChange={setDialogTaskId}>
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

              {dialogTaskId && dialogTaskId !== "none" && (() => {
                const task = getSelectedTask();
                return task?.accountingSubtype ? (
                  <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    Вид: <span className="font-medium text-foreground">{reasonLabels[task.accountingSubtype] || task.accountingSubtype}</span>
                  </div>
                ) : null;
              })()}

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Сумма выплаты *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="Введите сумму"
                  value={dialogAmount}
                  onChange={(e) => setDialogAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={savePayment}
                disabled={!dialogTaskId || dialogTaskId === "none" || !dialogAmount}
              >
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
