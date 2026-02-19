import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useRole } from "@/contexts/RoleContext";
import {
  generateWeeks,
  weekLabel,
  getGlobalPayments,
  getProjectSubcontractorPaid,
} from "@/pages/Finance";
import CreateTaskDialog from "@/components/tasks/CreateTaskDialog";

interface ProjectFinanceTabProps {
  project: {
    id: string;
    name: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
  };
}

const reasonLabels: Record<string, string> = {
  salary: "ЗП / Аванс",
  subcontract: "Субподрядчики",
  additional: "Доп. затраты",
  other: "Другое",
};

// Demo data for proj-1 employee costs
const demoEmployeeCosts: Record<string, any[]> = {
  "proj-1": [
    { id: "user-1", name: "Иванов И.И.", workDays: 22, dailyRate: 5500, isContract: false },
    { id: "user-2", name: "Петров П.П.", workDays: 18, dailyRate: 4800, isContract: false },
    { id: "user-3", name: "Сидорова А.С.", workDays: 20, dailyRate: 4200, isContract: false },
    { id: "user-4", name: "Козлов В.М.", workDays: 15, dailyRate: 5000, isContract: false },
    { id: "user-5", name: "ИП Архитектор Плюс", workDays: 0, dailyRate: 0, isContract: true, contractRate: 350000 },
  ],
};

const demoSubcontractors: Record<string, any[]> = {
  "proj-1": [
    { id: "sub-1", contractorName: "ООО «СтройМонтаж»", contractAmount: 1200000 },
    { id: "sub-2", contractorName: "ИП Кузнецов — Геодезия", contractAmount: 450000 },
    { id: "sub-3", contractorName: "ООО «ЭлектроПроект»", contractAmount: 680000 },
  ],
};

const demoAdditionalCosts: Record<string, { id: string; name: string; category: string; amount: number; note: string }[]> = {
  "proj-1": [
    { id: "ac-1", name: "Командировка на площадку", category: "Транспорт", amount: 45000, note: "3 дня, 2 сотрудника" },
    { id: "ac-2", name: "Печать чертежей А0", category: "Материалы", amount: 12500, note: "50 листов" },
    { id: "ac-3", name: "Лицензия AutoCAD (доп.)", category: "ПО", amount: 85000, note: "Годовая подписка" },
    { id: "ac-4", name: "Экспертиза проектной документации", category: "Экспертиза", amount: 180000, note: "Негосударственная экспертиза" },
  ],
};

