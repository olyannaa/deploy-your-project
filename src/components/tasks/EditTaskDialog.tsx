import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface MemberOption {
  id: string;
  fullName: string;
  contractorName?: string | null;
}

interface TaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task:
    | {
        id: string;
        title: string;
        projectId?: string | null;
        projectName?: string | null;
        assigneeId?: string | null;
        taskType?: string | null;
      }
    | null;
  onUpdated?: () => void;
}

export default function EditTaskDialog({
  open,
  onOpenChange,
  task,
  onUpdated,
}: TaskEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const projectId = task?.projectId ?? "";

  const { data: members = [] } = useQuery({
    queryKey: ["project", projectId, "members"],
    queryFn: () => apiFetch<MemberOption[]>(`/projects/${projectId}/members`),
    enabled: open && !!projectId,
  });

  useEffect(() => {
    if (!open || !task) {
      return;
    }
    setTitle(task.title ?? "");
    setAssigneeId(task.assigneeId ?? "");
  }, [open, task]);

  const handleSave = async () => {
    if (!task) {
      return;
    }
    if (!title.trim()) {
      toast.error("Введите название задачи");
      return;
    }

    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          assigneeId: assigneeId || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (task.projectId) {
        queryClient.invalidateQueries({ queryKey: ["tasks", task.projectId] });
        queryClient.invalidateQueries({ queryKey: ["project", task.projectId, "tasks"] });
      }
      toast.success("Задача обновлена");
      onUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Не удалось обновить задачу");
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTitle("");
      setAssigneeId("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактирование задачи</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {task?.projectName && (
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
              Проект: <span className="font-medium text-foreground">{task.projectName}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-title">Название задачи *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название задачи"
            />
          </div>

          <div className="space-y-2">
            <Label>Исполнитель</Label>
            <Select
              value={assigneeId || "none"}
              onValueChange={(value) => setAssigneeId(value === "none" ? "" : value)}
              disabled={!projectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Без исполнителя" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без исполнителя</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.contractorName
                      ? `${member.fullName} (Контрагент: ${member.contractorName})`
                      : member.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
