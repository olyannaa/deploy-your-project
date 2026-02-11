import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
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
  reason?: string;
  selectedSubcontractorIds?: string[];
}

const paymentReasons = [
  { value: "salary", label: "ЗП" },
  { value: "advance", label: "Аванс" },
  { value: "subcontract", label: "Оплата субподрядчикам" },
];

// Generate weeks from earliest project start to latest project end + buffer
export function generateWeeks(projects: { startDate: string; endDate: string }[]): Date[] {
  if (!projects.length) return [];
  const starts = projects.map((p) => parseISO(p.startDate));
  const ends = projects.map((p) => parseISO(p.endDate));
  const minDate = startOfWeek(new Date(Math.min(...starts.map((d) => d.getTime()))), { weekStartsOn: 1 });
  const maxDate = new Date(Math.max(...ends.map((d) => d.getTime())));

  const weeks: Date[] = [];
  let current = minDate;
  while (current <= addWeeks(maxDate, 2)) {
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

// Shared payments store (simple in-memory for demo)
let globalPayments: Record<string, Record<number, PaymentEntry>> = {};
export function getGlobalPayments() { return globalPayments; }
export function setGlobalPayments(p: Record<string, Record<number, PaymentEntry>>) { globalPayments = p; }
export function getProjectPaidTotal(projectId: string): number {
  const p = globalPayments[projectId];
  if (!p) return 0;
  return Object.values(p).reduce((sum, v) => sum + v.amount, 0);
}
export function getProjectSubcontractorPaid(projectId: string, subcontractorId: string): number {
  const p = globalPayments[projectId];
  if (!p) return 0;
  return Object.values(p)
    .filter((v) => v.reason === "subcontract" && v.selectedSubcontractorIds?.includes(subcontractorId))
    .reduce((sum, v) => sum + v.amount, 0);
}

export default function Finance() {
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

  const [payments, setPayments] = useState<Record<string, Record<number, PaymentEntry>>>(globalPayments);

  // Sync to global
  const updatePayments = (next: Record<string, Record<number, PaymentEntry>>) => {
    setPayments(next);
    setGlobalPayments(next);
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCell, setEditCell] = useState<{ projectId: string; weekIndex: number } | null>(null);
  const [dialogAmount, setDialogAmount] = useState("");
  const [dialogTaskId, setDialogTaskId] = useState<string>("");
  const [dialogReason, setDialogReason] = useState<string>("");
  const [selectedSubcontractorIds, setSelectedSubcontractorIds] = useState<string[]>([]);

  // Fetch subcontractors for current project
  const { data: projectSubcontractors = [] } = useQuery<any[]>({
    queryKey: ["project", editCell?.projectId, "subcontractors"],
    queryFn: () => apiFetch(`/projects/${editCell!.projectId}/subcontractors`),
    enabled: !!editCell?.projectId,
  });

  const openPaymentDialog = (projectId: string, weekIndex: number) => {
    const existing = payments[projectId]?.[weekIndex];
    setEditCell({ projectId, weekIndex });
    setDialogAmount(existing?.amount ? String(existing.amount) : "");
    setDialogTaskId(existing?.taskId || "");
    setDialogReason(existing?.reason || "");
    setSelectedSubcontractorIds(existing?.selectedSubcontractorIds || []);
    setDialogOpen(true);
  };

  const savePayment = () => {
    if (!editCell) return;
    const amount = parseFloat(dialogAmount) || 0;
    const next = {
      ...payments,
      [editCell.projectId]: {
        ...payments[editCell.projectId],
        [editCell.weekIndex]: {
          amount,
          taskId: dialogTaskId || undefined,
          reason: dialogReason || undefined,
          selectedSubcontractorIds: dialogReason === "subcontract" ? selectedSubcontractorIds : undefined,
        },
      },
    };
    updatePayments(next);
    setDialogOpen(false);
    setEditCell(null);
  };

  const getTotalPaid = (projectId: string) => {
    const p = payments[projectId];
    if (!p) return 0;
    return Object.values(p).reduce((sum, v) => sum + v.amount, 0);
  };

  const getProjectAccountantTasks = (projectId: string) => {
    return allTasks.filter(
      (t: any) => t.projectId === projectId && t.taskType === "accounting",
    );
  };

  const toggleSubcontractor = (id: string) => {
    setSelectedSubcontractorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const today = new Date();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

  return (
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
                    <Link
                      to={`/projects/${project.id}?tab=analytics`}
                      className="text-primary hover:underline"
                    >
                      {project.name}
                    </Link>
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
                    const entry = payments[project.id]?.[wi];
                    return (
                      <TableCell
                        key={wi}
                        className="p-1 border-l border-border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => openPaymentDialog(project.id, wi)}
                      >
                        <div className="h-8 min-w-[70px] flex items-center justify-center text-sm tabular-nums rounded-md border border-transparent hover:border-border">
                          {entry?.amount ? entry.amount.toLocaleString("ru-RU") : "—"}
                        </div>
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

            <div className="space-y-2">
              <Label>Задача (необязательно)</Label>
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

            <div className="space-y-2">
              <Label>Причина выплаты (необязательно)</Label>
              <Select value={dialogReason} onValueChange={(v) => {
                setDialogReason(v);
                if (v !== "subcontract") setSelectedSubcontractorIds([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите причину" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Не выбрана —</SelectItem>
                  {paymentReasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcontractor multi-select */}
            {dialogReason === "subcontract" && (
              <div className="space-y-2">
                <Label>Субподрядчики проекта</Label>
                {projectSubcontractors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет субподрядчиков в этом проекте</p>
                ) : (
                  <div className="border border-border rounded-md p-3 space-y-3 max-h-[200px] overflow-auto">
                    {projectSubcontractors.map((sub: any) => (
                      <label
                        key={sub.id}
                        className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded p-1.5 -m-1.5"
                      >
                        <Checkbox
                          checked={selectedSubcontractorIds.includes(sub.id)}
                          onCheckedChange={() => toggleSubcontractor(sub.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{sub.contractorName}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-0.5">
                            <span>Сумма: {formatCurrency(sub.contractAmount)}</span>
                            <span>Дней: {sub.workDays}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={savePayment}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}