import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import TaskDetailsDialog from "@/components/tasks/TaskDetailsDialog";

interface Project {
  id: string;
}

interface ProjectGanttProps {
  project: Project;
}

type TimeScale = "days" | "weeks" | "months";

type GanttTask = {
  id: string;
  taskId?: string | null;
  name: string;
  start: Date | null;
  end: Date | null;
  responsible: string;
  status?: string;
};

export default function ProjectGantt({ project }: ProjectGanttProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>("days");
  const [activeTab, setActiveTab] = useState<"plan" | "fact">("plan");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const { currentRole } = useRole();
  const { user } = useAuth();
  const isReadOnly = currentRole === "executor" || currentRole === "accountant";

  const { data: sections = [] } = useQuery({
    queryKey: ["project", project.id, "sections"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/sections`),
  });

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

  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const [datePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const startOfWeek = (date: Date) => {
    const weekday = date.getDay();
    const shift = (weekday + 6) % 7;
    const result = new Date(date);
    result.setDate(result.getDate() - shift);
    return startOfDay(result);
  };

  const endOfWeek = (date: Date) => {
    const start = startOfWeek(date);
    const result = new Date(start);
    result.setDate(result.getDate() + 6);
    return result;
  };

  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const today = useMemo(() => startOfDay(new Date()), []);

  const planTasks = useMemo<GanttTask[]>(
    () =>
      sections.map((section) => {
        let start = parseDate(section.startDate || section.plannedEndDate) ?? null;
        let end = parseDate(section.plannedEndDate || section.startDate) ?? null;
        if (start && end && end < start) {
          [start, end] = [end, start];
        }
        return {
          id: section.id,
          name: section.sectionName,
          start,
          end,
          responsible: section.executorName || "",
        };
      }),
    [sections],
  );

  const sectionTaskMap = useMemo(() => {
    const map = new Map<string, any>();
    tasks
      .filter((task) => task.taskType === "project" && task.sectionId)
      .forEach((task) => {
        if (!map.has(task.sectionId)) {
          map.set(task.sectionId, task);
        }
      });
    return map;
  }, [tasks]);

  const factTasks = useMemo<GanttTask[]>(
    () =>
      sections.map((section) => {
        const task = sectionTaskMap.get(section.id);
        const actualStart = parseDate(task?.actualStartDate);
        const actualEnd = parseDate(task?.actualEndDate);
        let start = actualStart ?? actualEnd ?? null;
        let end = actualEnd ?? null;
        if (start && !end && task?.status !== "done") {
          end = today;
        }
        if (start && end && end < start) {
          [start, end] = [end, start];
        }
        return {
          id: section.id,
          taskId: task?.id ?? null,
          name: section.sectionName,
          start,
          end,
          status: task?.status ?? "new",
          responsible: task?.assigneeName || section.executorName || "",
        };
      }),
    [sections, sectionTaskMap, today],
  );

  const currentTasks = activeTab === "plan" ? planTasks : factTasks;

  const handleTaskClick = (taskId: string | null) => {
    if (!taskId) return;
    setSelectedTaskId(taskId);
    setIsTaskDialogOpen(true);
  };

  const { chartStart, chartEnd } = useMemo(() => {
    const dates = currentTasks
      .flatMap((task) => [task.start, task.end])
      .filter((value): value is Date => value instanceof Date);

    if (dates.length === 0) {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return { chartStart: start, chartEnd: end };
    }

    const minDate = new Date(Math.min(...dates.map((date) => date.getTime())));
    const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));
    return { chartStart: startOfDay(minDate), chartEnd: startOfDay(maxDate) };
  }, [currentTasks, today]);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (timeScale === "weeks") {
      return { rangeStart: startOfWeek(chartStart), rangeEnd: endOfWeek(chartEnd) };
    }
    if (timeScale === "months") {
      return { rangeStart: startOfMonth(chartStart), rangeEnd: endOfMonth(chartEnd) };
    }
    return { rangeStart: chartStart, rangeEnd: chartEnd };
  }, [chartStart, chartEnd, timeScale]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Завершено</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">В работе</Badge>;
      case "review":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">На проверке</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20">Новые</Badge>;
    }
  };

  const generateTimeColumns = () => {
    const columns: { label: string; date: Date }[] = [];
    const current = new Date(rangeStart);

    while (current <= rangeEnd) {
      if (timeScale === "days") {
        columns.push({
          label: `${current.getDate()}.${current.getMonth() + 1}`,
          date: new Date(current),
        });
        current.setDate(current.getDate() + 1);
      } else if (timeScale === "weeks") {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        columns.push({
          label: `${weekStart.getDate()}.${weekStart.getMonth() + 1} - ${weekEnd.getDate()}.${weekEnd.getMonth() + 1}`,
          date: new Date(current),
        });
        current.setDate(current.getDate() + 7);
      } else {
        columns.push({
          label: current.toLocaleDateString("ru-RU", { month: "short", year: "numeric" }),
          date: new Date(current),
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    return columns;
  };

  const timeColumns = generateTimeColumns();
  const columnMinWidth = timeScale === "days" ? 60 : 120;
  const timelineColumnsStyle = useMemo(() => {
    if (timeScale === "days") {
      return {
        gridTemplateColumns: `repeat(${timeColumns.length}, ${columnMinWidth}px)`,
      };
    }
    return {
      gridTemplateColumns: `repeat(${timeColumns.length}, minmax(${columnMinWidth}px, 1fr))`,
      minWidth: "100%",
    };
  }, [timeColumns.length, columnMinWidth, timeScale]);

  const getTaskBarMetrics = (task: { start: Date | null; end: Date | null }) => {
    if (!task.start || !task.end) {
      return null;
    }
    const totalColumns = Math.max(1, timeColumns.length);
    const resolveIndex = (target: Date) => {
      let index = 0;
      timeColumns.forEach((column, idx) => {
        if (target >= column.date) {
          index = idx;
        }
      });
      return index;
    };

    const startIndex = resolveIndex(task.start);
    const endIndex = resolveIndex(task.end);
    const safeStart = Math.max(0, Math.min(startIndex, totalColumns - 1));
    const safeEnd = Math.max(safeStart, Math.min(endIndex, totalColumns - 1));

    const leftPercent = (safeStart / totalColumns) * 100;
    const widthPercent = ((safeEnd - safeStart + 1) / totalColumns) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      widthPercent,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-emerald-500";
      case "in_progress":
        return "bg-blue-500";
      case "review":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  const factStatusLegend = [
    { id: "new", label: "Новые", color: "bg-gray-500" },
    { id: "in_progress", label: "В работе", color: "bg-blue-500" },
    { id: "review", label: "На проверке", color: "bg-amber-500" },
    { id: "done", label: "Завершено", color: "bg-emerald-500" },
  ];

  const getBorderClass = () => {
    switch (timeScale) {
      case "days":
        return "border-r border-border/30";
      case "weeks":
        return "border-r-2 border-border";
      case "months":
        return "border-r-2 border-primary/30";
      default:
        return "border-r border-border/30";
    }
  };

  const getPlanBarColor = () => "bg-primary";

  return (
    <Card className="border-2 border-border bg-card p-3 sm:p-4 md:p-6 shadow-soft">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Диаграмма Ганта</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeScale === "days" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeScale("days")}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            Дни
          </Button>
          <Button
            variant={timeScale === "weeks" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeScale("weeks")}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            Недели
          </Button>
          <Button
            variant={timeScale === "months" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeScale("months")}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            Месяцы
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "plan" | "fact")} className="mb-4">
        <TabsList className="grid w-full max-w-[300px] grid-cols-2">
          <TabsTrigger value="plan">План</TabsTrigger>
          <TabsTrigger value="fact">Факт</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Плановые сроки из таблицы разделов проекта (Дата выдачи задания / начало работы — Планируемый срок завершения работ)
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            {factStatusLegend.map((status) => (
              <div key={status.id} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status.color}`} />
                <span className="text-muted-foreground">{status.label}</span>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="fact" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Фактические сроки на основании статуса задач из канбан-доски
          </p>
          <div className="flex flex-wrap gap-3 text-xs">
            {factStatusLegend.map((status) => (
              <div key={status.id} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${status.color}`} />
                <span className="text-muted-foreground">{status.label}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="w-full overflow-x-auto overflow-y-hidden">
        <div className="w-max min-w-full">
          <div className="grid grid-cols-[200px_120px_1fr] sm:grid-cols-[250px_130px_1fr] lg:grid-cols-[300px_150px_1fr] gap-0 border-b-2 border-border mb-2 sticky top-0 bg-card z-10">
            <div className="p-2 sm:p-3 font-semibold text-xs sm:text-sm text-foreground border-r-2 border-border bg-card">
              Задача
            </div>
            <div className="p-2 sm:p-3 font-semibold text-xs sm:text-sm text-foreground border-r-2 border-border bg-card">
              Исполнитель
            </div>
            <div className="p-2 sm:p-3 font-semibold text-xs sm:text-sm text-foreground bg-card">
              <div className="grid w-full" style={timelineColumnsStyle}>
                {timeColumns.map((col, idx) => (
                  <div key={idx} className={`text-center ${getBorderClass()} last:border-r-0 text-xs sm:text-sm`}>
                    {col.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-0">
            {currentTasks.map((task) => {
              const clickable = activeTab === "fact" && Boolean(task.taskId);
              const metrics = getTaskBarMetrics(task);
              const barStyle = metrics ? { left: metrics.left, width: metrics.width } : undefined;
              const showFactBadge = activeTab === "fact" && metrics && metrics.widthPercent >= 12;
              return (
              <div
                key={task.id}
                className={`grid grid-cols-[200px_120px_1fr] sm:grid-cols-[250px_130px_1fr] lg:grid-cols-[300px_150px_1fr] gap-0 border-b border-border/40 hover:bg-muted/30 transition-colors ${clickable ? "cursor-pointer" : ""}`}
                onClick={() => handleTaskClick(clickable ? task.taskId ?? null : null)}
              >
                <div className="p-2 sm:p-3 border-r border-border/40 flex items-center gap-2 min-w-0">
                  <span className="text-xs sm:text-sm text-foreground truncate">{task.name}</span>
                </div>
                <div className="p-2 sm:p-3 border-r border-border/40 flex items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">{task.responsible || "—"}</span>
                </div>
                <div className="p-2 sm:p-3 relative">
                  <div className="h-6 sm:h-8 grid w-full" style={timelineColumnsStyle}>
                    {timeColumns.map((_, idx) => (
                      <div key={idx} className={`${getBorderClass()} last:border-r-0`} />
                    ))}
                  </div>
                  {metrics && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 h-5 sm:h-6 rounded-md ${activeTab === "plan" ? getPlanBarColor() : getStatusColor(task.status || "pending")} ${!isReadOnly ? "cursor-move" : "cursor-default"} flex items-center justify-center text-white text-[10px] sm:text-xs font-medium shadow-sm hover:shadow-md transition-shadow px-1 overflow-hidden`}
                      style={barStyle}
                      draggable={!isReadOnly}
                    >
                      {showFactBadge && (
                        <span className="hidden sm:inline">{getStatusBadge(task.status || "pending")}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )})}

            {currentTasks.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">Нет данных для отображения</div>
            )}
          </div>
        </div>
      </div>

      <TaskDetailsDialog
        open={isTaskDialogOpen}
        onOpenChange={(open) => {
          setIsTaskDialogOpen(open);
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
        taskId={selectedTaskId}
        projectRole={currentProjectRole}
      />
    </Card>
  );
}

