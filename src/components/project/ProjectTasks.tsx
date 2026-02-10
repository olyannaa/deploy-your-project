import { useMemo, useState, type DragEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import TaskDetailsDialog from "@/components/tasks/TaskDetailsDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { getTaskScheduleBadge } from "@/lib/taskSchedule";

interface Project {
  id: string;
}

interface ProjectTasksProps {
  project: Project;
}

const taskStatuses = [
  { id: "new", name: "Новые", color: "bg-slate-500" },
  { id: "in_progress", name: "В работе", color: "bg-blue-500" },
  { id: "review", name: "На проверке", color: "bg-yellow-500" },
  { id: "done", name: "Завершено", color: "bg-green-500" },
];

const approvalLabels: Record<string, string> = {
  pending: "Ожидает согласования",
  approved: "Согласовано",
  rejected: "Отклонено",
};

export default function ProjectTasks({ project }: ProjectTasksProps) {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isExecutorOnly =
    roles.includes("executor") &&
    !roles.some((role) => ["admin", "gip", "accountant"].includes(role));
  const queryClient = useQueryClient();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["project", project.id, "tasks"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/tasks`),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project", project.id, "members"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/members`),
  });

  const currentProjectRole = useMemo(
    () => projectMembers.find((member) => member.id === user?.id)?.projectRole ?? null,
    [projectMembers, user?.id],
  );

  const { data: files = [] } = useQuery({
    queryKey: ["project", project.id, "files"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/files`),
  });

  const tasksView = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        assignee:
          task.assigneeName
            ?.split(" ")
            .map((part: string) => part[0])
            .join("")
            .toUpperCase() || "--",
        assigneeContractorName: task.assigneeContractorName,
      })),
    [tasks],
  );

  const visibleTasks = useMemo(() => {
    let next = tasksView;
    if (isExecutorOnly) {
      next = next.filter(
        (task) => !(task.taskType === "subcontract" && task.approvalStatus !== "approved"),
      );
    }
    if (
      currentRole === "executor" ||
      (currentProjectRole ? ["lead_specialist", "executor"].includes(currentProjectRole) : false)
    ) {
      next = next.filter((task) => !task.assigneeIsAccountant);
    }
    return next;
  }, [tasksView, isExecutorOnly, currentRole, currentProjectRole]);

  const canManageTasks =
    currentRole === "admin" ||
    (currentProjectRole ? ["manager", "lead_specialist"].includes(currentProjectRole) : false);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleEditTask = (task: any) => {
    if (task.sectionId) {
      toast.error("Редактируйте задачу через разделы WBS");
      return;
    }
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleDeletePrompt = (task: any) => {
    if (task.sectionId) {
      toast.error("Удаляйте задачу через удаление раздела WBS");
      return;
    }
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) {
      return;
    }
    try {
      await apiFetch(`/tasks/${taskToDelete.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Задача удалена");
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить задачу");
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const getTasksByStatus = (statusId: string) => {
    return visibleTasks.filter((task) => task.status === statusId);
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailsDialogOpen(true);
  };

  const getTaskFileCount = (taskId: string) => {
    return files.filter((file: any) => file.taskId === taskId).length;
  };

  const canDragTask = (task: any) => {
    if (task.taskType === "subcontract" && task.approvalStatus !== "approved") {
      return false;
    }
    return true;
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>, statusId: string) => {
    event.preventDefault();
    const resolvedTaskId = draggedTaskId || event.dataTransfer.getData("text/plain");
    if (!resolvedTaskId) return;
    const task = tasksView.find((item) => item.id === resolvedTaskId);
    if (!task || task.status === statusId) {
      setDraggedTaskId(null);
      return;
    }

    if (!canDragTask(task)) {
      toast.error("Нет доступа для изменения статуса");
      setDraggedTaskId(null);
      return;
    }

    try {
      await apiFetch(`/tasks/${resolvedTaskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: statusId }),
      });
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "tasks"] });
      toast.success("Статус задачи обновлен");
    } catch (error: any) {
      toast.error(error.message || "Не удалось обновить статус");
    } finally {
      setDraggedTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Канбан-доска</h3>
          <p className="text-sm text-muted-foreground mt-1">Управление задачами проекта</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {taskStatuses.map((status) => (
          <div
            key={status.id}
            className="space-y-3 sm:space-y-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, status.id)}
          >
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${status.color}`} />
              <h4 className="font-semibold text-foreground">{status.name}</h4>
              <Badge variant="secondary" className="ml-auto">
                {getTasksByStatus(status.id).length}
              </Badge>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {getTasksByStatus(status.id).map((task) => {
                const fileCount = getTaskFileCount(task.id);
                const canDrag = canDragTask(task);
                const isPendingSubcontract =
                  task.taskType === "subcontract" && task.approvalStatus === "pending";
                return (
                  <Card
                    key={task.id}
                    draggable={canDrag}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", task.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggedTaskId(task.id);
                    }}
                    onDragEnd={() => setDraggedTaskId(null)}
                    className={`border-2 border-border bg-card p-3 sm:p-4 shadow-soft hover:shadow-medium transition-all cursor-pointer ${
                      canDrag ? "" : "opacity-80"
                    } ${isPendingSubcontract ? "bg-muted/40" : ""}`}
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-sm font-medium text-foreground leading-snug">
                          {task.title}
                        </h5>
                        {canManageTasks && !task.sectionId && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mt-1">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleEditTask(task)}>
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleDeletePrompt(task)}
                                className="text-destructive"
                              >
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {task.taskType === "subcontract" && (
                          <Badge variant="secondary" className="text-xs">
                            Субподряд
                          </Badge>
                        )}
                        {task.taskType === "subcontract" && task.approvalStatus && (
                          <Badge variant="outline" className="text-xs">
                            {approvalLabels[task.approvalStatus] ?? task.approvalStatus}
                          </Badge>
                        )}
                        {task.assigneeIsAccountant && (
                          <Badge variant="secondary" className="text-xs">
                            Бухгалтер
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const scheduleBadge = getTaskScheduleBadge({
                                plannedStartDate: task.plannedStartDate,
                                plannedEndDate: task.plannedEndDate,
                                status: task.status,
                              });
                              return (
                                <Badge variant="outline" className={`text-xs ${scheduleBadge.className}`}>
                                  {scheduleBadge.label}
                                </Badge>
                              );
                            })()}
                            {fileCount > 0 && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <FileText className="h-3 w-3" />
                                {fileCount}
                              </Badge>
                            )}
                          </div>
                          {task.assigneeContractorName && (
                            <Badge variant="outline" className="text-xs leading-none self-start">
                              контрагент
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold text-primary-foreground"
                            title={task.assigneeName || "—"}
                          >
                            {task.assignee}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {task.assigneeName || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {getTasksByStatus(status.id).length === 0 && (
                <div className="border-2 border-dashed border-border/40 rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground">Нет задач</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <TaskDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={(open) => {
          setIsDetailsDialogOpen(open);
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
        taskId={selectedTaskId}
        projectRole={currentProjectRole}
      />

      <EditTaskDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["project", project.id, "tasks"] })}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Задача будет удалена без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask}>Да</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
