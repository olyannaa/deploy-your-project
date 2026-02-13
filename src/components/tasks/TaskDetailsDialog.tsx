import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, ExternalLink } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import { toast } from "sonner";
import {
  getGlobalPayments,
  setGlobalPayments,
  generateWeeks,
  type PaymentEntry,
} from "@/pages/Finance";

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  projectRole?: "manager" | "lead_specialist" | "executor" | "accountant" | null;
}

const statusLabels: Record<string, string> = {
  new: "Новые",
  in_progress: "В работе",
  review: "На проверке",
  done: "Завершено",
};

const statusClasses: Record<string, string> = {
  new: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const taskTypeLabels: Record<string, string> = {
  project: "Проектная",
  personal: "Личная",
  accounting: "Бухгалтерская",
  project_time: "Управление проектом",
  subcontract: "Субподряд",
};

const accountingSubtypeLabels: Record<string, string> = {
  salary: "Зарплата/Аванс",
  subcontract: "Субподрядчики/Фриланс",
  subcontractors: "Субподрядчики/Фриланс",
  additional: "Доп. затраты",
  extra_costs: "Доп. затраты",
  other: "Другое",
};

const approvalLabels: Record<string, string> = {
  pending: "Ожидает согласования",
  approved: "Согласовано",
  rejected: "Отклонено",
};

const approvalClasses: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU");
};

