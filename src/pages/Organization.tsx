import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  Users, 
  Plus,
  MoreHorizontal,
  UserCog,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { TimeTrackingDialog } from "@/components/TimeTrackingDialog";
import { useRole } from "@/contexts/RoleContext";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const departmentColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
];

const contractorColors = [
  "from-emerald-500 to-emerald-600",
  "from-amber-500 to-amber-600",
  "from-rose-500 to-rose-600",
  "from-sky-500 to-sky-600",
];

const roleLabels: Record<string, string> = {
  admin: "Администратор",
  gip: "ГИП",
  executor: "Исполнитель",
  accountant: "Бухгалтер",
};

const formatRoles = (roles: string[]) => {
  const labels = roles.map((role) => roleLabels[role] ?? role).filter(Boolean);
  return Array.from(new Set(labels)).join(", ");
};

const resolvePrimaryRole = (roles: string[] = []) => {
  if (roles.includes("admin")) {
    return "admin";
  }
  if (roles.includes("gip")) {
    return "gip";
  }
  if (roles.includes("accountant")) {
    return "accountant";
  }
  return "executor";
};

export default function Organization() {
  const { currentRole } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any | null>(null);
  const [isDepartmentEmployeesOpen, setIsDepartmentEmployeesOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<any | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<any | null>(null);
  const [isDepartmentDeleteOpen, setIsDepartmentDeleteOpen] = useState(false);
  const [isEmployeeDeleteOpen, setIsEmployeeDeleteOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState({ name: "", description: "" });
  const [employeeForm, setEmployeeForm] = useState({
    fullName: "",
    email: "",
    password: "",
    departmentIds: [] as string[],
    primaryDepartmentId: "",
    role: "executor",
    canApproveSubcontracts: false,
    dailyRate: "",
    contractRate: "",
  });
  const [isPasswordChangeEnabled, setIsPasswordChangeEnabled] = useState(false);
  const [isPrimaryDepartmentUnset, setIsPrimaryDepartmentUnset] = useState(false);
  const [activeTab, setActiveTab] = useState("structure");
  const [isContractorDialogOpen, setIsContractorDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<any | null>(null);
  const [contractorToDelete, setContractorToDelete] = useState<any | null>(null);
  const [isContractorDeleteOpen, setIsContractorDeleteOpen] = useState(false);
  const [contractorForm, setContractorForm] = useState({ name: "", inn: "" });

  const canAccess = ["admin", "accountant"].includes(currentRole);
  const canViewTimeTracking = ["admin", "accountant"].includes(currentRole);
  const canEditDepartments = currentRole === "admin";
  const canEditEmployees = ["admin", "accountant"].includes(currentRole);
  const canAddEmployees = currentRole === "admin";
  const canDeleteEmployees = currentRole === "admin";
  const canAssignAdmin = currentRole === "admin";
  const canSetPassword = currentRole === "admin";
  const canEditContractors = currentRole === "admin";
  const canAddContractors = currentRole === "admin";

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<any[]>("/departments"),
    enabled: canAccess,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["users", "internal"],
    queryFn: () => apiFetch<any[]>("/users?scope=internal"),
    enabled: canAccess,
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: () => apiFetch<any[]>("/contractors"),
    enabled: canAccess,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<any[]>("/projects"),
    enabled: canAccess,
  });

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects],
  );

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["organization", "project-members", activeProjects.map((project) => project.id)],
    queryFn: async () => {
      if (activeProjects.length === 0) {
        return [];
      }
      const members = await Promise.all(
        activeProjects.map((project) => apiFetch<any[]>(`/projects/${project.id}/members`)),
      );
      return activeProjects.map((project, index) => ({
        projectId: project.id,
        members: members[index] ?? [],
      }));
    },
    enabled: canAccess && activeProjects.length > 0,
  });

  const activeProjectsByUserId = useMemo(() => {
    const counts = new Map<string, number>();
    projectMembers.forEach((project: any) => {
      (project.members || []).forEach((member: any) => {
        counts.set(member.id, (counts.get(member.id) ?? 0) + 1);
      });
    });
    return counts;
  }, [projectMembers]);

  const departmentProjectsCount = useMemo(() => {
    const departmentByUserId = new Map<string, string>();
    employees.forEach((employee) => {
      const primaryDepartment = employee.primaryDepartmentId ?? employee.departmentId ?? null;
      if (primaryDepartment) {
        departmentByUserId.set(employee.id, primaryDepartment);
      }
    });

    const departmentProjects = new Map<string, Set<string>>();
    projectMembers.forEach((project: any) => {
      const projectId = project.projectId;
      (project.members || []).forEach((member: any) => {
        const departmentId = departmentByUserId.get(member.id);
        if (!departmentId) return;
        if (!departmentProjects.has(departmentId)) {
          departmentProjects.set(departmentId, new Set());
        }
        departmentProjects.get(departmentId)?.add(projectId);
      });
    });

    const counts = new Map<string, number>();
    departmentProjects.forEach((projectIds, departmentId) => {
      counts.set(departmentId, projectIds.size);
    });
    return counts;
  }, [employees, projectMembers]);

  const departmentsView = useMemo(
    () =>
      departments.map((dept, index) => ({
        ...dept,
        head: "—",
        employeesCount: employees.filter((emp) => {
          const deptIds = emp.departmentIds ?? (emp.departmentId ? [emp.departmentId] : []);
          return deptIds.includes(dept.id);
        }).length,
        projects: departmentProjectsCount.get(dept.id) ?? 0,
        color: departmentColors[index % departmentColors.length],
      })),
    [departments, employees, departmentProjectsCount],
  );

  const employeesView = useMemo(
    () =>
      employees.map((employee) => {
        const departmentIds = employee.departmentIds ?? (employee.departmentId ? [employee.departmentId] : []);
        const primaryDepartmentId = employee.primaryDepartmentId ?? employee.departmentId ?? "";
        const fallbackDepartmentId = primaryDepartmentId || departmentIds[0] || "";
        const departmentNames = departmentIds
          .map((id) => departments.find((dept) => dept.id === id)?.name)
          .filter(Boolean) as string[];
        const primaryDepartmentName =
          departments.find((dept) => dept.id === fallbackDepartmentId)?.name ||
          departmentNames[0] ||
          "—";
        const departmentCount = departmentIds.length;
        const departmentLabel =
          departmentCount === 0
            ? "—"
            : departmentCount > 1
              ? `${primaryDepartmentName} +${departmentCount - 1}`
              : primaryDepartmentName;

        return {
          id: employee.id,
          fullName: employee.fullName,
          name: employee.fullName,
          email: employee.email,
          departmentId: primaryDepartmentId,
          departmentIds,
          primaryDepartmentId,
          roles: employee.roles ?? [],
          department: departmentLabel,
          departmentTitle: departmentNames.join(", "),
          role: employee.roles?.length ? formatRoles(employee.roles) : "?",
          projects: Number(
            employee.activeProjects ??
              activeProjectsByUserId.get(employee.id) ??
              employee.projects ??
              0,
          ),
          dailyRate: employee.dailyRate,
          hourlyRate: employee.dailyRate,
          contractRate: employee.contractRate,
          canApproveSubcontracts: Boolean(employee.canApproveSubcontracts),
        };
      }),
    [employees, departments, activeProjectsByUserId],
  );

  const contractorsView = useMemo(
    () =>
      contractors.map((contractor, index) => ({
        ...contractor,
        color: contractorColors[index % contractorColors.length],
      })),
    [contractors],
  );

  const departmentEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    return employeesView.filter((employee) => (employee.departmentIds ?? []).includes(selectedDepartment.id));
  }, [employeesView, selectedDepartment]);

  const handleEmployeeClick = (employee: any) => {
    if (!canViewTimeTracking) {
      return;
    }
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDepartmentClick = (department: any) => {
    setSelectedDepartment(department);
    setIsDepartmentEmployeesOpen(true);
  };

  const handleContractorClick = (contractor: any) => {
    navigate(`/organization/contractors/${contractor.id}`);
  };

  const resetDepartmentForm = () => {
    setDepartmentForm({ name: "", description: "" });
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      fullName: "",
      email: "",
      password: "",
      departmentIds: [],
      primaryDepartmentId: "",
      role: "executor",
      canApproveSubcontracts: false,
      dailyRate: "",
      contractRate: "",
    });
    setIsPasswordChangeEnabled(false);
    setIsPrimaryDepartmentUnset(false);
  };

  const toggleDepartment = (departmentId: string) => {
    setEmployeeForm((prev) => {
      const nextIds = prev.departmentIds ? [...prev.departmentIds] : [];
      const exists = nextIds.includes(departmentId);
      const updated = exists ? nextIds.filter((id) => id !== departmentId) : [...nextIds, departmentId];
      let primary = prev.primaryDepartmentId;
      if (!isPrimaryDepartmentUnset) {
        if (primary && !updated.includes(primary)) {
          primary = updated[0] ?? "";
        }
        if (!primary && updated.length > 0) {
          primary = updated[0];
        }
      } else if (updated.length === 0) {
        primary = "";
      }
      return { ...prev, departmentIds: updated, primaryDepartmentId: primary };
    });
  };

  const resetContractorForm = () => {
    setContractorForm({ name: "", inn: "" });
  };

  const openDepartmentDialog = (department?: any) => {
    if (department) {
      setEditingDepartment(department);
      setDepartmentForm({
        name: department.name ?? "",
        description: department.description ?? "",
      });
    } else {
      setEditingDepartment(null);
      resetDepartmentForm();
    }
    setIsDepartmentDialogOpen(true);
  };

  const openEmployeeDialog = (employee?: any) => {
    if (employee && !canAssignAdmin && employee.roles?.includes("admin")) {
      toast.error("Недостаточно прав для редактирования администратора");
      return;
    }
    if (employee) {
      setEditingEmployee(employee);
      setIsPasswordChangeEnabled(false);
      setIsPrimaryDepartmentUnset(
        !(employee.primaryDepartmentId ?? employee.departmentId ?? ""),
      );
      setEmployeeForm({
        fullName: employee.fullName ?? employee.name ?? "",
        email: employee.email ?? "",
        password: "",
        departmentIds:
          employee.departmentIds ??
          (employee.departmentId ? [employee.departmentId] : []),
        primaryDepartmentId: employee.primaryDepartmentId ?? employee.departmentId ?? "",
        role: resolvePrimaryRole(employee.roles ?? []),
        canApproveSubcontracts: Boolean(employee.canApproveSubcontracts),
        dailyRate: employee.dailyRate ? String(employee.dailyRate) : "",
        contractRate: employee.contractRate ? String(employee.contractRate) : "",
      });
    } else {
      setEditingEmployee(null);
      setIsPasswordChangeEnabled(false);
      setIsPrimaryDepartmentUnset(false);
      resetEmployeeForm();
    }
    setIsEmployeeDialogOpen(true);
  };

  const openContractorDialog = (contractor?: any) => {
    if (contractor) {
      setEditingContractor(contractor);
      setContractorForm({
        name: contractor.name ?? "",
        inn: contractor.inn ?? "",
      });
    } else {
      setEditingContractor(null);
      resetContractorForm();
    }
    setIsContractorDialogOpen(true);
  };

  const handleSaveDepartment = async () => {
    if (!departmentForm.name.trim()) {
      toast.error("Введите название подразделения");
      return;
    }

    try {
      if (editingDepartment) {
        await apiFetch(`/departments/${editingDepartment.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: departmentForm.name.trim(),
            description: departmentForm.description.trim() || null,
          }),
        });
        toast.success("Подразделение обновлено");
      } else {
        await apiFetch("/departments", {
          method: "POST",
          body: JSON.stringify({
            name: departmentForm.name.trim(),
            description: departmentForm.description.trim() || null,
          }),
        });
        toast.success("Подразделение создано");
      }
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      resetDepartmentForm();
      setEditingDepartment(null);
      setIsDepartmentDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить подразделение");
    }
  };

  const handleSaveEmployee = async () => {
    const isEdit = Boolean(editingEmployee);
    if (!employeeForm.fullName.trim() || !employeeForm.email.trim()) {
      toast.error("Заполните имя и email");
      return;
    }
    if (!isEdit && canSetPassword && !employeeForm.password) {
      toast.error("Введите пароль");
      return;
    }
    if (isEdit && canSetPassword && isPasswordChangeEnabled && !employeeForm.password) {
      toast.error("Введите пароль");
      return;
    }
    if (!canAssignAdmin && employeeForm.role === "admin") {
      toast.error("Недостаточно прав для назначения администратора");
      return;
    }

    const contractRateValue = Number(employeeForm.contractRate || 0);
    const contractRate = contractRateValue > 0 ? contractRateValue : null;
    const dailyRate = contractRate ? 0 : Number(employeeForm.dailyRate || 0);

    const resolvedDepartmentIds = employeeForm.departmentIds ?? [];
    const primaryDepartmentId = isPrimaryDepartmentUnset
      ? null
      : employeeForm.primaryDepartmentId &&
          resolvedDepartmentIds.includes(employeeForm.primaryDepartmentId)
        ? employeeForm.primaryDepartmentId
        : resolvedDepartmentIds[0] ?? null;

    const payload: any = {
      fullName: employeeForm.fullName.trim(),
      email: employeeForm.email.trim(),
      departmentIds: resolvedDepartmentIds,
      primaryDepartmentId,
      roles: [employeeForm.role],
      dailyRate,
      contractRate,
    };

    if (canAssignAdmin) {
      payload.canApproveSubcontracts =
        employeeForm.role === "admin" ? Boolean(employeeForm.canApproveSubcontracts) : false;
    }

    if (
      canSetPassword &&
      employeeForm.password &&
      (!isEdit || isPasswordChangeEnabled)
    ) {
      payload.password = employeeForm.password;
    }

    try {
      if (editingEmployee) {
        await apiFetch(`/users/${editingEmployee.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Сотрудник обновлен");
      } else {
        await apiFetch("/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Сотрудник создан");
      }
      queryClient.invalidateQueries({ queryKey: ["users", "internal"] });
      queryClient.invalidateQueries({ queryKey: ["users", "all"] });
      resetEmployeeForm();
      setEditingEmployee(null);
      setIsEmployeeDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить сотрудника");
    }
  };

  const handleSaveContractor = async () => {
    if (!contractorForm.name.trim() || !contractorForm.inn.trim()) {
      toast.error("Заполните название и ИНН");
      return;
    }

    try {
      if (editingContractor) {
        await apiFetch(`/contractors/${editingContractor.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: contractorForm.name.trim(),
            inn: contractorForm.inn.trim(),
          }),
        });
        toast.success("Контрагент обновлен");
      } else {
        await apiFetch("/contractors", {
          method: "POST",
          body: JSON.stringify({
            name: contractorForm.name.trim(),
            inn: contractorForm.inn.trim(),
          }),
        });
        toast.success("Контрагент создан");
      }
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      resetContractorForm();
      setEditingContractor(null);
      setIsContractorDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Не удалось сохранить контрагента");
    }
  };

  const handleDeleteContractor = async () => {
    if (!contractorToDelete) {
      return;
    }
    try {
      await apiFetch(`/contractors/${contractorToDelete.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Контрагент удален");
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить контрагента");
    } finally {
      setIsContractorDeleteOpen(false);
      setContractorToDelete(null);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) {
      return;
    }
    try {
      await apiFetch(`/departments/${departmentToDelete.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Подразделение удалено");
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить подразделение");
    } finally {
      setIsDepartmentDeleteOpen(false);
      setDepartmentToDelete(null);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) {
      return;
    }
    if (!canDeleteEmployees) {
      toast.error("Недостаточно прав для удаления сотрудника");
      setIsEmployeeDeleteOpen(false);
      setEmployeeToDelete(null);
      return;
    }
    if (!canAssignAdmin && employeeToDelete.roles?.includes("admin")) {
      toast.error("Недостаточно прав для удаления администратора");
      setIsEmployeeDeleteOpen(false);
      setEmployeeToDelete(null);
      return;
    }
    try {
      await apiFetch(`/users/${employeeToDelete.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["users", "internal"] });
      queryClient.invalidateQueries({ queryKey: ["users", "all"] });
      toast.success("Сотрудник удален");
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить сотрудника");
    } finally {
      setIsEmployeeDeleteOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const hasContractRate = Number(employeeForm.contractRate || 0) > 0;
  const hasDailyRate = Number(employeeForm.dailyRate || 0) > 0;

  if (!canAccess) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Структура организации</h1>
          <p className="text-muted-foreground mt-1">Управление подразделениями и сотрудниками</p>
        </div>
        {activeTab === "structure" && canEditDepartments && (
          <Button
            className="gap-2 shadow-soft w-full sm:w-auto"
            onClick={() => openDepartmentDialog()}
          >
            <Plus className="h-4 w-4" />
            {`\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0434\u0440\u0430\u0437\u0434\u0435\u043b\u0435\u043d\u0438\u0435`}
          </Button>
        )}
        {activeTab === "contractors" && canAddContractors && (
          <Button
            className="gap-2 shadow-soft w-full sm:w-auto"
            onClick={() => openContractorDialog()}
          >
            <Plus className="h-4 w-4" />
            {`Добавить контрагента`}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="structure">{`Структура`}</TabsTrigger>
          <TabsTrigger value="contractors">{`Контрагенты`}</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-8">
          {/* Departments Grid */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Подразделения</h2>
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {departmentsView.map((dept) => (
            <Card
              key={dept.id}
              onClick={() => handleDepartmentClick(dept)}
              className="relative cursor-pointer overflow-hidden border-2 border-border bg-card shadow-soft transition-all hover:shadow-medium"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${dept.color}`} />
              <div className="p-4 md:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${dept.color}`}>
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{dept.name}</h3>
                      <p className="text-sm text-muted-foreground">{dept.description}</p>
                    </div>
                  </div>
                  {canEditDepartments && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openDepartmentDialog(dept)}>
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setDepartmentToDelete(dept);
                            setIsDepartmentDeleteOpen(true);
                          }}
                          className="text-destructive"
                        >
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Руководитель</span>
                    <span className="font-medium text-foreground">{dept.head}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Сотрудников
                    </span>
                    <Badge variant="secondary">{dept.employeesCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Активных проектов</span>
                    <Badge variant="default">{dept.projects}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Employees Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Сотрудники</h2>
        {canAddEmployees && (
          <Button variant="outline" className="gap-2" onClick={() => openEmployeeDialog()}>
            <Plus className="h-4 w-4" />
            Добавить сотрудника
          </Button>
        )}
        </div>
        <Card className="border-border/40 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Сотрудник</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Подразделение</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Должность</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Проектов</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Чел/день (руб.)</th>
                  <th className="text-right p-4 text-sm font-semibold text-foreground">Действия</th>
                </tr>
              </thead>
              <tbody>
                {employeesView.map((employee) => {
                  const canManageEmployee =
                    canEditEmployees && (currentRole === "admin" || !employee.roles?.includes("admin"));
                  const canDeleteEmployeeRow =
                    canDeleteEmployees && (currentRole === "admin" || !employee.roles?.includes("admin"));
                  const canOpenTimesheet = canViewTimeTracking;
                  return (
                    <tr 
                      key={employee.id} 
                      className={`border-b border-border transition-colors ${canOpenTimesheet ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
                      onClick={() => handleEmployeeClick(employee)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <UserCog className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{employee.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <span title={employee.departmentTitle || undefined}>
                          {employee.department}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{employee.role}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{employee.projects}</Badge>
                      </td>
                      <td className="p-4">
                        {employee.contractRate ? (
                          <div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                              {employee.contractRate.toLocaleString()} (контракт)
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{employee.hourlyRate?.toLocaleString() ?? "-"}</span>
                        )}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canOpenTimesheet && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEmployeeClick(employee)}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          {canManageEmployee && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => openEmployeeDialog(employee)}>
                                  Редактировать
                                </DropdownMenuItem>
                                {canDeleteEmployeeRow && (
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setEmployeeToDelete(employee);
                                      setIsEmployeeDeleteOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    Удалить
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

        </TabsContent>
        <TabsContent value="contractors" className="space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">{`Контрагенты`}</h2>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {contractorsView.length === 0 ? (
                <Card className="border-dashed border-border/60 bg-muted/30 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {`Нет контрагентов`}
                  </p>
                </Card>
              ) : (
                contractorsView.map((contractor: any) => (
                  <Card
                    key={contractor.id}
                    onClick={() => handleContractorClick(contractor)}
                    className="relative cursor-pointer overflow-hidden border-2 border-border bg-card shadow-soft transition-all hover:shadow-medium"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${contractor.color}`} />
                    <div className="p-4 md:p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${contractor.color}`}>
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{contractor.name}</h3>
                            <p className="text-sm text-muted-foreground">{`ИНН: ${contractor.inn}`}</p>
                          </div>
                        </div>
                        {canEditContractors && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  openContractorDialog(contractor);
                                }}
                              >
                                {`Редактировать`}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setContractorToDelete(contractor);
                                  setIsContractorDeleteOpen(true);
                                }}
                                className="text-destructive"
                              >
                                {`Удалить`}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {`Исполнителей`}
                          </span>
                          <Badge variant="secondary">{contractor.executorsCount ?? 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{`Активных проектов`}</span>
                          <Badge variant="default">{contractor.activeProjects ?? 0}</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Time Tracking Dialog */}
      {selectedEmployee && (
        <TimeTrackingDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          hourlyRate={selectedEmployee.hourlyRate}
          contractRate={selectedEmployee.contractRate || undefined}
        />
      )}

      <Dialog
        open={isDepartmentEmployeesOpen}
        onOpenChange={(open) => {
          setIsDepartmentEmployeesOpen(open);
          if (!open) {
            setSelectedDepartment(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Сотрудники подразделения</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {selectedDepartment?.name}
            </div>
            <div className="max-h-[360px] overflow-y-auto rounded-md border border-border/40">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">Сотрудник</th>
                    <th className="text-left p-3 font-semibold text-foreground">Подразделение</th>
                    <th className="text-left p-3 font-semibold text-foreground">Должность</th>
                    <th className="text-left p-3 font-semibold text-foreground">Проектов</th>
                    <th className="text-left p-3 font-semibold text-foreground">Чел/день (руб.)</th>
                    <th className="text-right p-3 font-semibold text-foreground">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                        В подразделении нет сотрудников.
                      </td>
                    </tr>
                  ) : (
                    departmentEmployees.map((employee) => (
                      <tr key={employee.id} className="border-b border-border/40">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <UserCog className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium text-foreground">{employee.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{employee.department}</td>
                        <td className="p-3 text-muted-foreground">{employee.role}</td>
                        <td className="p-3">
                          <Badge variant="secondary">{employee.projects}</Badge>
                        </td>
                        <td className="p-3">
                          {employee.contractRate ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            >
                              {employee.contractRate.toLocaleString()} (контракт)
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">
                              {employee.hourlyRate?.toLocaleString() ?? "-"}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {canViewTimeTracking &&
                            !employee.roles?.some(
                              (role: string) => role === "accountant",
                            ) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEmployeeClick(employee)}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDepartmentDialogOpen}
        onOpenChange={(open) => {
          setIsDepartmentDialogOpen(open);
          if (!open) {
            resetDepartmentForm();
            setEditingDepartment(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Редактирование подразделения" : "Новое подразделение"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Название *</Label>
              <Input
                id="dept-name"
                value={departmentForm.name}
                onChange={(e) =>
                  setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Например, Проектный отдел"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc">Описание</Label>
              <Textarea
                id="dept-desc"
                value={departmentForm.description}
                onChange={(e) =>
                  setDepartmentForm((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
                placeholder="Краткое описание"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveDepartment}>
              {editingDepartment ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEmployeeDialogOpen}
        onOpenChange={(open) => {
          setIsEmployeeDialogOpen(open);
          if (!open) {
            resetEmployeeForm();
            setEditingEmployee(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Редактирование сотрудника" : "Новый сотрудник"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="emp-name">ФИО *</Label>
              <Input
                id="emp-name"
                value={employeeForm.fullName}
                onChange={(e) =>
                  setEmployeeForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-email">Email *</Label>
              <Input
                id="emp-email"
                type="email"
                value={employeeForm.email}
                onChange={(e) =>
                  setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="user@company.com"
              />
            </div>
            {canSetPassword ? (
              <>
                {editingEmployee && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={isPasswordChangeEnabled}
                      onCheckedChange={(checked) => {
                        const enabled = Boolean(checked);
                        setIsPasswordChangeEnabled(enabled);
                        if (!enabled) {
                          setEmployeeForm((prev) => ({ ...prev, password: "" }));
                        }
                      }}
                    />
                    <span>Изменить пароль</span>
                  </label>
                )}
                {(!editingEmployee || isPasswordChangeEnabled) && (
                  <div className="space-y-2">
                    <Label htmlFor="emp-password">{`Пароль${editingEmployee ? "" : " *"}`}</Label>
                    <Input
                      id="emp-password"
                      type="password"
                      value={employeeForm.password}
                      onChange={(e) =>
                        setEmployeeForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Пароль может задавать только администратор.
              </div>
            )}
            <div className="space-y-2">
              <Label>Подразделения</Label>
              <div className="rounded-md border border-border p-2 space-y-2 max-h-40 overflow-y-auto">
                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(employeeForm.departmentIds ?? []).includes(dept.id)}
                      onCheckedChange={() => toggleDepartment(dept.id)}
                    />
                    <span>{dept.name}</span>
                  </label>
                ))}
                {departments.length === 0 && (
                  <div className="text-xs text-muted-foreground">Нет подразделений</div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Основное подразделение</Label>
              <Select
                value={
                  isPrimaryDepartmentUnset || !employeeForm.primaryDepartmentId
                    ? "none"
                    : employeeForm.primaryDepartmentId
                }
                onValueChange={(value) => {
                  if (value === "none") {
                    setIsPrimaryDepartmentUnset(true);
                    setEmployeeForm((prev) => ({
                      ...prev,
                      primaryDepartmentId: "",
                    }));
                  } else {
                    setIsPrimaryDepartmentUnset(false);
                    setEmployeeForm((prev) => ({
                      ...prev,
                      primaryDepartmentId: value,
                    }));
                  }
                }}
                disabled={(employeeForm.departmentIds ?? []).length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не выбран" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не выбран</SelectItem>
                  {departments
                    .filter((dept) => (employeeForm.departmentIds ?? []).includes(dept.id))
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select
                value={employeeForm.role}
                onValueChange={(value) =>
                  setEmployeeForm((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canAssignAdmin && <SelectItem value="admin">Администратор</SelectItem>}
                  <SelectItem value="gip">ГИП</SelectItem>
                  <SelectItem value="executor">Исполнитель</SelectItem>
                  <SelectItem value="accountant">Бухгалтер</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canAssignAdmin && employeeForm.role === "admin" && (
              <label className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <Checkbox
                  checked={employeeForm.canApproveSubcontracts}
                  onCheckedChange={(checked) =>
                    setEmployeeForm((prev) => ({
                      ...prev,
                      canApproveSubcontracts: Boolean(checked),
                    }))
                  }
                />
                <span>Принимать заявки субподряда</span>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="emp-daily">Дневная ставка</Label>
                <Input
                  id="emp-daily"
                  type="number"
                  value={employeeForm.dailyRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmployeeForm((prev) => ({
                      ...prev,
                      dailyRate: value,
                      contractRate: Number(value || 0) > 0 ? "" : prev.contractRate,
                    }));
                  }}
                  disabled={hasContractRate}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-contract">Контракт</Label>
                <Input
                  id="emp-contract"
                  type="number"
                  value={employeeForm.contractRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmployeeForm((prev) => ({
                      ...prev,
                      contractRate: value,
                      dailyRate: Number(value || 0) > 0 ? "" : prev.dailyRate,
                    }));
                  }}
                  disabled={hasDailyRate}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEmployee}>
              {editingEmployee ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isContractorDialogOpen}
        onOpenChange={(open) => {
          setIsContractorDialogOpen(open);
          if (!open) {
            resetContractorForm();
            setEditingContractor(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContractor
                ? `Редактировать контрагента`
                : `Новый контрагент`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contractor-name">{`Название *`}</Label>
              <Input
                id="contractor-name"
                value={contractorForm.name}
                onChange={(e) =>
                  setContractorForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={`ООО Ромашка`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor-inn">{`ИНН *`}</Label>
              <Input
                id="contractor-inn"
                value={contractorForm.inn}
                onChange={(e) =>
                  setContractorForm((prev) => ({ ...prev, inn: e.target.value }))
                }
                placeholder="7700000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContractorDialogOpen(false)}>
              {`Отмена`}
            </Button>
            <Button onClick={handleSaveContractor}>
              {editingContractor
                ? `Сохранить`
                : `Создать`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isContractorDeleteOpen} onOpenChange={setIsContractorDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Действие нельзя отменить. Контрагент будет скрыт из списка.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{`Отмена`}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContractor}>
              {`Да`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDepartmentDeleteOpen} onOpenChange={setIsDepartmentDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие удалит подразделение. Сотрудники останутся без подразделения.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDepartment}>
              Да
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isEmployeeDeleteOpen} onOpenChange={setIsEmployeeDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие удалит пользователя и связанные роли. Восстановление будет невозможно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>
              Да
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}







