import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUp, Plus } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import ProjectSectionsTable from "./ProjectSectionsTable";
import TemplateSelectionDialog from "./TemplateSelectionDialog";
import { ProjectSection } from "@/data/projectTemplates";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  managerId: string | null;
  organization: string | null;
  externalLink: string | null;
  budget: number;
  departmentId?: string | null;
  departmentName?: string | null;
}

interface ProjectPropertiesProps {
  project: Project;
}

const normalizeDate = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const subcontractStatusLabels: Record<string, string> = {
  pending: "Ожидает согласования",
  approved: "Согласовано",
  rejected: "Отклонено",
};

const subcontractStatusStyles: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function ProjectProperties({ project }: ProjectPropertiesProps) {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<ProjectSection[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const originalSectionIds = useRef<string[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    managerId: "",
    departmentId: "",
    organization: "",
    externalLink: "",
    startDate: "",
    endDate: "",
    budget: "",
    status: "active",
  });
  const [isContractorDialogOpen, setIsContractorDialogOpen] = useState(false);
  const [contractorForm, setContractorForm] = useState({ name: "", inn: "" });
  const [isSubcontractDialogOpen, setIsSubcontractDialogOpen] = useState(false);
  const [subcontractForm, setSubcontractForm] = useState({
    sectionId: "",
    assigneeId: "",
    cost: "",
  });
  const canAddContractor = currentRole === "admin";

  const { data: users = [] } = useQuery({
    queryKey: ["users", "internal"],
    queryFn: () => apiFetch<any[]>("/users?scope=internal"),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<any[]>("/departments"),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project", project.id, "members"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/members`),
    enabled: !!project?.id,
  });

  const currentMemberRole = useMemo(
    () => projectMembers.find((member) => member.id === user?.id)?.projectRole ?? null,
    [projectMembers, user?.id],
  );

  const canEdit =
    currentRole === "admin" ||
    (currentMemberRole ? ["manager", "lead_specialist"].includes(currentMemberRole) : false);
  const isReadOnly = !canEdit;
  const canViewBudget =
    currentRole === "admin" ||
    currentRole === "gip" ||
    currentRole === "accountant" ||
    currentMemberRole === "manager";
  const canViewAllSubcontractCosts =
    currentRole === "admin" ||
    currentRole === "gip" ||
    currentRole === "accountant" ||
    currentMemberRole === "manager";
  const canManageSubcontracts = currentMemberRole === "manager";

  const executorUsers = useMemo(
    () =>
      projectMembers.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        contractorName: member.contractorName,
      })),
    [projectMembers],
  );
  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: () => apiFetch<any[]>("/contractors"),
  });

  const { data: projectTasks = [] } = useQuery({
    queryKey: ["project", project.id, "tasks"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/tasks`),
    enabled: !!project?.id,
  });

  const subcontractTasks = useMemo(
    () => projectTasks.filter((task) => task.taskType === "subcontract"),
    [projectTasks],
  );

  const lockedSectionIds = useMemo(
    () =>
      subcontractTasks
        .filter((task) => task.approvalStatus === "approved" && task.sectionId)
        .map((task) => task.sectionId as string),
    [subcontractTasks],
  );

  const subcontractSectionIds = useMemo(
    () =>
      subcontractTasks
        .filter((task) => task.approvalStatus === "approved" && task.sectionId)
        .map((task) => task.sectionId as string),
    [subcontractTasks],
  );

  const contractorOptions = useMemo(
    () =>
      contractors.map((contractor) => ({
        value: contractor.id,
        label: contractor.name,
        inn: contractor.inn,
      })),
    [contractors],
  );

  const resolveContractorValue = (value?: string | null) => {
    if (!value) return "";
    const match = contractorOptions.find(
      (option) => option.value === value || option.label === value,
    );
    return match ? match.value : value;
  };

  const resolveContractorName = (value?: string | null) => {
    if (!value) return "";
    const match = contractorOptions.find(
      (option) => option.value === value || option.label === value,
    );
    return match ? match.label : value;
  };

  const contractorValue = resolveContractorValue(formData.organization);

  const contractorOptionsWithCurrent = useMemo(() => {
    if (!contractorValue) return contractorOptions;
    if (contractorOptions.some((option) => option.value === contractorValue)) {
      return contractorOptions;
    }
    return [...contractorOptions, { value: contractorValue, label: contractorValue }];
  }, [contractorOptions, contractorValue]);

  const resetContractorForm = () => {
    setContractorForm({ name: "", inn: "" });
  };

  const resetSubcontractForm = () => {
    setSubcontractForm({ sectionId: "", assigneeId: "", cost: "" });
  };

  const { data: sectionData = [] } = useQuery({
    queryKey: ["project", project.id, "sections"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/sections`),
    enabled: !!project?.id,
  });

  const sectionLookup = useMemo(() => {
    const map = new Map<string, { sectionCode?: string | null; sectionName?: string }>();
    sectionData.forEach((section) => {
      map.set(section.id, {
        sectionCode: section.sectionCode,
        sectionName: section.sectionName,
      });
    });
    return map;
  }, [sectionData]);

  useEffect(() => {
    if (!project) return;
    setFormData({
      name: project.name ?? "",
      description: project.description ?? "",
      managerId: project.managerId ?? "",
      departmentId: project.departmentId ?? "",
      organization: project.organization ?? "",
      externalLink: project.externalLink ?? "",
      startDate: normalizeDate(project.startDate),
      endDate: normalizeDate(project.endDate),
      budget: project.budget ? String(project.budget) : "0",
      status: project.status ?? "active",
    });
  }, [project]);

  useEffect(() => {
    const mapped = sectionData.map((section) => ({
      id: section.id,
      sectionCode: section.sectionCode ?? "",
      designation: section.designation ?? "",
      sectionName: section.sectionName ?? "",
      startDate: normalizeDate(section.startDate),
      plannedEndDate: normalizeDate(section.plannedEndDate),
      executor: section.executorName ?? "",
      executorName: section.executorName ?? "",
      executorId: section.executorId ?? null,
      actualEndDate: normalizeDate(section.actualEndDate),
      notes: section.notes ?? "",
      level: section.sectionCode?.includes(".") ? 1 : 0,
      isNew: false,
    }));
    setSections(mapped);
    originalSectionIds.current = mapped.map((section) => section.id);
  }, [sectionData]);

  const managerName = users.find((user) => user.id === formData.managerId)?.fullName ?? "-";
  const departmentName =
    departments.find((department) => department.id === formData.departmentId)?.name ?? "—";

  const handleTemplatesSelected = (newSections: ProjectSection[]) => {
    setSections(newSections);
  };

  const buildSectionPayload = (section: ProjectSection) => ({
    sectionCode: section.sectionCode || null,
    designation: section.designation || null,
    sectionName: section.sectionName,
    startDate: section.startDate || null,
    plannedEndDate: section.plannedEndDate || null,
    executorId:
      section.executorId ??
      executorUsers.find((user) => user.fullName === section.executor)?.id ??
      null,
    actualEndDate: section.actualEndDate || null,
    notes: section.notes || null,
  });

  const handleSaveContractor = async () => {
    if (!contractorForm.name.trim() || !contractorForm.inn.trim()) {
      toast.error("Укажите название и ИНН");
      return;
    }

    try {
      const response = await apiFetch<{ id: string }>("/contractors", {
        method: "POST",
        body: JSON.stringify({
          name: contractorForm.name.trim(),
          inn: contractorForm.inn.trim(),
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setFormData((prev) => ({ ...prev, organization: response.id }));
      setIsContractorDialogOpen(false);
      resetContractorForm();
      toast.success("Контрагент создан");
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить контрагента");
    }
  };

  const handleCreateSubcontract = async () => {
    if (!subcontractForm.sectionId) {
      toast.error("Выберите задачу из разделов");
      return;
    }
    if (!subcontractForm.assigneeId) {
      toast.error("Выберите исполнителя субподряда");
      return;
    }
    const cost = Number(subcontractForm.cost.replace(",", "."));
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error("Укажите стоимость субподряда");
      return;
    }

    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          taskType: "subcontract",
          projectId: project.id,
          sectionId: subcontractForm.sectionId,
          assigneeId: subcontractForm.assigneeId,
          subcontractCostRequested: cost,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Субподряд создан");
      setIsSubcontractDialogOpen(false);
      resetSubcontractForm();
    } catch (error: any) {
      toast.error(error.message || "Не удалось создать субподряд");
    }
  };

  const handleSaveProject = async () => {
    if (!formData.name.trim()) {
      toast.error("Введите название проекта");
      return;
    }

    try {
      await apiFetch(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          managerId: formData.managerId || null,
          departmentId: formData.departmentId || null,
          organization: formData.organization ? resolveContractorName(formData.organization) : null,
          externalLink: formData.externalLink || null,
          budget: canViewBudget ? (formData.budget ? Number(formData.budget) : 0) : undefined,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          status: formData.status || project.status,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      toast.success("Проект обновлен");
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить проект");
    }
  };

  const handleResetProject = () => {
    setFormData({
      name: project.name ?? "",
      description: project.description ?? "",
      managerId: project.managerId ?? "",
      departmentId: project.departmentId ?? "",
      organization: project.organization ?? "",
      externalLink: project.externalLink ?? "",
      startDate: normalizeDate(project.startDate),
      endDate: normalizeDate(project.endDate),
      budget: project.budget ? String(project.budget) : "0",
      status: project.status ?? "active",
    });
  };

  const handleSaveSections = async () => {
    const missingName = sections.find((section) => !section.sectionName.trim());
    if (missingName) {
      toast.error("Заполните наименование раздела");
      return;
    }

    const removedIds = originalSectionIds.current.filter(
      (id) => !sections.some((section) => !section.isNew && section.id === id),
    );
    const newSections = sections.filter((section) => section.isNew);
    const existingSections = sections.filter((section) => !section.isNew);

    try {
      await Promise.all(
        removedIds.map((id) => apiFetch(`/projects/${project.id}/sections/${id}`, { method: "DELETE" })),
      );

      const created = await Promise.all(
        newSections.map(async (section) => {
          const response = await apiFetch<{ id: string }>(
            `/projects/${project.id}/sections`,
            {
              method: "POST",
              body: JSON.stringify(buildSectionPayload(section)),
            },
          );
          return { tempId: section.id, newId: response.id };
        }),
      );

      await Promise.all(
        existingSections.map((section) =>
          apiFetch(`/projects/${project.id}/sections/${section.id}`, {
            method: "PATCH",
            body: JSON.stringify(buildSectionPayload(section)),
          }),
        ),
      );

      const updatedSections = sections
        .map((section) => {
          const createdSection = created.find((item) => item.tempId === section.id);
          if (createdSection) {
            return { ...section, id: createdSection.newId, isNew: false };
          }
          return { ...section, isNew: false };
        })
        .filter((section) => !removedIds.includes(section.id));

      setSections(updatedSections);
      originalSectionIds.current = updatedSections.map((section) => section.id);

      queryClient.invalidateQueries({ queryKey: ["project", project.id, "sections"] });
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "tasks"] });
      toast.success("Разделы сохранены");
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить разделы");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Активный";
      case "completed":
        return "Завершен";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-border/40 bg-card p-6 shadow-soft">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Основная информация</h3>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <Label htmlFor="name">Наименование *</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-foreground">{formData.name}</p>
                ) : (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1.5 border-2"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="manager">Менеджер проекта</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-foreground">{managerName}</p>
                ) : (
                  <Select
                    value={formData.managerId}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, managerId: value }))}
                  >
                    <SelectTrigger id="manager" className="mt-1.5 border-2">
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="department">Подразделение</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-foreground">{departmentName}</p>
                ) : (
                  <Select
                    value={formData.departmentId || "none"}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, departmentId: value === "none" ? "" : value }))
                    }
                  >
                    <SelectTrigger id="department" className="mt-1.5 border-2">
                      <SelectValue placeholder="Без подразделения" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без подразделения</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="organization">Контрагент</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-foreground">
                    {resolveContractorName(formData.organization) || "Не указано"}
                  </p>
                ) : (
                  <Select
                    value={contractorValue}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, organization: value }))}
                  >
                    <SelectTrigger id="organization" className="mt-1.5 border-2">
                      <SelectValue placeholder="Выберите контрагента" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractorOptionsWithCurrent.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                      {canAddContractor && (
                        <div className="border-t border-border px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => setIsContractorDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                            Добавить контрагента
                          </Button>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="start">Дата начала</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-foreground">{formData.startDate || "—"}</p>
                ) : (
                  <Input
                    id="start"
                    type="date"
                    value={formData.startDate}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                    className="mt-1.5 border-2"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="end">Дата окончания</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-foreground">{formData.endDate || "—"}</p>
                ) : (
                  <Input
                    id="end"
                    type="date"
                    value={formData.endDate}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                    className="mt-1.5 border-2"
                  />
                )}
              </div>

              <div>
                <Label htmlFor="external_link">Папка хранилища</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {formData.externalLink || "Не указано"}
                  </p>
                ) : (
                  <Input
                    id="external_link"
                    type="url"
                    value={formData.externalLink}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, externalLink: event.target.value }))
                    }
                    placeholder="https://example.com"
                    className="mt-1.5 border-2"
                  />
                )}
              </div>

              {canViewBudget && (
                <div>
                  <Label htmlFor="budget">Общий бюджет проекта (руб.)</Label>
                  {isReadOnly ? (
                    <p className="mt-1.5 text-sm text-foreground">
                      {Number(formData.budget || 0).toLocaleString("ru-RU")}
                    </p>
                  ) : (
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, budget: event.target.value }))
                      }
                      className="mt-1.5 border-2"
                      placeholder="0"
                    />
                  )}
                </div>
              )}

              <div className="md:col-span-2 lg:col-span-4">
                <Label htmlFor="description">Описание</Label>
                {isReadOnly ? (
                  <p className="mt-1.5 text-sm text-foreground">{formData.description || "—"}</p>
                ) : (
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className="mt-1.5 border-2"
                    rows={3}
                  />
                )}
              </div>

              <div>
                <Label>Статус</Label>
                <div className="mt-1.5">
                  <Badge variant={getStatusColor(formData.status)}>{getStatusText(formData.status)}</Badge>
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="border-2" onClick={handleResetProject}>
                Отменить
              </Button>
              <Button className="border-2" onClick={handleSaveProject}>
                Сохранить изменения
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="border-2 border-border/40 bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Разделы проекта {sections.length > 0 && `(${sections.length})`}
          </h3>

          {canEdit && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setTemplateDialogOpen(true)}>
              <FileUp className="h-4 w-4" />
              Загрузить шаблон
            </Button>
          )}
        </div>

        <ProjectSectionsTable
          sections={sections}
          onChange={setSections}
          isReadOnly={isReadOnly}
          users={executorUsers}
          lockedSectionIds={lockedSectionIds}
          subcontractSectionIds={subcontractSectionIds}
        />

        {canEdit && (
          <div className="flex justify-end gap-3 mt-4">
            <Button className="border-2" onClick={handleSaveSections}>
              Сохранить разделы
            </Button>
          </div>
        )}
      </Card>

      <Card className="border-2 border-border/40 bg-card p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Субподряды {subcontractTasks.length > 0 && `(${subcontractTasks.length})`}
          </h3>
          {canManageSubcontracts && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setIsSubcontractDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Добавить субподряд
            </Button>
          )}
        </div>

        {subcontractTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Субподрядов пока нет
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Задача</TableHead>
                <TableHead>Исполнитель</TableHead>
                <TableHead className="text-right">Стоимость</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcontractTasks.map((task) => {
                const isPending = task.approvalStatus === "pending";
                const costValue =
                  task.subcontractCostFinal ?? task.subcontractCostRequested ?? null;
                const canViewSubcontractCost =
                  canViewAllSubcontractCosts || (task.assigneeId && task.assigneeId === user?.id);
                const section = task.sectionId ? sectionLookup.get(task.sectionId) : null;
                const sectionLabel = section
                  ? `${section.sectionCode ? `${section.sectionCode}. ` : ""}${section.sectionName ?? ""}`.trim()
                  : task.title;
                return (
                  <TableRow key={task.id} className={isPending ? "text-muted-foreground" : ""}>
                    <TableCell className="font-medium">{sectionLabel || task.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{task.assigneeName || "—"}</span>
                        {task.assigneeContractorName && (
                          <Badge variant="secondary" className="text-[10px]">
                            контрагент
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canViewSubcontractCost && costValue
                        ? Number(costValue).toLocaleString("ru-RU") + " ₽"
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={subcontractStatusStyles[task.approvalStatus] ?? ""}
                      >
                        {subcontractStatusLabels[task.approvalStatus] ?? task.approvalStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <TemplateSelectionDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onTemplatesSelected={handleTemplatesSelected}
        existingSections={sections}
      />

      <Dialog
        open={isContractorDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsContractorDialogOpen(nextOpen);
          if (!nextOpen) {
            resetContractorForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить контрагента</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-contractor-name">Название *</Label>
              <Input
                id="project-contractor-name"
                value={contractorForm.name}
                onChange={(event) =>
                  setContractorForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-contractor-inn">ИНН *</Label>
              <Input
                id="project-contractor-inn"
                value={contractorForm.inn}
                onChange={(event) => setContractorForm((prev) => ({ ...prev, inn: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsContractorDialogOpen(false);
                resetContractorForm();
              }}
            >
              Отмена
            </Button>
            <Button onClick={handleSaveContractor}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSubcontractDialogOpen}
        onOpenChange={(nextOpen) => {
          setIsSubcontractDialogOpen(nextOpen);
          if (!nextOpen) {
            resetSubcontractForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый субподряд</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Задача из разделов *</Label>
              <Select
                value={subcontractForm.sectionId}
                onValueChange={(value) =>
                  setSubcontractForm((prev) => ({ ...prev, sectionId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите задачу" />
                </SelectTrigger>
                <SelectContent>
                  {sectionData.map((section) => {
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
            <div className="space-y-2">
              <Label htmlFor="subcontract-assignee">Исполнитель субподряда *</Label>
              <Select
                value={subcontractForm.assigneeId}
                onValueChange={(value) =>
                  setSubcontractForm((prev) => ({ ...prev, assigneeId: value }))
                }
              >
                <SelectTrigger id="subcontract-assignee">
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  {projectMembers.map((member) => (
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
            <div className="space-y-2">
              <Label htmlFor="subcontract-cost">Стоимость *</Label>
              <Input
                id="subcontract-cost"
                value={subcontractForm.cost}
                onChange={(event) =>
                  setSubcontractForm((prev) => ({ ...prev, cost: event.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Субподряд будет доступен исполнителю после двух согласований.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubcontractDialogOpen(false);
                resetSubcontractForm();
              }}
            >
              Отмена
            </Button>
            <Button onClick={handleCreateSubcontract}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
