import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, Plus } from "lucide-react";
import ProjectSectionsTable from "./ProjectSectionsTable";
import TemplateSelectionDialog from "./TemplateSelectionDialog";
import { ProjectSection } from "@/data/projectTemplates";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (projectId: string) => void;
}

export default function CreateProjectDialog({ open, onOpenChange, onCreated }: CreateProjectDialogProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canViewBudget = roles.some((role) => ["admin", "gip", "accountant"].includes(role));
  const isGip = roles.includes("gip") && !roles.includes("admin");

  const [formData, setFormData] = useState({
    name: "",
    manager: "",
    departmentId: "",
    organization: "",
    startDate: "",
    endDate: "",
    externalLink: "",
    description: "",
    budget: "",
  });
  const [isContractorDialogOpen, setIsContractorDialogOpen] = useState(false);
  const [contractorForm, setContractorForm] = useState({ name: "", inn: "" });

  const [sections, setSections] = useState<ProjectSection[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const canAssignExecutors = false;

  const canAddContractor = Boolean(user?.roles?.includes("admin"));
  const { data: users = [] } = useQuery({
    queryKey: ["users", "internal"],
    queryFn: () => apiFetch<any[]>("/users?scope=internal"),
    enabled: !!user,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<any[]>("/departments"),
    enabled: !!user,
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: () => apiFetch<any[]>("/contractors"),
    enabled: !!user,
  });

  const contractorOptions = useMemo(
    () =>
      contractors.map((contractor) => ({
        value: contractor.id,
        label: contractor.name,
        inn: contractor.inn,
      })),
    [contractors],
  );

  const availableDepartments = useMemo(() => {
    if (!isGip) {
      return departments;
    }
    const allowed = new Set(user?.departmentIds ?? []);
    return departments.filter((department) => allowed.has(department.id));
  }, [departments, isGip, user?.departmentIds]);

  const resolveContractorName = (value?: string) => {
    if (!value) return "";
    const match = contractorOptions.find(
      (option) => option.value === value || option.label === value,
    );
    return match ? match.label : value;
  };

  const resetContractorForm = () => {
    setContractorForm({ name: "", inn: "" });
  };

  const handleTemplatesSelected = (newSections: ProjectSection[]) => {
    setSections(newSections);
  };

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

  useEffect(() => {
    if (!open) {
      return;
    }
    if (user?.primaryDepartmentId && !formData.departmentId) {
      setFormData((prev) => ({ ...prev, departmentId: user.primaryDepartmentId || "" }));
    }
    if (isGip && user?.id && !formData.manager) {
      setFormData((prev) => ({ ...prev, manager: user.id }));
    }
  }, [open, user?.primaryDepartmentId, formData.departmentId, isGip, user?.id, formData.manager]);

  const resetForm = () => {
    setFormData({
      name: "",
      manager: isGip ? user?.id || "" : "",
      departmentId: user?.primaryDepartmentId || "",
      organization: "",
      startDate: "",
      endDate: "",
      externalLink: "",
      description: "",
      budget: "",
    });
    setSections([]);
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("Введите название проекта");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        managerId: isGip ? user?.id : formData.manager || user?.id,
        departmentId: formData.departmentId || null,
        organization: formData.organization ? resolveContractorName(formData.organization) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        externalLink: formData.externalLink || null,
        budget: canViewBudget ? (formData.budget ? Number(formData.budget) : 0) : 0,
      };
      const project = await apiFetch<{ id: string }>("/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (sections.length > 0) {
        const sectionPayloads = sections.map((section) => {
          const executorId = canAssignExecutors
            ? section.executorId ?? users.find((u) => u.fullName === section.executor)?.id ?? null
            : null;
          return {
            sectionCode: section.sectionCode,
            designation: section.designation,
            sectionName: section.sectionName,
            startDate: section.startDate || null,
            plannedEndDate: section.plannedEndDate || null,
            executorId,
            actualEndDate: section.actualEndDate || null,
            notes: section.notes || null,
          };
        });

        await Promise.all(
          sectionPayloads.map((payload) =>
            apiFetch(`/projects/${project.id}/sections`, {
              method: "POST",
              body: JSON.stringify(payload),
            }),
          ),
        );

        if (canAssignExecutors) {
          const executorIds = Array.from(
            new Set(sectionPayloads.map((payload) => payload.executorId).filter(Boolean)),
          ) as string[];

          if (executorIds.length > 0) {
            await Promise.all(
              executorIds.map((executorId) =>
                apiFetch(`/projects/${project.id}/members`, {
                  method: "POST",
                  body: JSON.stringify({ userId: executorId, projectRole: "executor" }),
                }),
              ),
            );
          }
        }
      }

      await apiFetch(`/projects/${project.id}/files/ensure-folder`, {
        method: "POST",
        body: JSON.stringify({ projectName: formData.name }),
      });

      toast.success("Проект создан успешно");
      onCreated?.(project.id);
      onOpenChange(false);
      setIsContractorDialogOpen(false);
      resetContractorForm();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Не удалось создать проект");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setIsContractorDialogOpen(false);
    resetContractorForm();
    resetForm();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[98vw] w-full h-[95vh] max-h-[95vh] overflow-hidden p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-xl font-semibold">Создание нового проекта</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-6">
            <div className="py-4 border-b shrink-0">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="create-name" className="text-xs">
                    Наименование *
                  </Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 h-9"
                    placeholder="Название проекта"
                  />
                </div>

                <div>
                  <Label htmlFor="create-manager" className="text-xs">
                    Менеджер проекта
                  </Label>
                  <Select
                    value={formData.manager}
                    onValueChange={(value) => setFormData({ ...formData, manager: value })}
                    disabled={isGip}
                  >
                    <SelectTrigger id="create-manager" className="mt-1 h-9">
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
                </div>

                <div>
                  <Label htmlFor="create-department" className="text-xs">
                    Подразделение
                  </Label>
                  <Select
                    value={formData.departmentId || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, departmentId: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger id="create-department" className="mt-1 h-9">
                      <SelectValue placeholder="Без подразделения" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без подразделения</SelectItem>
                      {availableDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="create-organization" className="text-xs">
                    Контрагент
                  </Label>
                  <Select
                    value={formData.organization}
                    onValueChange={(value) => setFormData({ ...formData, organization: value })}
                  >
                    <SelectTrigger id="create-organization" className="mt-1 h-9">
                      <SelectValue placeholder="Выберите контрагента" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractorOptions.map((option) => (
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
                </div>

                <div>
                  <Label htmlFor="create-external-link" className="text-xs">
                    Папка хранилища
                  </Label>
                  <Input
                    id="create-external-link"
                    type="url"
                    value={formData.externalLink}
                    onChange={(e) => setFormData({ ...formData, externalLink: e.target.value })}
                    className="mt-1 h-9"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label htmlFor="create-start" className="text-xs">
                    Дата начала
                  </Label>
                  <Input
                    id="create-start"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>

                <div>
                  <Label htmlFor="create-end" className="text-xs">
                    Дата окончания
                  </Label>
                  <Input
                    id="create-end"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="create-description" className="text-xs">
                    Описание
                  </Label>
                  <Input
                    id="create-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 h-9"
                    placeholder="Краткое описание проекта"
                  />
                </div>
              </div>

              {canViewBudget && (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-3">
                  <div>
                    <Label htmlFor="create-budget" className="text-xs">
                      Общий бюджет проекта (руб.)
                    </Label>
                    <Input
                      id="create-budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="mt-1 h-9"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 flex flex-col py-4">
              <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <h3 className="text-sm font-semibold text-foreground">
                  Разделы проекта {sections.length > 0 && `(${sections.length})`}
                </h3>

                <Button variant="outline" size="sm" className="gap-2" onClick={() => setTemplateDialogOpen(true)}>
                  <FileUp className="h-4 w-4" />
                  Загрузить шаблон
                </Button>
              </div>

              <div className="flex-1 min-h-[300px]">
              <ProjectSectionsTable
                sections={sections}
                onChange={setSections}
                users={users}
                canAssignExecutors={canAssignExecutors}
              />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-background shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Отменить
            </Button>
            <Button onClick={handleCreate}>Создать проект</Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="contractor-name">Название *</Label>
              <Input
                id="contractor-name"
                value={contractorForm.name}
                onChange={(e) => setContractorForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor-inn">ИНН *</Label>
              <Input
                id="contractor-inn"
                value={contractorForm.inn}
                onChange={(e) => setContractorForm((prev) => ({ ...prev, inn: e.target.value }))}
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
    </>
  );
}
