import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { differenceInDays, parseISO, startOfWeek, addWeeks, format } from "date-fns";
import { ru } from "date-fns/locale";

interface Project {
  id: string;
  name: string;
  budget: number;
  endDate: string;
  startDate: string;
}

interface PaymentEntry {
  amount: number;
  taskId?: string;
  reason?: string;
}

const paymentReasons = [
  { value: "salary", label: "ЗП" },
  { value: "advance", label: "Аванс" },
  { value: "subcontract", label: "Оплата субподрядчикам" },
];

// Generate weeks from earliest project start to latest project end + buffer
function generateWeeks(projects: Project[]): Date[] {
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

function groupByMonth(weeks: Date[]): { label: string; weeks: Date[] }[] {
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

function weekLabel(date: Date): string {
  return format(date, "dd.MM");
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

  // payments[projectId][weekIndex] = PaymentEntry
  const [payments, setPayments] = useState<Record<string, Record<number, PaymentEntry>>>({});

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCell, setEditCell] = useState<{ projectId: string; weekIndex: number } | null>(null);
  const [dialogAmount, setDialogAmount] = useState("");
  const [dialogTaskId, setDialogTaskId] = useState<string>("");
  const [dialogReason, setDialogReason] = useState<string>("");

  const openPaymentDialog = (projectId: string, weekIndex: number) => {
    const existing = payments[projectId]?.[weekIndex];
    setEditCell({ projectId, weekIndex });
    setDialogAmount(existing?.amount ? String(existing.amount) : "");
    setDialogTaskId(existing?.taskId || "");
    setDialogReason(existing?.reason || "");
    setDialogOpen(true);
  };

  const savePayment = () => {
    if (!editCell) return;
    const amount = parseFloat(dialogAmount) || 0;
    setPayments((prev) => ({
      ...prev,
      [editCell.projectId]: {
        ...prev[editCell.projectId],
        [editCell.weekIndex]: {
          amount,
          taskId: dialogTaskId || undefined,
          reason: dialogReason || undefined,
        },
      },
    }));
    setDialogOpen(false);
    setEditCell(null);
  };

  const getTotalPaid = (projectId: string) => {
    const p = payments[projectId];
    if (!p) return 0;
    return Object.values(p).reduce((sum, v) => sum + v.amount, 0);
  };

  // Get accountant tasks for a specific project
  const getProjectAccountantTasks = (projectId: string) => {
    return allTasks.filter(
      (t: any) => t.projectId === projectId && t.taskType === "accounting",
    );
  };

  const today = new Date();

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
        <DialogContent className="sm:max-w-[420px]">
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
              <Select value={dialogReason} onValueChange={setDialogReason}>
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
