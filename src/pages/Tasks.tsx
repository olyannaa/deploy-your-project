import { useMemo, useState, type DragEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";
import EditTaskDialog from "@/components/tasks/EditTaskDialog";
import TaskDetailsDialog from "@/components/tasks/TaskDetailsDialog";
import { getTaskScheduleBadge } from "@/lib/taskSchedule";

const taskStatuses = [
  { id: "new", name: "Новые", color: "bg-slate-500" },
  { id: "in_progress", name: "В работе", color: "bg-blue-500" },
  { id: "review", name: "На проверке", color: "bg-yellow-500" },
  { id: "done", name: "Завершено", color: "bg-green-500" },
];

const taskTypeOptions = [
  { id: "all", label: "Все типы" },
  { id: "project", label: "Проектные" },
  { id: "personal", label: "Личные" },
  { id: "accounting", label: "Бухгалтерские" },
  { id: "subcontract", label: "Субподряд" },
];

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

export default function Tasks() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedTaskType, setSelectedTaskType] = useState<string>("all");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const isExecutorOnly =
    roles.includes("executor") &&
    !roles.some((role) => ["admin", "gip", "accountant"].includes(role));

  const shouldFilterByAssignee = roles.includes("admin") || roles.includes("gip");
  const canManageTasks = roles.some((role) =>
    ["admin", "gip"].includes(role),
  );

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", user?.id, selectedProject, selectedTaskType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedProject !== "all" && selectedProject !== "none") {
        params.set("projectId", selectedProject);
      }
      if (selectedTaskType !== "all") {
        params.set("taskType", selectedTaskType);
      }
      if (shouldFilterByAssignee && user?.id) {
        params.set("assigneeId", user.id);
      }
      const query = params.toString();
      return apiFetch<any[]>(query ? `/tasks?${query}` : "/tasks");
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: () => apiFetch<any[]>("/projects"),
  });

  const filteredTasks = useMemo(() => {
    let next = tasks;
    if (selectedProject === "none") {
      next = next.filter((task) => !task.projectId);
    }
    if (isExecutorOnly) {
      next = next.filter(
        (task) => !(task.taskType === "subcontract" && task.approvalStatus !== "approved"),
      );
    }
    return next;
  }, [tasks, selectedProject, isExecutorOnly]);

  const tasksView = useMemo(
    () =>
      filteredTasks.map((task) => ({
        ...task,
        assignee:
          task.assigneeName
            ?.split(" ")
            .map((part: string) => part[0])
            .join("")
            .toUpperCase() || "--",
        project: task.projectName || "Вне проекта",
        assigneeContractorName: task.assigneeContractorName,
      })),
    [filteredTasks],
  );

  const getTasksByStatus = (statusId: string) => {
    return tasksView.filter((task) => task.status === statusId);
  };

  const canDragTask = (task: any) => {
    if (task.taskType === "subcontract" && task.approvalStatus !== "approved") {
      return false;
    }
    return true;
  };

  const canCreateTask = roles.length > 0;
  const tasksTitle = roles.includes("accountant") ? "Задачи бухгалтера" : "Мои задачи";

  const handleEditTask = (task: any) => {
    if (task.sectionId) {
      toast.error("Редактируйте задачу через разделы WBS");
      return;
    }
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailsDialogOpen(true);
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Задача удалена");
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить задачу");
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
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
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Статус задачи обновлен");
    } catch (error: any) {
      toast.error(error.message || "Не удалось обновить статус");
    } finally {
      setDraggedTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{tasksTitle}</h1>
          <p className="text-muted-foreground mt-1">Канбан-доска для управления задачами</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все проекты</SelectItem>
              <SelectItem value="none">Вне проекта</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Тип задачи" />
            </SelectTrigger>
            <SelectContent>
              {taskTypeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="gap-2 shadow-soft"
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={!canCreateTask}
          >
            <Plus className="h-4 w-4" />
            Новая задача
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {taskStatuses.map((status) => (
          <div
            key={status.id}
            className="space-y-4"
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

            <div className="space-y-3">
              {getTasksByStatus(status.id).map((task) => (
                <Card
                  key={task.id}
                  draggable={canDragTask(task)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", task.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedTaskId(task.id);
                  }}
                  onDragEnd={() => setDraggedTaskId(null)}
                  className={`border-border/40 bg-card p-4 shadow-soft hover:shadow-medium transition-all cursor-pointer ${
                    task.taskType === "subcontract" && task.approvalStatus === "pending" ? "bg-muted/40" : ""
                  }`}
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-sm font-medium text-foreground leading-snug">{task.title}</h5>
                      {canManageTasks && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 -mt-1"
                              onClick={(event) => event.stopPropagation()}
                            >
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
                      {task.taskType && (
                        <Badge variant="secondary" className="text-xs">
                          {taskTypeLabels[task.taskType] ?? task.taskType}
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

                    <div className="flex items-end justify-between text-xs gap-3">
                      <div className="flex flex-col gap-1">
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
                          {task.assigneeContractorName && (
                            <Badge variant="outline" className="text-xs leading-none self-start">
                              контрагент
                            </Badge>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {task.assignee}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground border-t border-border pt-2">
                      {task.project}
                    </div>
                  </div>
                </Card>
              ))}

              {getTasksByStatus(status.id).length === 0 && (
                <Card className="border-border/40 bg-muted/30 p-8">
                  <p className="text-center text-sm text-muted-foreground">Нет задач</p>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        projectId={selectedProject !== "all" && selectedProject !== "none" ? selectedProject : undefined}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
      />

      <EditTaskDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        task={editingTask}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
      />

      <TaskDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={(open) => {
          setIsDetailsDialogOpen(open);
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
        taskId={selectedTaskId}
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
