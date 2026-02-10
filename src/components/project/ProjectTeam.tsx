import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { TimeTrackingDialog } from "@/components/TimeTrackingDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface Project {
  id: string;
}

interface ProjectTeamProps {
  project: Project;
}

interface TeamMember {
  id: string;
  fullName: string;
  role: string;
  email: string;
  initials: string;
  dailyRate: number | null;
  contractRate: number | null;
  contractorName?: string | null;
}

export default function ProjectTeam({ project }: ProjectTeamProps) {
  const { currentRole } = useRole();
  const { user } = useAuth();
  const canViewTimeTracking = currentRole !== "executor";
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["project", project.id, "members"],
    queryFn: () => apiFetch<any[]>(`/projects/${project.id}/members`),
  });

  const currentMemberRole = useMemo(
    () => members.find((member) => member.id === user?.id)?.projectRole ?? null,
    [members, user?.id],
  );

  const canManage =
    currentRole === "admin" ||
    (currentMemberRole ? ["manager", "lead_specialist"].includes(currentMemberRole) : false);
  const canViewRates =
    currentRole === "admin" ||
    currentRole === "gip" ||
    currentRole === "accountant" ||
    currentMemberRole === "manager";

  const { data: users = [] } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => apiFetch<any[]>("/users?scope=all"),
    enabled: canManage,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => apiFetch<any[]>("/departments"),
    enabled: canManage,
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: () => apiFetch<any[]>("/contractors"),
    enabled: canManage,
  });

  const memberIds = new Set(members.map((member) => member.id));

  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<
    "manager" | "lead_specialist" | "executor" | "accountant"
  >("executor");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [contractorFilter, setContractorFilter] = useState("all");
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isSpecificContractorFilter =
    contractorFilter !== "all" && contractorFilter !== "internal";

  const { data: contractorUsers = [] } = useQuery({
    queryKey: ["users", "contractor", contractorFilter],
    queryFn: () => apiFetch<any[]>(`/users?contractorId=${encodeURIComponent(contractorFilter)}`),
    enabled: canManage && isSpecificContractorFilter,
  });

  const availableUsers = useMemo(() => {
    const sourceUsers = isSpecificContractorFilter ? contractorUsers : users;
    let filtered = sourceUsers.filter((candidate) => !memberIds.has(candidate.id));

    if (departmentFilter !== "all" && !isSpecificContractorFilter) {
      filtered = filtered.filter((user) => {
        const departments = user.departmentIds ?? (user.departmentId ? [user.departmentId] : []);
        return departments.includes(departmentFilter);
      });
    }

    if (contractorFilter === "internal") {
      filtered = filtered.filter((user) => !user.contractorId);
    } else if (isSpecificContractorFilter) {
      filtered = filtered.filter((user) => user.contractorId === contractorFilter);
    }

    return filtered;
  }, [
    users,
    contractorUsers,
    memberIds,
    departmentFilter,
    contractorFilter,
    isSpecificContractorFilter,
  ]);

  const handleMemberClick = (member: TeamMember) => {
    if (canViewTimeTracking) {
      setSelectedMember(member);
      setIsDialogOpen(true);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error("Выберите пользователя");
      return;
    }
    try {
      await apiFetch(`/projects/${project.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: selectedUserId, projectRole: selectedRole }),
      });
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "members"] });
      toast.success("Участник добавлен");
      setSelectedUserId("");
      setSelectedRole("executor");
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Не удалось добавить участника");
    }
  };

  const handleRoleChange = async (
    memberId: string,
    role: "manager" | "lead_specialist" | "executor" | "accountant",
  ) => {
    try {
      await apiFetch(`/projects/${project.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: memberId, projectRole: role }),
      });
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "members"] });
      toast.success("Роль обновлена");
    } catch (error: any) {
      toast.error(error.message || "Не удалось обновить роль");
    }
  };

  const handleRemove = async () => {
    if (!memberToDelete) {
      return;
    }
    try {
      await apiFetch(`/projects/${project.id}/members/${memberToDelete.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["project", project.id, "members"] });
      toast.success("Участник удален");
    } catch (error: any) {
      toast.error(error.message || "Не удалось удалить участника");
    } finally {
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const teamMembers: TeamMember[] = members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    role: member.projectRole,
    email: member.email,
    initials:
      member.fullName
        ?.split(" ")
        .map((part: string) => part[0])
        .join("")
        .toUpperCase() || "--",
    dailyRate: member.dailyRate,
    contractRate: member.contractRate,
    contractorName: member.contractorName,
  }));

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "manager":
        return "Руководитель проекта";
      case "lead_specialist":
        return "Главный специалист";
      case "executor":
        return "Исполнитель";
      case "accountant":
        return "Бухгалтер";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Команда проекта</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {teamMembers.length} участников
          </p>
        </div>
        {canManage && (
          <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Добавить участника
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {teamMembers.map((member) => (
          <Card
            key={member.id}
            className={`border-border/40 bg-card p-4 shadow-soft ${
              canViewTimeTracking ? "cursor-pointer hover:shadow-medium transition-shadow" : ""
            }`}
            onClick={() => handleMemberClick(member)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-foreground">{member.fullName}</h4>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary">{getRoleLabel(member.role)}</Badge>
                  {member.contractorName && (
                    <Badge variant="outline" className="text-xs">
                      {`Контрагент: ${member.contractorName}`}
                    </Badge>
                  )}
                  {canViewRates &&
                    (member.contractRate ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                      >
                        {member.contractRate.toLocaleString()} руб.
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {(member.dailyRate ?? 0).toLocaleString()} руб./день
                      </span>
                    ))}
                </div>
                <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  {canViewTimeTracking && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleMemberClick(member)}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  )}
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, "manager")}>
                          Сделать руководителем
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, "lead_specialist")}>
                          Сделать главным специалистом
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, "executor")}>
                          Сделать исполнителем
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleChange(member.id, "accountant")}>
                          Сделать бухгалтером
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setMemberToDelete(member);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          Удалить из проекта
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedMember && (
        <TimeTrackingDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          employeeId={selectedMember.id}
          employeeName={selectedMember.fullName}
          hourlyRate={selectedMember.dailyRate ?? undefined}
          contractRate={selectedMember.contractRate ?? undefined}
          contractorName={selectedMember.contractorName ?? undefined}
        />
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Подразделение</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все подразделения" />
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
              </div>
              <div className="space-y-2">
                <Label>Контрагент</Label>
                <Select value={contractorFilter} onValueChange={setContractorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все</SelectItem>
                    <SelectItem value="internal">Без контрагента</SelectItem>
                    {contractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id}>
                        {contractor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-user">Пользователь</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="member-user">
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.contractorName
                        ? `${candidate.fullName} (Контрагент: ${candidate.contractorName})`
                        : candidate.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Роль в проекте</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(
                    value as "manager" | "lead_specialist" | "executor" | "accountant",
                  )
                }
              >
                <SelectTrigger id="member-role">
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Руководитель проекта</SelectItem>
                  <SelectItem value="lead_specialist">Главный специалист</SelectItem>
                  <SelectItem value="executor">Исполнитель</SelectItem>
                  <SelectItem value="accountant">Бухгалтер</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddMember}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
            <AlertDialogDescription>
              Участник будет удален из команды проекта.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Да</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
