import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Clock, CheckCircle2, RussianRuble } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useRole } from "@/contexts/RoleContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  progress: number;
  team: number;
  tasks: { total: number; completed: number };
  color: string;
  budget?: number;
}

interface ProjectAnalyticsProps {
  project: Project;
}

export default function ProjectAnalytics({ project }: ProjectAnalyticsProps) {
  const { currentRole } = useRole();
  const [costsDialogOpen, setCostsDialogOpen] = useState(false);

  const { data: analytics } = useQuery({
    queryKey: ["project", project.id, "analytics"],
    queryFn: () => apiFetch<any>(`/projects/${project.id}/analytics`),
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
    progress: {
      label: "Прогресс",
      color: "hsl(var(--primary))",
    },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
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

      <Dialog open={costsDialogOpen} onOpenChange={setCostsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Детализация затрат по проекту</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
