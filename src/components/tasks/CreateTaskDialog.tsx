import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import AccountingEmployeeSelect from "./AccountingEmployeeSelect";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  forceTaskType?: string;
  onCreated?: () => void;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface MemberOption {
  id: string;
  fullName: string;
  contractorName?: string | null;
}

interface SectionOption {
  id: string;
  sectionCode?: string | null;
  sectionName: string;
}

interface UserOption {
  id: string;
  fullName: string;
  roles?: string[];
  contractorName?: string | null;
}

const taskTypeLabels: Record<string, string> = {
  project: "Проектная",
  personal: "Личная",
  accounting: "Бухгалтерская",
  subcontract: "Субподряд",
};

const accountingSubtypeOptions = [
  { id: "salary", label: "Зарплата/Аванс" },
  { id: "subcontractors", label: "Субподрядчики/Фриланс" },
  { id: "extra_costs", label: "Доп. затраты" },
  { id: "other", label: "Другое" },
  { id: "none", label: "Отсутствует" },
];

export default function CreateTaskDialog({
  open,
  onOpenChange,
  projectId,
  forceTaskType,
  onCreated,
}: CreateTaskDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const roles = user?.roles ?? [];

  const canCreateProject = roles.some((role) =>
    ["admin", "gip"].includes(role),
  );
  const canCreateAccounting = roles.some((role) =>
    ["admin", "gip", "accountant"].includes(role),
  );
  const canCreateSubcontract = roles.some((role) =>
    ["admin", "gip"].includes(role),
  );

  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const [taskType, setTaskType] = useState(forceTaskType || (projectId ? "project" : "personal"));
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subcontractCost, setSubcontractCost] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [accountingSubtype, setAccountingSubtype] = useState("none");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [accountingProjectId, setAccountingProjectId] = useState("");

  const isAccountantOnly = roles.includes("accountant") && !roles.some(r => ["admin", "gip"].includes(r));

  const taskTypeOptions = useMemo(() => {
    // When forceTaskType is set (e.g. from Finance page), only show that type
    if (forceTaskType) {
      return [{ id: forceTaskType, label: taskTypeLabels[forceTaskType] || forceTaskType }];
    }
    // When opened from project card (projectId set), don't allow accounting tasks
    if (projectId) {
      const options = [{ id: "project", label: taskTypeLabels.project }];
      if (canCreateSubcontract) {
        options.push({ id: "subcontract", label: taskTypeLabels.subcontract });
      }
      return options;
    }

    const options = [{ id: "personal", label: taskTypeLabels.personal }];
    if (canCreateAccounting) {
      options.push({ id: "accounting", label: taskTypeLabels.accounting });
    }
    if (canCreateProject) {
      options.push({ id: "project", label: taskTypeLabels.project });
    }
    if (canCreateSubcontract) {
      options.push({ id: "subcontract", label: taskTypeLabels.subcontract });
    }
    return options;
  }, [projectId, forceTaskType, canCreateAccounting, canCreateProject, canCreateSubcontract]);

  const showProjectFields = taskType === "project" || taskType === "subcontract";
  const showAccountingAssignee = taskType === "accounting";
  const showProjectAssignee = taskType === "project";
  const showSubcontractAssignee = taskType === "subcontract";
  const showSectionField = taskType === "project" || taskType === "subcontract";

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<ProjectOption[]>("/projects"),
    enabled: open,
  });

  const { data: projectDetails } = useQuery({
    queryKey: ["project", "details", projectId],
    queryFn: () => apiFetch<ProjectOption>(`/projects/${projectId}`),
    enabled: open && !!projectId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project", selectedProjectId, "members"],
    queryFn: () => apiFetch<MemberOption[]>(`/projects/${selectedProjectId}/members`),
    enabled: open && !!selectedProjectId && (showProjectAssignee || showSubcontractAssignee),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["project", selectedProjectId, "sections"],
    queryFn: () => apiFetch<SectionOption[]>(`/projects/${selectedProjectId}/sections`),
    enabled: open && !!selectedProjectId && showSectionField,
  });

  const { data: internalUsers = [] } = useQuery({
    queryKey: ["users", "internal"],
    queryFn: () => apiFetch<UserOption[]>("/users?scope=internal"),
    enabled: open && (showAccountingAssignee),
  });

  const accountantOptions = useMemo(
    () => internalUsers.filter((candidate) => candidate.roles?.includes("accountant")),
    [internalUsers],
  );

  // All users for accounting salary selection (no project filter)
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => apiFetch<UserOption[]>("/users"),
    enabled: open && taskType === "accounting" && accountingSubtype === "salary",
  });

  // Project members for accounting salary selection (with project filter)
  const { data: accountingProjectMembers = [] } = useQuery({
    queryKey: ["project", accountingProjectId, "members", "accounting"],
    queryFn: () => apiFetch<MemberOption[]>(`/projects/${accountingProjectId}/members`),
    enabled: open && taskType === "accounting" && (accountingSubtype === "salary" || accountingSubtype === "subcontractors") && !!accountingProjectId,
  });

  // Project subcontractors for accounting
  const { data: accountingSubcontractors = [] } = useQuery({
    queryKey: ["project", accountingProjectId, "subcontractors", "accounting"],
    queryFn: () => apiFetch<any[]>(`/projects/${accountingProjectId}/subcontractors`),
    enabled: open && taskType === "accounting" && accountingSubtype === "subcontractors" && !!accountingProjectId,
  });

  const salaryEmployeeList = useMemo(() => {
    if (accountingSubtype !== "salary") return [];
    if (accountingProjectId) {
      return accountingProjectMembers.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        dailyRate: (allUsers.find((u) => u.id === m.id) as any)?.dailyRate ?? 0,
        contractRate: (allUsers.find((u) => u.id === m.id) as any)?.contractRate ?? null,
        contractorName: m.contractorName,
        workDays: Math.floor(Math.random() * 22) + 1,
      }));
    }
    return allUsers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      dailyRate: (u as any).dailyRate ?? 0,
      contractRate: (u as any).contractRate ?? null,
      contractorName: u.contractorName,
      workDays: Math.floor(Math.random() * 22) + 1,
    }));
  }, [accountingSubtype, accountingProjectId, accountingProjectMembers, allUsers]);

  const subcontractorEmployeeList = useMemo(() => {
    if (accountingSubtype !== "subcontractors" || !accountingProjectId) return [];
    return accountingSubcontractors.map((s: any) => ({
      id: s.id,
      fullName: s.contractorName,
      contractorName: s.contractorName,
      contractAmount: s.contractAmount,
      workDays: s.workDays ?? 0,
    }));
  }, [accountingSubtype, accountingProjectId, accountingSubcontractors]);

  useEffect(() => {
    if (forceTaskType) {
      setTaskType(forceTaskType);
      if (projectId) {
        setSelectedProjectId(projectId);
        setAccountingProjectId(projectId);
      }
    } else if (projectId) {
      setSelectedProjectId(projectId);
      setTaskType("project");
    }
  }, [projectId, forceTaskType, open]);

  useEffect(() => {
    if (taskTypeOptions.length === 0) {
      return;
    }
    if (!taskTypeOptions.some((option) => option.id === taskType)) {
      setTaskType(taskTypeOptions[0].id);
    }
  }, [taskTypeOptions, taskType]);

  useEffect(() => {
    setAssigneeId("");
    setSectionId("");
    setSubcontractCost("");
    setPlannedStartDate("");
    setPlannedEndDate("");
    setAccountingSubtype("none");
    setSelectedEmployeeIds([]);
    setAccountingProjectId("");
  }, [selectedProjectId, taskType]);

  const resetForm = () => {
    setTitle("");
    setAssigneeId("");
    setSectionId("");
    setSubcontractCost("");
    setPlannedStartDate("");
    setPlannedEndDate("");
    setAccountingSubtype("none");
    setSelectedEmployeeIds([]);
    setAccountingProjectId("");
    if (!projectId) {
      setSelectedProjectId("");
      setTaskType("personal");
    }
  };

  const projectName = useMemo(() => {
    if (projectDetails?.name) {
      return projectDetails.name;
    }
    if (!projectId) return "";
    return projects.find((project) => project.id === projectId)?.name || "";
  }, [projectDetails?.name, projectId, projects]);

  const handleCreate = async () => {
    if (showProjectFields && !selectedProjectId) {
      toast.error("Выберите проект");
      return;
    }
    if (!title.trim()) {
      if (taskType !== "subcontract") {
        toast.error("Введите название задачи");
        return;
      }
    }
    if (showAccountingAssignee && !assigneeId) {
      toast.error("Выберите бухгалтера");
      return;
    }
    if (showSubcontractAssignee && !assigneeId) {
      toast.error("Выберите исполнителя подрядчика");
      return;
    }
    if (taskType === "subcontract" && !sectionId) {
      toast.error("Выберите задачу из разделов");
      return;
    }
    if (taskType === "subcontract") {
      const requested = Number(subcontractCost.replace(",", "."));
      if (!Number.isFinite(requested) || requested <= 0) {
        toast.error("Укажите стоимость субподряда");
        return;
      }
    }

    try {
      const payload: any = {
        taskType,
        projectId: showProjectFields ? selectedProjectId : (taskType === "accounting" && accountingProjectId ? accountingProjectId : null),
        title: taskType === "subcontract" ? undefined : title.trim(),
        assigneeId: showAccountingAssignee || showProjectAssignee || showSubcontractAssignee ? assigneeId || null : null,
        sectionId: showSectionField ? sectionId || null : null,
      };
      if (taskType === "accounting") {
        payload.accountingSubtype = accountingSubtype;
        payload.selectedEmployeeIds = selectedEmployeeIds;
      }
      if (taskType === "personal") {
        payload.plannedStartDate = plannedStartDate || null;
        payload.plannedEndDate = plannedEndDate || null;
      }
      if (taskType === "subcontract") {
        payload.subcontractCostRequested = Number(subcontractCost.replace(",", "."));
      }

      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (selectedProjectId) {
        queryClient.invalidateQueries({ queryKey: ["tasks", selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ["project", selectedProjectId, "tasks"] });
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      toast.success("Задача создана");
      onCreated?.();
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Не удалось создать задачу");
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          {!forceTaskType && (
            <div className="space-y-2">
              <Label>Тип задачи *</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!projectId && showProjectFields && (
            <div className="space-y-2">
              <Label>Проект *</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите проект" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {projectId && showProjectFields && (
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
              Проект: <span className="font-medium text-foreground">{projectName || "—"}</span>
            </div>
          )}

          {taskType !== "subcontract" && (
            <div className="space-y-2">
              <Label htmlFor="task-title">Название задачи *</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например, Подготовить ТЗ"
              />
            </div>
          )}

          {taskType === "personal" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="task-start">Начало</Label>
                <Input
                  id="task-start"
                  type="date"
                  value={plannedStartDate}
                  onChange={(event) => setPlannedStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-end">Срок</Label>
                <Input
                  id="task-end"
                  type="date"
                  value={plannedEndDate}
                  onChange={(event) => setPlannedEndDate(event.target.value)}
                />
              </div>
            </div>
          )}

          {showProjectAssignee && (
            <div className="space-y-2">
              <Label>Исполнитель</Label>
              <Select
                value={assigneeId || "none"}
                onValueChange={(value) => setAssigneeId(value === "none" ? "" : value)}
                disabled={!selectedProjectId}
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
          )}

          {showAccountingAssignee && (
            <div className="space-y-2">
              <Label>Бухгалтер *</Label>
              <Select
                value={assigneeId || ""}
                onValueChange={(value) => setAssigneeId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите бухгалтера" />
                </SelectTrigger>
                <SelectContent>
                  {accountantOptions.map((accountant) => (
                    <SelectItem key={accountant.id} value={accountant.id}>
                      <div className="flex items-center gap-2">
                        <span>{accountant.fullName}</span>
                        <Badge variant="secondary" className="text-[10px]">Бухгалтер</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === "accounting" && (
            <div className="space-y-2">
              <Label>Проект {isAccountantOnly ? "(опционально)" : "*"}</Label>
              {projectId ? (
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                  Проект: <span className="font-medium text-foreground">{projectName || "—"}</span>
                </div>
              ) : (
                <Select value={accountingProjectId || "none"} onValueChange={(v) => {
                  setAccountingProjectId(v === "none" ? "" : v);
                  setSelectedEmployeeIds([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Без привязки к проекту" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAccountantOnly && <SelectItem value="none">Без привязки к проекту</SelectItem>}
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {taskType === "accounting" && (
            <div className="space-y-2">
              <Label>Вид задачи</Label>
              <Select value={accountingSubtype} onValueChange={(v) => {
                setAccountingSubtype(v);
                setSelectedEmployeeIds([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите вид" />
                </SelectTrigger>
                <SelectContent>
                  {accountingSubtypeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === "accounting" && accountingSubtype === "salary" && (
            <AccountingEmployeeSelect
              label="Сотрудники"
              employees={salaryEmployeeList}
              selectedIds={selectedEmployeeIds}
              onSelectionChange={setSelectedEmployeeIds}
            />
          )}

          {taskType === "accounting" && accountingSubtype === "subcontractors" && accountingProjectId && (
            <AccountingEmployeeSelect
              label="Субподрядчики"
              employees={subcontractorEmployeeList}
              selectedIds={selectedEmployeeIds}
              onSelectionChange={setSelectedEmployeeIds}
            />
          )}

          {taskType === "accounting" && accountingSubtype === "subcontractors" && !accountingProjectId && (
            <p className="text-sm text-muted-foreground">Выберите проект для отображения субподрядчиков</p>
          )}

          {showSubcontractAssignee && (
            <div className="space-y-2">
              <Label>Исполнитель субподряда *</Label>
              <Select
                value={assigneeId || ""}
                onValueChange={(value) => setAssigneeId(value)}
                disabled={!selectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <span>{member.fullName}</span>
                        {member.contractorName && (
                          <Badge variant="secondary" className="text-[10px]">
                            контрагент
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {taskType === "subcontract" && (
            <div className="space-y-2">
              <Label>Стоимость субподряда *</Label>
              <Input
                value={subcontractCost}
                onChange={(event) => setSubcontractCost(event.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {showSectionField && (
            <div className="space-y-2">
              <Label>
                {taskType === "subcontract" ? "Задача из разделов *" : "Раздел WBS (опционально)"}
              </Label>
              <Select
                value={sectionId || (taskType === "subcontract" ? "" : "none")}
                onValueChange={(value) => setSectionId(value === "none" ? "" : value)}
                disabled={!selectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={taskType === "subcontract" ? "Выберите задачу" : "Вне WBS"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {taskType !== "subcontract" && <SelectItem value="none">Вне WBS</SelectItem>}
                  {sections.map((section) => {
                    const prefix = section.sectionCode ? `${section.sectionCode}. ` : "";
                    return (
                      <SelectItem key={section.id} value={section.id}>
                        {prefix}
                        {section.sectionName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
