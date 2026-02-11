import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function NotificationBell() {
  const { user } = useAuth();

  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: () => apiFetch("/tasks"),
  });

  // Notifications = new accounting tasks assigned to the current user
  const notifications = useMemo(() => {
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
      }));
  }, [allTasks, user.id]);

  const newCount = notifications.filter((n) => n.status === "new").length;

  const statusLabels: Record<string, string> = {
    new: "Новая",
    in_progress: "В работе",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {newCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {newCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Уведомления</p>
          <p className="text-xs text-muted-foreground">
            {newCount > 0 ? `${newCount} новых задач` : "Нет новых задач"}
          </p>
        </div>
        <ScrollArea className="max-h-[300px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Нет уведомлений
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
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
