import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Clock, CheckCircle2, RussianRuble } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useRole } from "@/contexts/RoleContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  generateWeeks,
  weekLabel,
  getGlobalPayments,
  getProjectSubcontractorPaid,
} from "@/pages/Finance";
import { Input } from "@/components/ui/input";

interface Project {
  id: string;
  name: string;
  progress: number;
  team: number;
  tasks: { total: number; completed: number };
  color: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

interface ProjectAnalyticsProps {
  project: Project;
}

export default function ProjectAnalytics({ project }: ProjectAnalyticsProps) {
  const { currentRole } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [costsDialogOpen, setCostsDialogOpen] = useState(false);

  // Auto-open costs dialog when navigated from Finance page
  useEffect(() => {
    if (searchParams.get("openCosts") === "true") {
      setCostsDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("openCosts");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  const canViewCosts = ["admin", "gip", "accountant"].includes(currentRole);

  const progressValue = analytics?.progress ?? project.progress;
  const tasksValue = analytics?.tasks ?? project.tasks;
  const hoursTotal = analytics?.hoursTotal ?? 0;
  const costs = analytics?.costs ?? { timesheets: 0, contracts: 0, total: 0 };
  const employeeCosts = analytics?.costsByUser ?? [];

  const projectCosts = {
    budget: project.budget ?? 0,
    laborCost: costs.timesheets,
    contractCost: costs.contracts,
    totalCost: costs.total,
  };

  // Additional costs state (in-memory demo)
  const [additionalCosts, setAdditionalCosts] = useState<
    { id: string; name: string; category: string; amount: number; note: string }[]
  >([]);
  const [newCostName, setNewCostName] = useState("");
  const [newCostCategory, setNewCostCategory] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [newCostNote, setNewCostNote] = useState("");

  const addAdditionalCost = () => {
    if (!newCostName || !newCostAmount) return;
    setAdditionalCosts((prev) => [
      ...prev,
      {
        id: `ac-${Date.now()}`,
        name: newCostName,
        category: newCostCategory || "Прочее",
        amount: parseFloat(newCostAmount) || 0,
        note: newCostNote,
      },
    ]);
    setNewCostName("");
    setNewCostCategory("");
    setNewCostAmount("");
    setNewCostNote("");
  };

  const progressData = useMemo(() => {
    const steps = [0.2, 0.4, 0.6, 0.8, 1];
    return [
      ...steps.map((multiplier, index) => ({
        week: `Нед ${index + 1}`,
        progress: Math.round(progressValue * multiplier),
      })),
      { week: "Нед 6", progress: progressValue },
    ];
  }, [progressValue]);

  const fallbackCounts = {
    new: Math.max(tasksValue.total - tasksValue.completed, 0),
    inProgress: 0,
    review: 0,
    done: tasksValue.completed,
  };
  const statusCounts = analytics?.statusCounts ?? fallbackCounts;

  const taskDistribution = [
    { name: "Новые", value: statusCounts.new, color: "hsl(var(--chart-4))" },
    { name: "В работе", value: statusCounts.inProgress, color: "hsl(var(--chart-2))" },
    { name: "На проверке", value: statusCounts.review, color: "hsl(var(--chart-3))" },
    { name: "Завершено", value: statusCounts.done, color: "hsl(var(--chart-1))" },
  ];
  const visibleTaskDistribution = taskDistribution.filter((entry) => entry.value > 0);

  const chartConfig = {
    progress: { label: "Прогресс", color: "hsl(var(--primary))" },
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

  // Finance table data for this project
  const financeWeeks = useMemo(() => {
    if (!project.startDate || !project.endDate) return [];
    return generateWeeks([{ startDate: project.startDate, endDate: project.endDate }]);
  }, [project.startDate, project.endDate]);
  const globalPayments = getGlobalPayments();
  const projectPayments = globalPayments[project.id] || {};
  const totalPaid = Object.values(projectPayments).reduce((s, entries) => s + entries.reduce((es, e) => es + e.amount, 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/40 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Прогресс</p>
              <h3 className="text-2xl font-bold text-foreground mt-2">{progressValue}%</h3>
            </div>
            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center shadow-soft`}>
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
          <Progress value={progressValue} className="mt-4" />
        </Card>

        <Card className="border-border/40 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Команда</p>
              <h3 className="text-2xl font-bold text-foreground mt-2">{project.team}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-soft">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">участников</p>
        </Card>

        <Card className="border-border/40 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Задачи</p>
              <h3 className="text-2xl font-bold text-foreground mt-2">
                {tasksValue.completed}/{tasksValue.total}
              </h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-soft">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {tasksValue.total > 0 ? Math.round((tasksValue.completed / tasksValue.total) * 100) : 0}% завершено
          </p>
        </Card>

        <Card className="border-border/40 bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Дней учтено</p>
              <h3 className="text-2xl font-bold text-foreground mt-2">{hoursTotal}</h3>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-soft">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">за весь проект</p>
        </Card>

        {canViewCosts && (
          <Card
            className="border-border/40 bg-card p-6 shadow-soft md:col-span-2 lg:col-span-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setCostsDialogOpen(true)}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Сумма затрат по проекту</p>
                <h3 className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(projectCosts.totalCost)}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-soft">
                <RussianRuble className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">Общий бюджет проекта</p>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {formatCurrency(projectCosts.budget)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Затраты на труд</p>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {formatCurrency(projectCosts.laborCost)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">(чел/дни)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Сумма контракта</p>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {formatCurrency(projectCosts.contractCost)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">(договорная стоимость)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">Нажмите для подробностей</p>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/40 bg-card p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4">Прогресс по времени</h3>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="progress"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>

        <Card className="border-border/40 bg-card p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-foreground mb-4">Распределение задач</h3>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {visibleTaskDistribution.length > 0 ? (
                <PieChart>
                  <Pie
                    data={visibleTaskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {visibleTaskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Нет данных для отображения
                </div>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </div>

      {/* Costs Detail Dialog */}
      <Dialog open={costsDialogOpen} onOpenChange={setCostsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Детализация затрат по проекту</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="finance" className="mt-4">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="finance">Финансы</TabsTrigger>
              <TabsTrigger value="employees">Учёт времени</TabsTrigger>
              <TabsTrigger value="subcontractors">Субподрядчики/фриланс</TabsTrigger>
              <TabsTrigger value="additional">Доп. затраты</TabsTrigger>
            </TabsList>

            {/* Tab 1: Employee costs (existing table) */}
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
                      <TableCell className="text-right">
                        {employee.isContract ? "—" : employee.workDays.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {employee.isContract
                          ? `${formatCurrency(employee.contractRate)} (контракт)`
                          : formatCurrency(employee.dailyRate)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {employee.isContract
                          ? formatCurrency(employee.contractRate)
                          : formatCurrency(employee.workDays * employee.dailyRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-semibold">Итого</TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(projectCosts.totalCost)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            {/* Tab 2: Finance — summary of payments by category */}
            <TabsContent value="finance" className="mt-4 space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Бюджет проекта</p>
                  <p className="text-lg font-bold mt-1">{formatCurrency(projectCosts.budget)}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Всего выплачено</p>
                  <p className="text-lg font-bold text-primary mt-1">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Остаток</p>
                  <p className="text-lg font-bold mt-1">{formatCurrency(projectCosts.budget - totalPaid)}</p>
                </div>
              </div>

              {/* Payments list */}
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
                        entries.map((entry) => ({
                          weekIndex: Number(wi),
                          week: financeWeeks[Number(wi)],
                          ...entry,
                        }))
                      )
                      .filter((e) => e.amount > 0)
                      .sort((a, b) => a.weekIndex - b.weekIndex);

                    if (flatEntries.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Нет зафиксированных выплат
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const rl: Record<string, string> = {
                      salary: "ЗП / Аванс",
                      subcontract: "Субподрядчики",
                      additional: "Доп. затраты",
                      other: "Другое",
                    };

                    return (
                      <>
                        {flatEntries.map((e, idx) => (
                          <TableRow key={`${e.weekIndex}-${idx}`}>
                            <TableCell className="tabular-nums">
                              {e.week ? weekLabel(e.week) : `Нед. ${e.weekIndex + 1}`}
                            </TableCell>
                            <TableCell>
                              {e.reason ? rl[e.reason] || e.reason : "Не указана"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {e.taskTitle || e.taskId || "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(e.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="font-semibold">Итого</TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(flatEntries.reduce((s, e) => s + e.amount, 0))}
                          </TableCell>
                        </TableRow>
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Tab 3: Subcontractors */}
            <TabsContent value="subcontractors" className="mt-4">
              {projectSubcontractors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Нет субподрядчиков в этом проекте
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Субподрядчик</TableHead>
                      <TableHead className="text-right">Сумма по договору</TableHead>
                      <TableHead className="text-right">Оплачено</TableHead>
                      <TableHead className="text-right">Остаток</TableHead>
                      <TableHead className="text-right">Дней на выполнение</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectSubcontractors.map((sub: any) => {
                      const paid = getProjectSubcontractorPaid(project.id, sub.id);
                      const remaining = sub.contractAmount - paid;
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.contractorName}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(sub.contractAmount)}</TableCell>
                          <TableCell className="text-right tabular-nums text-primary">{formatCurrency(paid)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(remaining)}</TableCell>
                          <TableCell className="text-right tabular-nums">{sub.workDays}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50">
                      <TableCell className="font-semibold">Итого</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(projectSubcontractors.reduce((s: number, sub: any) => s + sub.contractAmount, 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(projectSubcontractors.reduce((s: number, sub: any) => s + getProjectSubcontractorPaid(project.id, sub.id), 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(projectSubcontractors.reduce((s: number, sub: any) => s + (sub.contractAmount - getProjectSubcontractorPaid(project.id, sub.id)), 0))}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {projectSubcontractors.reduce((s: number, sub: any) => s + sub.workDays, 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Tab 4: Additional costs */}
            <TabsContent value="additional" className="mt-4 space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Наименование</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead>Примечание</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalCosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Нет дополнительных затрат
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {additionalCosts.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell className="font-medium">{cost.name}</TableCell>
                          <TableCell>{cost.category}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(cost.amount)}</TableCell>
                          <TableCell className="text-muted-foreground">{cost.note || "—"}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="font-semibold">Итого</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(additionalCosts.reduce((s, c) => s + c.amount, 0))}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>

              {/* Add new cost form */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Добавить затрату</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Наименование *"
                    value={newCostName}
                    onChange={(e) => setNewCostName(e.target.value)}
                  />
                  <Input
                    placeholder="Категория (напр. Командировка)"
                    value={newCostCategory}
                    onChange={(e) => setNewCostCategory(e.target.value)}
                  />
                  <Input
                    placeholder="Сумма *"
                    type="number"
                    value={newCostAmount}
                    onChange={(e) => setNewCostAmount(e.target.value)}
                  />
                  <Input
                    placeholder="Примечание"
                    value={newCostNote}
                    onChange={(e) => setNewCostNote(e.target.value)}
                  />
                </div>
                <button
                  onClick={addAdditionalCost}
                  className="text-sm text-primary hover:underline"
                >
                  + Добавить
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}