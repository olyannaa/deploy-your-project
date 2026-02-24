import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, AlertTriangle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getMissedIncomeNotifications } from "@/pages/Finance";

export default function NotificationBell() {
  const { user } = useAuth();
  const isAccountant = user?.roles?.includes("accountant");
  const isGip = user?.roles?.includes("gip");
  const isAdmin = user?.roles?.includes("admin");
  const showMissedIncomes = isAccountant || isGip || isAdmin;

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => apiFetch("/tasks"),
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/projects"),
  });

  // Task notifications
  const taskNotifications = useMemo(() => {
    return allTasks
      .filter(
        (t: any) =>
          t.taskType === "accounting" &&
          t.assigneeId === user.id &&
          (t.status === "new" || t.status === "in_progress"),
      )
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        project: t.projectName || "Без проекта",
        status: t.status,
        date: t.plannedStartDate,
        type: "task" as const,
      }));
  }, [allTasks, user.id]);

  // Missed income notifications
  const missedIncomeNotifications = useMemo(() => {
    if (!showMissedIncomes || projects.length === 0) return [];
    const activeProjects = projects
      .filter((p: any) => p.status === "active" || p.status === "completed")
      .map((p: any) => ({ id: p.id, name: p.name }));
    return getMissedIncomeNotifications(activeProjects);
  }, [projects, showMissedIncomes]);

  const newTaskCount = taskNotifications.filter((n) => n.status === "new").length;
  const totalCount = newTaskCount + missedIncomeNotifications.length;

  const statusLabels: Record<string, string> = {
    new: "Новая",
    in_progress: "В работе",
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {totalCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Уведомления</p>
          <p className="text-xs text-muted-foreground">
            {totalCount > 0 ? `${totalCount} уведомлений` : "Нет уведомлений"}
          </p>
        </div>
        <ScrollArea className="max-h-[300px]">
          {totalCount === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Нет уведомлений
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Missed income alerts */}
              {missedIncomeNotifications.map((n, i) => (
                <div key={`missed-${i}`} className="px-4 py-3 text-sm bg-destructive/5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <p className="font-medium text-destructive">Нет прихода</p>
                  </div>
                  <p className="text-xs mt-1">
                    {n.projectName} — неделя {n.weekLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ожидалось: {formatCurrency(n.plannedAmount)}
                  </p>
                </div>
              ))}
              {/* Task notifications */}
              {taskNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 text-sm ${n.status === "new" ? "bg-primary/5" : ""}`}
                >
                  <p className="font-medium">{n.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{n.project}</span>
                    <Badge variant={n.status === "new" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {statusLabels[n.status] || n.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