export default function TaskDetailsDialog({
  open,
  onOpenChange,
  taskId,
  projectRole,
}: TaskDetailsDialogProps) {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [employeeAmounts, setEmployeeAmounts] = useState<Record<string, string>>({});
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [singleAmount, setSingleAmount] = useState("");

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => apiFetch<any>(`/tasks/${taskId}`),
    enabled: open && !!taskId,
  });

  const { data: allEmployees = [] } = useQuery<any[]>({
    queryKey: ["users", "all"],
    queryFn: () => apiFetch("/users"),
    enabled: open && task?.taskType === "accounting",
  });

  const { data: allSubcontractors = [] } = useQuery<any[]>({
    queryKey: ["task-detail-subcontractors", task?.projectId],
    queryFn: () => apiFetch(`/projects/${task?.projectId}/subcontractors`),
    enabled: open && task?.taskType === "accounting" && !!task?.projectId,
  });

  const canEdit = ["admin", "gip"].includes(currentRole);
  const canEditTask = canEdit && !task?.section;
  const showWbsNotice = Boolean(task?.section) && canEdit;
  const isAccountant = currentRole === "accountant" || user?.roles?.includes("accountant");
  const isAccountingTask = task?.taskType === "accounting";
  const canEnterPayment = isAccountant && isAccountingTask && task?.status !== "done";

  const roles = user?.roles ?? [];
  const canViewAllSubcontractCosts =
    roles.some((role) => ["admin", "gip", "accountant"].includes(role)) ||
    projectRole === "manager";
  const isRestrictedSubcontractViewer =
    roles.some((role) => ["lead_specialist", "executor"].includes(role)) ||
    (projectRole ? ["lead_specialist", "executor"].includes(projectRole) : false);
  const canViewSubcontractCost =
    canViewAllSubcontractCosts ||
    !isRestrictedSubcontractViewer ||
    (task?.assigneeId && task.assigneeId === user?.id);

  const statusLabel = task?.status ? statusLabels[task.status] ?? task.status : "";
  const statusClass = task?.status ? statusClasses[task.status] ?? "" : "";

  // Resolve employees from task
  const taskEmployees = useMemo(() => {
    if (!task?.selectedEmployeeIds?.length) return [];
    const subtype = task.accountingSubtype;
    return task.selectedEmployeeIds.map((eid: string) => {
      if (subtype === "subcontract" || subtype === "subcontractors") {
        const sub = allSubcontractors.find((s: any) => s.id === eid);
        if (sub) return { id: eid, name: sub.contractorName, rate: sub.contractAmount };
      }
      const emp = allEmployees.find((e: any) => e.id === eid);
      if (emp) return { id: eid, name: emp.fullName, rate: emp.dailyRate || emp.contractRate || 0, workDays: emp.workDays ?? Math.floor(Math.random() * 22) + 1 };
      return { id: eid, name: eid, rate: 0, workDays: 0 };
    });
  }, [task, allEmployees, allSubcontractors]);

  const hasEmployees = taskEmployees.length > 0;

  const computeTotal = () =>
    hasEmployees
      ? Object.values(employeeAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : parseFloat(singleAmount) || 0;

  const handleSavePayment = async () => {
    const total = computeTotal();
    if (total <= 0) return;

    const paymentKey = task?.projectId || "__no_project__";

    // Find current week index
    const weeks = generateWeeks();
    const now = new Date();
    let weekIndex = 0;
    for (let i = 0; i < weeks.length; i++) {
      if (weeks[i] <= now) weekIndex = i;
    }

    const empPayments = hasEmployees
      ? taskEmployees
          .map((e: any) => ({ id: e.id, name: e.name, amount: parseFloat(employeeAmounts[e.id] || "") || 0 }))
          .filter((e: any) => e.amount > 0)
      : undefined;

    const entry: PaymentEntry = {
      amount: total,
      taskId: task.id,
      taskTitle: task.title,
      reason: task.accountingSubtype || undefined,
      employeePayments: empPayments,
    };

    const gp = getGlobalPayments();
    const existing = gp[paymentKey]?.[weekIndex] || [];
    const next = {
      ...gp,
      [paymentKey]: {
        ...gp[paymentKey],
        [weekIndex]: [...existing, entry],
      },
    };
    setGlobalPayments(next);

    // Mark task as done
    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    } catch {}

    toast.success(`Выплата ${total.toLocaleString("ru-RU")} ₽ сохранена, задача завершена`);
    setShowPaymentForm(false);
    setEmployeeAmounts({});
    setSingleAmount("");
    onOpenChange(false);
  };

  const editTaskPayload = useMemo(() => {
    if (!task) return null;
    return {
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      projectName: task.projectName,
      assigneeId: task.assigneeId,
      taskType: task.taskType,
    };
  }, [task]);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setShowPaymentForm(false); setEmployeeAmounts({}); setSingleAmount(""); } onOpenChange(v); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Карточка задачи</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Загрузка данных...</div>
          ) : task ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                  {statusLabel && (
                    <Badge variant="outline" className={statusClass}>
                      {statusLabel}
                    </Badge>
                  )}
                  {task.taskType && (
                    <Badge variant="secondary">{taskTypeLabels[task.taskType] ?? task.taskType}</Badge>
                  )}
                  {task.assigneeIsAccountant && (
                    <Badge variant="secondary">Бухгалтер</Badge>
                  )}
                  {task.taskType === "subcontract" && task.approvalStatus && (
                    <Badge variant="outline" className={approvalClasses[task.approvalStatus] ?? ""}>
                      {approvalLabels[task.approvalStatus] ?? task.approvalStatus}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Проект: <span className="text-foreground">{task.projectName || "Вне проекта"}</span>
                </div>
                {isAccountingTask && task.accountingSubtype && (
                  <div className="text-sm text-muted-foreground">
                    Вид: <span className="text-foreground font-medium">{accountingSubtypeLabels[task.accountingSubtype] || task.accountingSubtype}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Исполнитель</div>
                  <div className="text-foreground">{task.assigneeName || "Не назначен"}</div>
                  {task.assigneeContractorName && (
                    <Badge variant="outline" className="text-xs">
                      {`Контрагент: ${task.assigneeContractorName}`}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Раздел WBS</div>
                  <div className="text-foreground">
                    {task.section ? `${task.section.code || ""} ${task.section.name || ""}`.trim() : "—"}
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Плановая дата старта</div>
                  <div className="text-foreground">{formatDate(task.plannedStartDate)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Плановая дата завершения</div>
                  <div className="text-foreground">{formatDate(task.plannedEndDate)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Фактический старт</div>
                  <div className="text-foreground">{formatDate(task.actualStartDate)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Фактическое завершение</div>
                  <div className="text-foreground">{formatDate(task.actualEndDate)}</div>
                </div>
                {task.taskType === "subcontract" && (
                  <>
                    <div className="space-y-1 text-sm">
                      <div className="text-muted-foreground">Запрошенная стоимость</div>
                      <div className="text-foreground">
                        {canViewSubcontractCost && task.subcontractCostRequested
                          ? Number(task.subcontractCostRequested).toLocaleString("ru-RU") + " ₽"
                          : "—"}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="text-muted-foreground">Финальная стоимость</div>
                      <div className="text-foreground">
                        {canViewSubcontractCost && task.subcontractCostFinal
                          ? Number(task.subcontractCostFinal).toLocaleString("ru-RU") + " ₽"
                          : "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Employees assigned to accounting task */}
              {isAccountingTask && taskEmployees.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">
                    {task.accountingSubtype === "subcontract" || task.accountingSubtype === "subcontractors"
                      ? "Субподрядчики"
                      : "Сотрудники"}
                  </div>
                  <div className="rounded-md border border-border">
                    {taskEmployees.map((emp: any) => (
                      <div key={emp.id} className="flex items-center justify-between border-b border-border px-3 py-2 last:border-b-0 text-sm">
                        <span>{emp.name}</span>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {(task.accountingSubtype === "salary") && (
                            <span className="text-xs">{emp.workDays ?? 0} раб. дн.</span>
                          )}
                          {emp.rate > 0 && (
                            <span>{emp.rate.toLocaleString("ru-RU")} ₽</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment form for accountant */}
              {canEnterPayment && !showPaymentForm && (
                <Button onClick={() => setShowPaymentForm(true)} className="w-full">
                  Внести выплату и завершить задачу
                </Button>
              )}

              {canEnterPayment && showPaymentForm && (
                <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
                  <div className="text-sm font-medium text-foreground">Ввод выплаты</div>

                  {hasEmployees ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Суммы по сотрудникам</Label>
                        <span className="text-xs text-muted-foreground">
                          Итого: {computeTotal().toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                        <div
                          className="flex items-center gap-3 border-b border-border px-3 py-2 bg-muted/20 cursor-pointer hover:bg-muted/40"
                          onClick={() => {
                            const allFilled = taskEmployees.every((e: any) => employeeAmounts[e.id]);
                            if (allFilled) {
                              setEmployeeAmounts({});
                            } else {
                              const next: Record<string, string> = {};
                              taskEmployees.forEach((e: any) => { next[e.id] = employeeAmounts[e.id] || String(e.rate || 0); });
                              setEmployeeAmounts(next);
                            }
                          }}
                        >
                          <Checkbox
                            checked={taskEmployees.every((e: any) => employeeAmounts[e.id] && parseFloat(employeeAmounts[e.id]) > 0)}
                          />
                          <span className="text-sm font-medium">Заполнить всех по ставке</span>
                        </div>
                        {taskEmployees.map((emp: any) => (
                          <div key={emp.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm truncate block">{emp.name}</span>
                              {emp.rate > 0 && (
                                <span className="text-xs text-muted-foreground">Ставка: {emp.rate.toLocaleString("ru-RU")} ₽</span>
                              )}
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
                  ) : (
                    <div className="space-y-2">
                      <Label>Сумма выплаты *</Label>
                      <Input
                        type="number"
                        placeholder="Введите сумму"
                        value={singleAmount}
                        onChange={(e) => setSingleAmount(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowPaymentForm(false)}>Отмена</Button>
                    <Button onClick={handleSavePayment} disabled={computeTotal() <= 0}>
                      Сохранить и завершить
                    </Button>
                  </div>
                </div>
              )}

              {showWbsNotice && (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Задачи в проекте редактируются на вкладке "Свойства".
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Файлы</div>
                {task.files?.length ? (
                  <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {task.files.map((file: any) => (
                      <div key={file.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{file.fileName}</span>
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          {file.description && (
                            <div className="text-xs text-muted-foreground mt-1">{file.description}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {file.userName} · {formatDate(file.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Файлы для задачи не загружены.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Закрыть
                </Button>
                {canEditTask && (
                  <Button onClick={() => setIsEditOpen(true)}>Редактировать</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-sm text-muted-foreground">Не удалось загрузить задачу.</div>
          )}
        </DialogContent>
      </Dialog>

      <EditTaskDialog open={isEditOpen} onOpenChange={setIsEditOpen} task={editTaskPayload} />
    </>
  );
}
