import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";

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
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: task, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => apiFetch<any>(`/tasks/${taskId}`),
    enabled: open && !!taskId,
  });

  const canEdit = ["admin", "gip"].includes(currentRole);
  const canEditTask = canEdit && !task?.section;
  const showWbsNotice = Boolean(task?.section) && canEdit;

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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
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

              {canEdit && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Закрыть
                  </Button>
                  {canEditTask && (
                    <Button onClick={() => setIsEditOpen(true)}>Редактировать</Button>
                  )}
                </div>
              )}

              {!canEdit && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Закрыть
                  </Button>
                </div>
              )}
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
