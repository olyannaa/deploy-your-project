import { Fragment, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const taskStatuses = [
  { id: "new", name: "Новые", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { id: "in_progress", name: "В работе", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { id: "review", name: "На проверке", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { id: "done", name: "Завершено", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
];

interface TimeEntry {
  taskId: string;
  day: number;
  month: number;
  year: number;
  value: string;
}

type DayOffCode = "b" | "o" | "k" | "v";

interface DayOffEntry {
  day: number;
  month: number;
  year: number;
  value: DayOffCode;
}

const dayOffLabels: Record<DayOffCode, string> = {
  b: "б",
  o: "о",
  k: "к",
  v: "в",
};

const dayOffCycle: (DayOffCode | "")[] = ["", "b", "k", "o", "v"];

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const formatWorkDate = (year: number, month: number, day: number) => {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const getDayOfWeek = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  const days = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  return days[date.getDay()];
};

const isWeekend = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
};

const getWeekNumber = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day);
  const firstDayOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const adjustedDay = day + (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
  return Math.ceil(adjustedDay / 7);
};

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export default function TimeTracking() {
  const { user } = useAuth();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [dayOffEntries, setDayOffEntries] = useState<DayOffEntry[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectTimeTasks, setProjectTimeTasks] = useState<Record<string, string>>({});
  const [taskTab, setTaskTab] = useState<"main" | "subcontract">("main");

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const isEditable = isCurrentMonth;
  const roles = user?.roles || [];
  const isExecutorOnly =
    roles.includes("executor") &&
    !roles.some((role) =>
      ["admin", "gip", "accountant"].includes(role),
    );
  const isAccountantOnly =
    roles.includes("accountant") &&
    !roles.some((role) => ["admin", "gip"].includes(role));
  const isAdminOrGip = roles.some((role) => ["admin", "gip"].includes(role));
  const canChangeTaskStatus = (task: { assigneeId?: string | null }) => {
    if (roles.some((role) => ["admin", "gip"].includes(role))) {
      return true;
    }
    return task.assigneeId === user?.id;
  };
  const canUseProjectTime = roles.some((role) => ["admin", "gip"].includes(role));

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const allDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const weeks = useMemo(() => {
    const weeksMap: { [key: number]: number[] } = {};
    allDays.forEach((day) => {
      const weekNum = getWeekNumber(currentYear, currentMonth, day);
      if (!weeksMap[weekNum]) weeksMap[weekNum] = [];
      weeksMap[weekNum].push(day);
    });
    return weeksMap;
  }, [currentYear, currentMonth, allDays]);

  const weekNumbers = Object.keys(weeks)
    .map(Number)
    .sort((a, b) => a - b);
  const days = viewMode === "week" ? weeks[selectedWeek] || [] : allDays;

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<any[]>("/projects"),
  });

  const { data: tasksData = [] } = useQuery({
    queryKey: ["time-tracking-tasks", user?.id],
    queryFn: () => apiFetch<any[]>("/tasks?forTimeTracking=true"),
    enabled: !!user?.id,
  });

  useEffect(() => {
    const projectTimeMap: Record<string, string> = {};
    const filtered = tasksData.filter((task) => {
      if (task.taskType === "project_time" && task.projectId) {
        projectTimeMap[task.projectId] = task.id;
        return false;
      }
      return true;
    });

    setProjectTimeTasks(projectTimeMap);
    setTasks(
      filtered.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        project: task.projectName || "Вне проекта",
        projectId: task.projectId,
        assigneeId: task.assigneeId ?? null,
        taskType: task.taskType,
        approvalStatus: task.approvalStatus,
      })),
    );
  }, [tasksData]);

  const fromDate = formatWorkDate(currentYear, currentMonth, 1);
  const toDate = formatWorkDate(currentYear, currentMonth, daysInMonth);

  const { data: entriesData = [] } = useQuery({
    queryKey: ["time-entries", user?.id, currentYear, currentMonth],
    queryFn: () =>
      apiFetch<any[]>(
        `/time-tracking/entries?userId=${user?.id}&from=${fromDate}&to=${toDate}`,
      ),
    enabled: !!user?.id,
  });

  const { data: dayOffData = [] } = useQuery({
    queryKey: ["day-offs", user?.id, currentYear, currentMonth],
    queryFn: () =>
      apiFetch<any[]>(
        `/time-tracking/day-offs?userId=${user?.id}&from=${fromDate}&to=${toDate}`,
      ),
    enabled: !!user?.id,
  });

  useEffect(() => {
    setTimeEntries(
      entriesData.map((entry) => {
        const date = new Date(entry.work_date);
        return {
          taskId: entry.task_id,
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          value: String(entry.hours),
        };
      }),
    );
  }, [entriesData]);

  useEffect(() => {
    setDayOffEntries(
      dayOffData.map((entry) => {
        const date = new Date(entry.work_date);
        return {
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          value: entry.type as DayOffCode,
        };
      }),
    );
  }, [dayOffData]);

  const activeTaskList = useMemo(() => {
    if (taskTab === "subcontract") {
      return tasks.filter((task) => task.taskType === "subcontract");
    }
    return tasks.filter((task) => task.taskType !== "subcontract");
  }, [tasks, taskTab]);

  const projectsWithTasks = useMemo(() => {
    const projectMap = new Map<string, { id: string; name: string }>();
    projects.forEach((project) => {
      if (project?.id) {
        projectMap.set(project.id, { id: project.id, name: project.name });
      }
    });

    activeTaskList.forEach((task) => {
      if (task.projectId && !projectMap.has(task.projectId)) {
        projectMap.set(task.projectId, {
          id: task.projectId,
          name: task.project || "Проект",
        });
      }
    });

    const grouped = Array.from(projectMap.values()).map((project) => ({
      ...project,
      tasks: activeTaskList.filter((task) => task.projectId === project.id),
      projectTimeTaskId: projectTimeTasks[project.id] ?? null,
    }));

    const withoutProject = activeTaskList.filter((task) => !task.projectId);
    if (withoutProject.length > 0) {
      grouped.push({
        id: "no-project",
        name: "Вне проекта",
        tasks: withoutProject,
      });
    }

    const shouldHideEmptyProjects =
      isExecutorOnly || isAccountantOnly || (taskTab === "subcontract" && isAdminOrGip);
    if (shouldHideEmptyProjects) {
      return grouped.filter((project) => project.tasks.length > 0);
    }
    return grouped;
  }, [projects, activeTaskList, isExecutorOnly, isAccountantOnly, isAdminOrGip, taskTab, projectTimeTasks]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)),
      );
      toast.success("Статус задачи обновлен");
    } catch (error: any) {
      toast.error(error.message || "Не удалось обновить статус");
    }
  };

  const getStatusInfo = (statusId: string) => {
    return taskStatuses.find((status) => status.id === statusId) || taskStatuses[0];
  };

  const getDayOff = (day: number): DayOffCode | "" => {
    const entry = dayOffEntries.find(
      (e) => e.day === day && e.month === currentMonth && e.year === currentYear,
    );
    return entry?.value || "";
  };

  const getTimeEntry = (taskId: string, day: number): string => {
    const entry = timeEntries.find(
      (e) => e.taskId === taskId && e.day === day && e.month === currentMonth && e.year === currentYear,
    );
    return entry?.value || "";
  };

  const clearDayTimeEntries = async (day: number) => {
    const entriesForDay = timeEntries.filter(
      (entry) => entry.day === day && entry.month === currentMonth && entry.year === currentYear,
    );
    if (entriesForDay.length === 0) {
      return;
    }
    for (const entry of entriesForDay) {
      await updateTimeEntry(entry.taskId, day, "");
    }
  };

  const handleDayOffClick = async (day: number) => {
    if (!isEditable) return;

    const currentDayOff = getDayOff(day);
    const currentIndex = dayOffCycle.indexOf(currentDayOff);
    const nextValue = dayOffCycle[(currentIndex + 1) % dayOffCycle.length];

    if (nextValue === "") {
      if (currentDayOff) {
        await updateDayOffEntry(day, "");
      }
      return;
    }

    await clearDayTimeEntries(day);
    await updateDayOffEntry(day, nextValue as DayOffCode);
  };

  const handleTaskCellClick = async (taskId: string, day: number, _isWeekendDay: boolean) => {
    if (!isEditable) return;

    const currentDayOff = getDayOff(day);
    const currentValue = getTimeEntry(taskId, day);
    const nextValue = currentValue ? "" : "1";

    if (nextValue === "") {
      if (currentValue) {
        await updateTimeEntry(taskId, day, "");
      }
      return;
    }

    if (currentDayOff) {
      await updateDayOffEntry(day, "");
    }

    await updateTimeEntry(taskId, day, nextValue);
  };

  const updateTimeEntry = async (taskId: string, day: number, value: string) => {
    const workDate = formatWorkDate(currentYear, currentMonth, day);
    try {
      await apiFetch(`/time-tracking/entries`, {
        method: "POST",
        body: JSON.stringify({
          userId: user?.id,
          taskId,
          workDate,
          hours: value ? Number(value) : 0,
        }),
      });
      setTimeEntries((prev) => {
        const filtered = prev.filter(
          (entry) =>
            !(
              entry.taskId === taskId &&
              entry.day === day &&
              entry.month === currentMonth &&
              entry.year === currentYear
            ),
        );
        if (value) {
          return [...filtered, { taskId, day, month: currentMonth, year: currentYear, value }];
        }
        return filtered;
      });
      if (value) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId && task.status === "new"
              ? { ...task, status: "in_progress" }
              : task,
          ),
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить трудозатраты");
    }
  };

  const updateDayOffEntry = async (day: number, value: DayOffCode | "") => {
    const workDate = formatWorkDate(currentYear, currentMonth, day);
    try {
      await apiFetch(`/time-tracking/day-offs`, {
        method: "POST",
        body: JSON.stringify({
          userId: user?.id,
          workDate,
          type: value || null,
        }),
      });
      setDayOffEntries((prev) => {
        const filtered = prev.filter(
          (entry) => !(entry.day === day && entry.month === currentMonth && entry.year === currentYear),
        );
        if (value) {
          return [...filtered, { day, month: currentMonth, year: currentYear, value }];
        }
        return filtered;
      });
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить статус дня");
    }
  };

  const parseNumericValue = (rawValue: string) => {
    const normalized = rawValue.replace(",", ".").trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeDayValue = (rawValue: string) => {
    return parseNumericValue(rawValue) > 0 ? 1 : 0;
  };

  const visibleDaysSet = useMemo(() => new Set(days), [days]);

  const visibleTaskIds = useMemo(
    () => new Set(activeTaskList.map((task) => task.id)),
    [activeTaskList],
  );

  const dayTaskMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    timeEntries
      .filter((entry) => entry.month === currentMonth && entry.year === currentYear)
      .forEach((entry) => {
        if (!visibleDaysSet.has(entry.day)) {
          return;
        }
        if (!visibleTaskIds.has(entry.taskId)) {
          return;
        }
        if (normalizeDayValue(entry.value) <= 0) {
          return;
        }
        const dayKey = formatWorkDate(entry.year, entry.month, entry.day);
        const dayTasks = map.get(dayKey) ?? new Set<string>();
        dayTasks.add(entry.taskId);
        map.set(dayKey, dayTasks);
      });
    return map;
  }, [timeEntries, currentMonth, currentYear, visibleDaysSet, visibleTaskIds]);

  const projectTimeTaskIds = useMemo(
    () => new Set(Object.values(projectTimeTasks).filter(Boolean)),
    [projectTimeTasks],
  );

  const projectTimeDayMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    timeEntries
      .filter((entry) => entry.month === currentMonth && entry.year === currentYear)
      .forEach((entry) => {
        if (!visibleDaysSet.has(entry.day)) {
          return;
        }
        if (!projectTimeTaskIds.has(entry.taskId)) {
          return;
        }
        if (normalizeDayValue(entry.value) <= 0) {
          return;
        }
        const dayKey = formatWorkDate(entry.year, entry.month, entry.day);
        const dayTasks = map.get(dayKey) ?? new Set<string>();
        dayTasks.add(entry.taskId);
        map.set(dayKey, dayTasks);
      });
    return map;
  }, [timeEntries, currentMonth, currentYear, visibleDaysSet, projectTimeTaskIds]);

  const totalTaskIds = useMemo(() => {
    const ids = new Set(tasks.map((task) => task.id));
    if (canUseProjectTime) {
      projectTimeTaskIds.forEach((id) => ids.add(id));
    }
    return ids;
  }, [tasks, canUseProjectTime, projectTimeTaskIds]);

  const dayAnyEntrySet = useMemo(() => {
    const set = new Set<string>();
    timeEntries
      .filter((entry) => entry.month === currentMonth && entry.year === currentYear)
      .forEach((entry) => {
        if (!visibleDaysSet.has(entry.day)) {
          return;
        }
        if (!totalTaskIds.has(entry.taskId)) {
          return;
        }
        if (normalizeDayValue(entry.value) <= 0) {
          return;
        }
        const dayKey = formatWorkDate(entry.year, entry.month, entry.day);
        set.add(dayKey);
      });
    return set;
  }, [timeEntries, currentMonth, currentYear, visibleDaysSet, totalTaskIds]);

  const calculateTotalDays = (taskId: string): number => {
    let total = 0;
    dayTaskMap.forEach((tasks) => {
      if (tasks.size === 0) {
        return;
      }
      if (tasks.has(taskId)) {
        total += 1 / tasks.size;
      }
    });
    return total;
  };

  const calculateProjectRowDays = (taskId: string | null): number => {
    if (!taskId) {
      return 0;
    }
    let total = 0;
    projectTimeDayMap.forEach((tasks) => {
      if (tasks.size === 0) {
        return;
      }
      if (tasks.has(taskId)) {
        total += 1 / tasks.size;
      }
    });
    return total;
  };

  const calculateGrandTotal = (): number => {
    return dayAnyEntrySet.size;
  };

  const formatDayShare = (value: number) => {
    if (!value) return "";
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2).replace(/\.?0+$/, "");
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedWeek(1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedWeek(1);
  };

  const getCellStyle = (value: string, isWeekendDay: boolean) => {
    const baseStyle = isEditable ? "cursor-pointer hover:bg-muted/50" : "cursor-default";

    if (isWeekendDay && !value) {
      return `bg-muted/30 ${baseStyle}`;
    }
    if (value === "b") return `bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 ${baseStyle}`;
    if (value === "k") return `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ${baseStyle}`;
    if (value === "o") return `bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ${baseStyle}`;
    if (value === "v") return `bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ${baseStyle}`;

    const numericValue = parseNumericValue(value);
    if (numericValue > 0) {
      return `bg-primary/10 text-primary font-medium ${baseStyle}`;
    }

    return baseStyle;
  };

  const getDisplayValue = (value: string) => {
    const normalizedValue = normalizeDayValue(value);
    if (normalizedValue > 0) {
      return "+";
    }
    return value;
  };

  return (
    <div className="flex flex-col gap-4 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">Учет рабочего времени</h1>
          <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Табель учета времени</span>
            {!isEditable && <Badge variant="secondary" className="text-xs">Только просмотр</Badge>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[150px] text-center font-medium">
            {monthNames[currentMonth]} {currentYear}
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "month" | "week")} className="shrink-0">
          <TabsList className="h-9">
            <TabsTrigger value="month" className="gap-1.5 px-4">
              <Calendar className="h-4 w-4" />
              Месяц
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5 px-4">
              <CalendarDays className="h-4 w-4" />
              Неделя
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={taskTab} onValueChange={(value) => setTaskTab(value as "main" | "subcontract")} className="shrink-0">
          <TabsList className="h-9">
            <TabsTrigger value="main" className="px-4">Основные</TabsTrigger>
            <TabsTrigger value="subcontract" className="px-4">Субподряд</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === "week" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Неделя:</span>
            <div className="flex gap-1">
              {weekNumbers.map((weekNum) => (
                <Button
                  key={weekNum}
                  variant={selectedWeek === weekNum ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setSelectedWeek(weekNum)}
                >
                  {weekNum}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Card className="p-3 shrink-0">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-primary font-medium text-[10px]">+</div>
            <span>День</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-700 dark:text-yellow-300 font-medium text-[10px]">б</div>
            <span>Болезнь</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-[10px]">к</div>
            <span>Командировка</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-300 font-medium text-[10px]">о</div>
            <span>Отпуск</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-muted/30 flex items-center justify-center text-muted-foreground font-medium text-[10px]">в</div>
            <span>Выходной</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          “+” ставится в строках задач/проекта, статусы б/к/о/в — кликом по дате в шапке.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
          <Table className="text-xs min-w-max md:min-w-full">
            <TableHeader className="sticky top-0 z-30">
              <TableRow className="bg-muted">
                <TableHead className="min-w-[180px] w-[180px] border-r p-2 bg-muted md:sticky md:left-0 md:z-40">
                  Проект
                </TableHead>
                <TableHead className="min-w-[250px] border-r p-2 bg-muted md:sticky md:left-[180px] md:z-40">
                  Задача
                </TableHead>
                <TableHead className="min-w-[160px] w-[160px] border-r p-2 bg-muted md:sticky md:left-[430px] md:z-40">
                  Статус
                </TableHead>
                <TableHead className="text-center min-w-[50px] border-r p-2 bg-muted">Дней</TableHead>
                {days.map((day) => {
                  const dayOff = getDayOff(day);
                  const isWeekendDay = isWeekend(currentYear, currentMonth, day);
                  return (
                    <TableHead
                      key={day}
                      onClick={() => handleDayOffClick(day)}
                      className={`text-center min-w-[36px] w-[36px] px-1 py-2 ${
                        isWeekendDay ? "bg-muted/70" : ""
                      } ${isEditable ? "cursor-pointer hover:bg-muted/60" : ""}`}
                    >
                      <div className="flex flex-col items-center text-xs">
                        <span className="font-normal text-muted-foreground">
                          {getDayOfWeek(currentYear, currentMonth, day)}
                        </span>
                        <span className="font-medium">{day}</span>
                        {dayOff ? (
                          <span
                            className={`text-[10px] font-medium ${
                              dayOff === "b"
                                ? "text-yellow-700 dark:text-yellow-300"
                                : dayOff === "k"
                                  ? "text-blue-700 dark:text-blue-300"
                                  : dayOff === "o"
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-purple-700 dark:text-purple-300"
                            }`}
                          >
                            {dayOffLabels[dayOff]}
                          </span>
                        ) : isWeekendDay ? (
                          <span className="text-[10px] text-muted-foreground">
                            {dayOffLabels.v}
                          </span>
                        ) : (
                          <span className="text-[10px] text-transparent">•</span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsWithTasks.map((project, projectIndex) => (
                <Fragment key={project.id}>
                  <TableRow key={`project-${project.id}`} className="bg-muted/50">
                    <TableCell
                      className="bg-muted font-medium border-r p-2 md:sticky md:left-0 md:z-10"
                      rowSpan={project.tasks.length + 1}
                    >
                      <span className="line-clamp-2">
                        {projectIndex + 1}. {project.name}
                      </span>
                    </TableCell>
                    <TableCell className="bg-muted border-r p-2 md:sticky md:left-[180px] md:z-10"></TableCell>
                    <TableCell className="bg-muted border-r p-2 md:sticky md:left-[430px] md:z-10"></TableCell>
                    <TableCell className="text-center border-r p-2">
                      {canUseProjectTime && project.tasks.length === 0
                        ? formatDayShare(calculateProjectRowDays(project.projectTimeTaskId ?? null))
                        : ""}
                    </TableCell>
                    {days.map((day) => {
                      const projectTimeTaskId = project.projectTimeTaskId;
                      const dayOff = getDayOff(day);
                      const isWeekendDay = isWeekend(currentYear, currentMonth, day);
                      const entryValue = projectTimeTaskId
                        ? getTimeEntry(projectTimeTaskId, day)
                        : "";
                      const styleValue = dayOff || entryValue;
                      const canClick = Boolean(canUseProjectTime && projectTimeTaskId);

                      return (
                        <TableCell
                          key={day}
                          className={`text-center px-0.5 py-1 ${
                            isWeekendDay ? "bg-muted/50" : "bg-muted/30"
                          } ${isEditable && canClick ? "cursor-pointer hover:bg-muted/70" : ""}`}
                          onClick={() =>
                            isEditable && canClick
                              ? handleTaskCellClick(projectTimeTaskId, day, isWeekendDay)
                              : undefined
                          }
                        >
                          {dayOff ? (
                            <span
                              className={`text-[10px] font-medium ${
                                dayOff === "b"
                                  ? "text-yellow-700 dark:text-yellow-300"
                                  : dayOff === "k"
                                    ? "text-blue-700 dark:text-blue-300"
                                    : dayOff === "o"
                                      ? "text-green-700 dark:text-green-300"
                                      : "text-purple-700 dark:text-purple-300"
                              }`}
                            >
                              {dayOffLabels[dayOff]}
                            </span>
                          ) : isWeekendDay && !entryValue ? (
                            <span className="text-muted-foreground text-[10px]">{dayOffLabels.v}</span>
                          ) : (
                            getDisplayValue(entryValue)
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {project.tasks.map((task) => {
                    const statusInfo = getStatusInfo(task.status);
                    return (
                      <TableRow key={`task-${task.id}`}>
                        <TableCell className="bg-muted border-r p-2 md:sticky md:left-[180px] md:z-10">
                          <span className="line-clamp-2">{task.title}</span>
                        </TableCell>
                        <TableCell className="bg-muted border-r p-2 md:sticky md:left-[430px] md:z-10">
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatusChange(task.id, value)}
                            disabled={!canChangeTaskStatus(task)}
                          >
                            <SelectTrigger
                              className={`h-7 text-[11px] leading-tight border-0 whitespace-normal ${statusInfo.color}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {taskStatuses.map((status) => (
                                <SelectItem key={status.id} value={status.id} className="text-sm">
                                  {status.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center font-medium border-r p-2">
                          {formatDayShare(calculateTotalDays(task.id))}
                        </TableCell>
                        {days.map((day) => {
                          const isWeekendDay = isWeekend(currentYear, currentMonth, day);
                          const dayOff = getDayOff(day);
                          const value = getTimeEntry(task.id, day);
                          const styleValue = dayOff || value;

                          return (
                            <TableCell
                              key={day}
                              className={`text-center px-0.5 py-1 text-[10px] ${getCellStyle(styleValue, isWeekendDay)}`}
                              onClick={() => handleTaskCellClick(task.id, day, isWeekendDay)}
                            >
                              {dayOff ? (
                                <span
                                  className={`font-medium ${
                                    dayOff === "b"
                                      ? "text-yellow-700 dark:text-yellow-300"
                                      : dayOff === "k"
                                        ? "text-blue-700 dark:text-blue-300"
                                        : dayOff === "o"
                                          ? "text-green-700 dark:text-green-300"
                                          : "text-purple-700 dark:text-purple-300"
                                  }`}
                                >
                                  {dayOffLabels[dayOff]}
                                </span>
                              ) : isWeekendDay && !value ? (
                                <span className="text-muted-foreground">{dayOffLabels.v}</span>
                              ) : (
                                getDisplayValue(value)
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
              <TableRow className="bg-muted font-medium">
                <TableCell className="bg-muted border-r p-2 md:sticky md:left-0 md:z-10"></TableCell>
                <TableCell className="bg-muted text-right border-r p-2 md:sticky md:left-[180px] md:z-10">
                  Итого:
                </TableCell>
                <TableCell className="bg-muted border-r p-2 md:sticky md:left-[430px] md:z-10"></TableCell>
                <TableCell className="text-center border-r font-bold p-2">
                  {calculateGrandTotal() || ""}
                </TableCell>
                {days.map((day) => (
                  <TableCell
                    key={day}
                    className={`text-center px-0.5 py-1 ${
                      isWeekend(currentYear, currentMonth, day) ? "bg-muted/70" : ""
                    }`}
                  ></TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
