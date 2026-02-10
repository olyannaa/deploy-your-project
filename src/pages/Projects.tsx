import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react";
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
import CreateProjectDialog from "@/components/project/CreateProjectDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const projectColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-emerald-500 to-emerald-600",
  "from-pink-500 to-pink-600",
  "from-amber-500 to-amber-600",
];

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.primaryDepartmentId) {
      setDepartmentFilter((current) =>
        current === "all" ? user.primaryDepartmentId : current,
      );
    } else {
      setDepartmentFilter("all");
    }
  }, [user?.id, user?.primaryDepartmentId]);

  const formatShortDate = (value?: string | null) =>
    value
      ? new Date(value).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
      : "";
  const hideArchivedForRole = currentRole === "executor" || currentRole === "gip";
  const firstOfCurrentMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const parseProjectEndDate = (value?: string | null) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [year, month, day] = value.slice(0, 10).split("-");
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const shouldHideArchived = (project: any) => {
    if (!hideArchivedForRole || project.status !== "archived") {
      return false;
    }
    const endValue = project.endDate ?? project.end_date ?? null;
    const endDate = parseProjectEndDate(endValue);
    if (!endDate) {
      return false;
    }
    return endDate < firstOfCurrentMonth;
  };

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<any[]>("/departments"),
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", departmentFilter],
    queryFn: () => {
      const query = departmentFilter !== "all" ? `?departmentId=${departmentFilter}` : "";
      return apiFetch<any[]>(`/projects${query}`);
    },
  });

  const projectsWithColors = useMemo(
    () =>
      projects.map((project, index) => ({
        ...project,
        color: projectColors[index % projectColors.length],
      })),
    [projects],
  );

  const visibleProjects = projectsWithColors.filter((project) => !shouldHideArchived(project));

  const filteredProjects = visibleProjects.filter((project) => {
    const description = project.description ?? "";
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || project.departmentId === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const totalTasks = visibleProjects.reduce((sum, project) => sum + (project.tasks?.total || 0), 0);
  const completedTasks = visibleProjects.reduce((sum, project) => sum + (project.tasks?.completed || 0), 0);
  const activeProjects = visibleProjects.filter((project) => project.status === "active").length;

  const handleArchiveProject = async (projectId: string) => {
    try {
      await apiFetch(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Проект архивирован");
    } catch (error: any) {
      toast.error(error.message || "Не удалось архивировать проект");
    }
  };

  const handleCompleteProject = async (projectId: string) => {
    try {
      await apiFetch(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Проект завершен");
    } catch (error: any) {
      toast.error(error.message || "Не удалось завершить проект");
    }
  };

  const handleRestoreCompletedProject = async (projectId: string) => {
    try {
      await apiFetch(`/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Проект возвращен из завершенных");
    } catch (error: any) {
      toast.error(error.message || "Не удалось вернуть проект");
    }
  };

  const handleRestoreProject = async (projectId: string) => {
    try {
      await apiFetch(`/projects/${projectId}/restore`, {
        method: "POST",
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Проект восстановлен из архива");
    } catch (error: any) {
      toast.error(error.message || "Не удалось восстановить проект");
    }
  };

  const openDeleteDialog = (project: { id: string; name: string }) => {
    setDeleteTarget(project);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await apiFetch(`/projects/${deleteTarget.id}`, {
        method: "DELETE",
      });
      queryClient.setQueryData<any[]>(["projects"], (current) =>
        (current || []).filter((project) => project.id !== deleteTarget.id),
      );
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Проект удален из списка");
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить проект");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-border bg-card shadow-soft p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Всего проектов</p>
              <p className="text-3xl font-bold text-foreground mt-1">{visibleProjects.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="border-2 border-border bg-card shadow-soft p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Активные проекты</p>
              <p className="text-3xl font-bold text-foreground mt-1">{activeProjects}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <TrendingUp className="h-6 w-6 text-accent" />
            </div>
          </div>
        </Card>
        <Card className="border-2 border-border bg-card shadow-soft p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Выполнено задач</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {completedTasks}/{totalTasks}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Проекты</h1>
          <p className="text-muted-foreground mt-1">Управление и отслеживание всех проектов</p>
        </div>
        {(currentRole === "admin" || currentRole === "gip") && (
          <Button className="gap-2 shadow-soft w-full sm:w-auto" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Новый проект
          </Button>
        )}
      </div>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(projectId) => {
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          navigate(`/projects/${projectId}`);
        }}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск проектов..."
            className="pl-10"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Подразделение" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все подразделения</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            className="flex-1 sm:flex-none"
          >
            Все
          </Button>

          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            onClick={() => setStatusFilter("active")}
            className="flex-1 sm:flex-none"
          >
            Активные
          </Button>

          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            onClick={() => setStatusFilter("completed")}
            className="flex-1 sm:flex-none"
          >
            Завершенные
          </Button>

          <Button
            variant={statusFilter === "archived" ? "default" : "outline"}
            onClick={() => setStatusFilter("archived")}
            className="flex-1 sm:flex-none"
          >
            Архив
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            className="group relative overflow-hidden border-2 border-border bg-card shadow-soft transition-all hover:shadow-medium cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <div className={`h-2 bg-gradient-to-r ${project.color}`} />

            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {project.description}
                  </p>
                  {project.departmentName && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {project.departmentName}
                    </Badge>
                  )}
                </div>
                {currentRole === "admin" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      {project.status === "active" && (
                        <>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleArchiveProject(project.id);
                            }}
                          >
                            Архивировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleCompleteProject(project.id);
                            }}
                          >
                            Завершить
                          </DropdownMenuItem>
                        </>
                      )}
                      {project.status === "completed" && (
                        <>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleArchiveProject(project.id);
                            }}
                          >
                            Архивировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRestoreCompletedProject(project.id);
                            }}
                          >
                            Вернуть из завершенных
                          </DropdownMenuItem>
                        </>
                      )}
                      {project.status === "archived" && (
                        <>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRestoreProject(project.id);
                            }}
                          >
                            Вернуть из архива
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleCompleteProject(project.id);
                            }}
                          >
                            Завершить
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openDeleteDialog({ id: project.id, name: project.name });
                            }}
                          >
                            Удалить
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="mb-4">
                <Badge
                  variant={project.status === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {project.status === "active"
                    ? "Активен"
                    : project.status === "completed"
                      ? "Завершен"
                      : "Архив"}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Прогресс</span>
                  <span className="font-medium text-foreground">{project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${project.color} transition-all`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{project.team}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {project.tasks.completed}/{project.tasks.total}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatShortDate(project.endDate)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
            <AlertDialogDescription>
              Проект удалится из системы полностью.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject}>Да</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