export default function ProjectFinanceTab({ project }: ProjectFinanceTabProps) {
  const { currentRole } = useRole();
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const { data: analytics } = useQuery({
    queryKey: ["project", project.id, "analytics"],
    queryFn: () => apiFetch<any>(`/projects/${project.id}/analytics`),
    enabled: !!project?.id,
  });

  const { data: projectSubcontractors = [] } = useQuery<any[]>({
    queryKey: ["project", project.id, "subcontractors"],
    queryFn: () => apiFetch(`/projects/${project.id}/subcontractors`),
    enabled: !!project?.id,
  });

  const costs = analytics?.costs ?? { timesheets: 0, contracts: 0, total: 0 };
  const rawEmployeeCosts = analytics?.costsByUser ?? [];
  const employeeCosts = rawEmployeeCosts.length > 0 ? rawEmployeeCosts : (demoEmployeeCosts[project.id] ?? []);

  const displaySubcontractors = projectSubcontractors.length > 0 ? projectSubcontractors : (demoSubcontractors[project.id] ?? []);

  const projectCosts = {
    budget: project.budget ?? 0,
    laborCost: costs.timesheets,
    contractCost: costs.contracts,
    totalCost: costs.total || employeeCosts.reduce((s: number, e: any) => s + (e.isContract ? (e.contractRate || 0) : e.workDays * e.dailyRate), 0),
  };

  const [additionalCosts, setAdditionalCosts] = useState<
    { id: string; name: string; category: string; amount: number; note: string }[]
  >(demoAdditionalCosts[project.id] ?? []);
  const [newCostName, setNewCostName] = useState("");
  const [newCostCategory, setNewCostCategory] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [newCostNote, setNewCostNote] = useState("");

  const addAdditionalCost = () => {
    if (!newCostName || !newCostAmount) return;
    setAdditionalCosts((prev) => [
      ...prev,
      { id: `ac-${Date.now()}`, name: newCostName, category: newCostCategory || "Прочее", amount: parseFloat(newCostAmount) || 0, note: newCostNote },
    ]);
    setNewCostName(""); setNewCostCategory(""); setNewCostAmount(""); setNewCostNote("");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

  const financeWeeks = useMemo(() => {
    if (!project.startDate || !project.endDate) return [];
    return generateWeeks([{ startDate: project.startDate, endDate: project.endDate }]);
  }, [project.startDate, project.endDate]);

  const globalPayments = getGlobalPayments();
  const projectPayments = globalPayments[project.id] || {};
  const totalPaid = Object.values(projectPayments).reduce((s, entries) => s + entries.reduce((es, e) => es + e.amount, 0), 0);

  const canCreateTask = ["admin", "gip", "accountant"].includes(currentRole);

  return (
    <div className="space-y-6">
      {/* Header with button */}
      <div className="flex items-center justify-between">
        <div />
        {canCreateTask && (
          <Button className="gap-2" onClick={() => setIsCreateTaskOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать задачу
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/40 p-4">
          <p className="text-xs text-muted-foreground">Бюджет проекта</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(projectCosts.budget)}</p>
        </Card>
        <Card className="border-border/40 p-4">
          <p className="text-xs text-muted-foreground">Всего выплачено</p>
          <p className="text-lg font-bold text-primary mt-1">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="border-border/40 p-4">
          <p className="text-xs text-muted-foreground">Остаток</p>
          <p className="text-lg font-bold mt-1">{formatCurrency(projectCosts.budget - totalPaid)}</p>
        </Card>
      </div>

      <Tabs defaultValue="finance">
        <TabsList className="inline-flex w-auto">
          <TabsTrigger value="finance">Финансы</TabsTrigger>
          <TabsTrigger value="employees">Учёт времени</TabsTrigger>
          <TabsTrigger value="subcontractors">Субподрядчики/фриланс</TabsTrigger>
          <TabsTrigger value="additional">Доп. затраты</TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="mt-4 space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Неделя</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Связанная задача</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const flatEntries = Object.entries(projectPayments)
                  .flatMap(([wi, entries]) =>
                    entries.map((e) => ({ weekIndex: Number(wi), ...e })),
                  )
                  .sort((a, b) => a.weekIndex - b.weekIndex);
                if (flatEntries.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Нет записей</TableCell>
                    </TableRow>
                  );
                }
                return flatEntries.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm">{financeWeeks[entry.weekIndex] ? weekLabel(financeWeeks[entry.weekIndex]) : `Нед ${entry.weekIndex + 1}`}</TableCell>
                    <TableCell className="text-sm">{entry.reason ? reasonLabels[entry.reason] || entry.reason : "—"}</TableCell>
                    <TableCell className="text-sm">{entry.taskTitle || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
                  </TableRow>
                ));
              })()}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="font-semibold">Итого выплачено</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totalPaid)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead className="text-right">Кол-во рабочих дней</TableHead>
                <TableHead className="text-right">Ставка</TableHead>
                <TableHead className="text-right">Итого</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeCosts.map((employee: any) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell className="text-right">{employee.isContract ? "—" : employee.workDays.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{employee.isContract ? `${formatCurrency(employee.contractRate)} (контракт)` : formatCurrency(employee.dailyRate)}</TableCell>
                  <TableCell className="text-right font-semibold">{employee.isContract ? formatCurrency(employee.contractRate) : formatCurrency(employee.workDays * employee.dailyRate)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="font-semibold">Итого</TableCell>
                <TableCell className="text-right font-bold text-lg">{formatCurrency(projectCosts.totalCost)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="subcontractors" className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Субподрядчик</TableHead>
                <TableHead className="text-right">Сумма контракта</TableHead>
                <TableHead className="text-right">Выплачено</TableHead>
                <TableHead className="text-right">Остаток</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySubcontractors.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Нет субподрядчиков</TableCell></TableRow>
              ) : (
                displaySubcontractors.map((sub: any) => {
                  const paid = getProjectSubcontractorPaid(project.id, sub.id);
                  return (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.contractorName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sub.contractAmount ?? 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(paid)}</TableCell>
                      <TableCell className="text-right">{formatCurrency((sub.contractAmount ?? 0) - paid)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="additional" className="mt-4 space-y-4">
          {currentRole === "accountant" && (
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Название</p><Input value={newCostName} onChange={(e) => setNewCostName(e.target.value)} className="w-40" /></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Категория</p><Input value={newCostCategory} onChange={(e) => setNewCostCategory(e.target.value)} className="w-32" /></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Сумма</p><Input type="number" value={newCostAmount} onChange={(e) => setNewCostAmount(e.target.value)} className="w-28" /></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Примечание</p><Input value={newCostNote} onChange={(e) => setNewCostNote(e.target.value)} className="w-40" /></div>
              <Button size="sm" onClick={addAdditionalCost}>Добавить</Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Примечание</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {additionalCosts.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Нет доп. затрат</TableCell></TableRow>
              ) : (
                additionalCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">{cost.name}</TableCell>
                    <TableCell>{cost.category}</TableCell>
                    <TableCell className="text-muted-foreground">{cost.note || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(cost.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        projectId={project.id}
        forceTaskType="accounting"
      />
    </div>
  );
}
