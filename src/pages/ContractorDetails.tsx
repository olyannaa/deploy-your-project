import { useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import { TimeTrackingDialog } from "@/components/TimeTrackingDialog";
import { toast } from "sonner";
import { ArrowLeft, Clock, MoreHorizontal, Plus, UserCog } from "lucide-react";

export default function ContractorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentRole } = useRole();

  const canManageExecutors = currentRole === "admin";
  const canViewTimeTracking = currentRole === "admin" || currentRole === "accountant";
  const canSetPassword = currentRole === "admin";
  const canEditContractor = currentRole === "admin";

  const [selectedExecutor, setSelectedExecutor] = useState<any | null>(null);
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const [isExecutorDialogOpen, setIsExecutorDialogOpen] = useState(false);
  const [editingExecutor, setEditingExecutor] = useState<any | null>(null);
  const [executorToDelete, setExecutorToDelete] = useState<any | null>(null);
  const [isExecutorDeleteOpen, setIsExecutorDeleteOpen] = useState(false);
  const [isContractorDialogOpen, setIsContractorDialogOpen] = useState(false);
  const [contractorForm, setContractorForm] = useState({ name: "", inn: "" });
  const [executorForm, setExecutorForm] = useState({
    fullName: "",
    email: "",
    password: "",
    dailyRate: "",
    contractRate: "",
  });

  const { data: contractor } = useQuery({
    queryKey: ["contractor", id],
    queryFn: () => apiFetch<any>(`/contractors/${id}`),
    enabled: !!id,
  });

  const { data: executors = [] } = useQuery({
    queryKey: ["contractor", id, "users"],
    queryFn: () => apiFetch<any[]>(`/users?contractorId=${id}`),
    enabled: !!id,
  });

  const executorsView = useMemo(
    () =>
      executors.map((executor) => ({
        id: executor.id,
        name: executor.fullName,
        email: executor.email,
        projects: executor.activeProjects ?? 0,
        dailyRate: executor.dailyRate,
        contractRate: executor.contractRate,
      })),
    [executors],
  );

  const resetExecutorForm = () => {
    setExecutorForm({
      fullName: "",
      email: "",
      password: "",
      dailyRate: "",
      contractRate: "",
    });
  };

  const resetContractorForm = () => {
    setContractorForm({ name: "", inn: "" });
  };

  const openExecutorDialog = (executor?: any) => {
    if (executor) {
      setEditingExecutor(executor);
      setExecutorForm({
        fullName: executor.name ?? "",
        email: executor.email ?? "",
        password: "",
        dailyRate: executor.dailyRate ? String(executor.dailyRate) : "",
        contractRate: executor.contractRate ? String(executor.contractRate) : "",
      });
    } else {
      setEditingExecutor(null);
      resetExecutorForm();
    }
    setIsExecutorDialogOpen(true);
  };

  const openContractorDialog = () => {
    setContractorForm({
      name: contractor?.name ?? "",
      inn: contractor?.inn ?? "",
    });
    setIsContractorDialogOpen(true);
  };

  const handleExecutorClick = (executor: any) => {
    if (!canViewTimeTracking) {
      return;
    }
    setSelectedExecutor(executor);
    setIsTimeDialogOpen(true);
  };

  const handleSaveExecutor = async () => {
    const isEdit = Boolean(editingExecutor);
    if (!executorForm.fullName.trim() || !executorForm.email.trim()) {
      toast.error("\u041d\u0430\u043f\u043e\u043b\u043d\u0438\u0442\u0435 \u0438\u043c\u044f \u0438 email");
      return;
    }
    if (!isEdit && canSetPassword && !executorForm.password) {
      toast.error("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c");
      return;
    }

    const contractRateValue = Number(executorForm.contractRate || 0);
    const contractRate = contractRateValue > 0 ? contractRateValue : null;
    const dailyRate = contractRate ? 0 : Number(executorForm.dailyRate || 0);

    const payload: any = {
      fullName: executorForm.fullName.trim(),
      email: executorForm.email.trim(),
      contractorId: id,
      roles: ["executor"],
      dailyRate,
      contractRate,
    };

    if (canSetPassword && executorForm.password) {
      payload.password = executorForm.password;
    }

    try {
      if (editingExecutor) {
        await apiFetch(`/users/${editingExecutor.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d");
      } else {
        await apiFetch("/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c \u0441\u043e\u0437\u0434\u0430\u043d");
      }
      queryClient.invalidateQueries({ queryKey: ["contractor", id, "users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "all"] });
      resetExecutorForm();
      setEditingExecutor(null);
      setIsExecutorDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f");
    }
  };

  const handleSaveContractor = async () => {
    if (!contractor) {
      return;
    }
    if (!contractorForm.name.trim() || !contractorForm.inn.trim()) {
      toast.error("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0438 \u0418\u041d\u041d");
      return;
    }
    try {
      await apiFetch(`/contractors/${contractor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: contractorForm.name.trim(),
          inn: contractorForm.inn.trim(),
        }),
      });
      toast.success("\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d");
      queryClient.invalidateQueries({ queryKey: ["contractor", id] });
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setIsContractorDialogOpen(false);
      resetContractorForm();
    } catch (error: any) {
      toast.error(
        error.message ||
          "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u0430",
      );
    }
  };

  const handleDeleteExecutor = async () => {
    if (!executorToDelete) {
      return;
    }
    try {
      await apiFetch(`/users/${executorToDelete.id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["contractor", id, "users"] });
      queryClient.invalidateQueries({ queryKey: ["users", "all"] });
      toast.success("\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c \u0443\u0434\u0430\u043b\u0435\u043d");
    } catch (error: any) {
      toast.error(error.message || "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f");
    } finally {
      setIsExecutorDeleteOpen(false);
      setExecutorToDelete(null);
    }
  };

  const hasContractRate = Number(executorForm.contractRate || 0) > 0;
  const hasDailyRate = Number(executorForm.dailyRate || 0) > 0;

  if (!id) {
    return <Navigate to="/organization" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/organization")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {`\u041a \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438`}
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {contractor?.name ?? "\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {contractor?.inn ? `\u0418\u041d\u041d: ${contractor.inn}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canEditContractor && (
            <Button variant="outline" className="gap-2 shadow-soft" onClick={openContractorDialog}>
              {`\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u0430`}
            </Button>
          )}
          {canManageExecutors && (
            <Button className="gap-2 shadow-soft" onClick={() => openExecutorDialog()}>
              <Plus className="h-4 w-4" />
              {`\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f`}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {`\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u0438 \u043a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u0430`}
          </h2>
        </div>

        <Card className="border-border/40 bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-4 text-sm font-semibold text-foreground">
                    {`\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c`}
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">
                    {`Email`}
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">
                    {`\u041f\u0440\u043e\u0435\u043a\u0442\u043e\u0432`}
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">
                    {`\u0427\u0435\u043b/\u0434\u0435\u043d\u044c (\u0440\u0443\u0431.)`}
                  </th>
                  <th className="text-right p-4 text-sm font-semibold text-foreground">
                    {`\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f`}
                  </th>
                </tr>
              </thead>
              <tbody>
                {executorsView.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                      {`\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u0435\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442`}
                    </td>
                  </tr>
                ) : (
                  executorsView.map((executor) => (
                    <tr
                      key={executor.id}
                      className={`border-b border-border transition-colors ${
                        canViewTimeTracking ? "hover:bg-muted/50 cursor-pointer" : ""
                      }`}
                      onClick={() => handleExecutorClick(executor)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <UserCog className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{executor.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{executor.email}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{executor.projects}</Badge>
                      </td>
                      <td className="p-4">
                        {executor.contractRate ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            {executor.contractRate.toLocaleString()} ({`\u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442`})
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {executor.dailyRate?.toLocaleString() ?? "-"}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canViewTimeTracking && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleExecutorClick(executor)}
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          {canManageExecutors && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => openExecutorDialog(executor)}>
                                  {`\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c`}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setExecutorToDelete(executor);
                                    setIsExecutorDeleteOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  {`\u0423\u0434\u0430\u043b\u0438\u0442\u044c`}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedExecutor && (
        <TimeTrackingDialog
          open={isTimeDialogOpen}
          onOpenChange={setIsTimeDialogOpen}
          employeeId={selectedExecutor.id}
          employeeName={selectedExecutor.name}
          hourlyRate={selectedExecutor.dailyRate}
          contractRate={selectedExecutor.contractRate || undefined}
          contractorName={contractor?.name}
        />
      )}

      <Dialog
        open={isContractorDialogOpen}
        onOpenChange={(open) => {
          setIsContractorDialogOpen(open);
          if (!open) {
            resetContractorForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{`\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442\u0430`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="contractor-name">{`\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 *`}</Label>
              <Input
                id="contractor-name"
                value={contractorForm.name}
                onChange={(e) =>
                  setContractorForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={`\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractor-inn">{`\u0418\u041d\u041d *`}</Label>
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
              {`\u041e\u0442\u043c\u0435\u043d\u0430`}
            </Button>
            <Button onClick={handleSaveContractor}>
              {`\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isExecutorDialogOpen}
        onOpenChange={(open) => {
          setIsExecutorDialogOpen(open);
          if (!open) {
            resetExecutorForm();
            setEditingExecutor(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExecutor
                ? `\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044f`
                : `\u041d\u043e\u0432\u044b\u0439 \u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="executor-name">{`\u0418\u043c\u044f *`}</Label>
              <Input
                id="executor-name"
                value={executorForm.fullName}
                onChange={(e) =>
                  setExecutorForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder={`\u0418\u043c\u044f \u0438 \u0444\u0430\u043c\u0438\u043b\u0438\u044f`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="executor-email">Email *</Label>
              <Input
                id="executor-email"
                type="email"
                value={executorForm.email}
                onChange={(e) =>
                  setExecutorForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="user@company.com"
              />
            </div>
            {canSetPassword ? (
              <div className="space-y-2">
                <Label htmlFor="executor-password">{`\u041f\u0430\u0440\u043e\u043b\u044c${editingExecutor ? "" : " *"}`}</Label>
                <Input
                  id="executor-password"
                  type="password"
                  value={executorForm.password}
                  onChange={(e) =>
                    setExecutorForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="executor-daily">
                  {`\u0427\u0435\u043b/\u0434\u0435\u043d\u044c`}
                </Label>
                <Input
                  id="executor-daily"
                  type="number"
                  value={executorForm.dailyRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExecutorForm((prev) => ({
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
                <Label htmlFor="executor-contract">{`\u041a\u043e\u043d\u0442\u0440\u0430\u043a\u0442`}</Label>
                <Input
                  id="executor-contract"
                  type="number"
                  value={executorForm.contractRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setExecutorForm((prev) => ({
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
            <Button variant="outline" onClick={() => setIsExecutorDialogOpen(false)}>
              {`\u041e\u0442\u043c\u0435\u043d\u0430`}
            </Button>
            <Button onClick={handleSaveExecutor}>
              {editingExecutor ? `\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c` : `\u0421\u043e\u0437\u0434\u0430\u0442\u044c`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isExecutorDeleteOpen} onOpenChange={setIsExecutorDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`\u0423\u0434\u0430\u043b\u0438\u0442\u044c?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {`\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043d\u0435\u043b\u044c\u0437\u044f \u043e\u0442\u043c\u0435\u043d\u0438\u0442\u044c. \u0414\u0430\u043d\u043d\u044b\u0435 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043b\u0435\u043d\u044b.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{`\u041e\u0442\u043c\u0435\u043d\u0430`}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExecutor}>
              {`\u0414\u0430`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
