import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { mockEmployees, mockDepartments } from "@/data/mockData";
import { demoMonthlyTime, projectNames } from "@/data/salaryStore";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalaryDistributionTab() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const employees = useMemo(() => {
    return mockEmployees
      .filter((emp) => !emp.roles.includes("accountant"))
      .map((emp) => {
        const isContract = !!emp.contractRate;
        const timeData = demoMonthlyTime[emp.id]?.[selectedMonth] || {};
        const totalDays = Object.values(timeData).reduce((s, d) => s + d, 0);
        const totalAccrued = isContract
          ? (emp.contractRate || 0)
          : totalDays * (emp.dailyRate || 0);

        const projects = Object.entries(timeData)
          .filter(([, days]) => days > 0 || isContract)
          .map(([projId, days]) => {
            const proportion = isContract ? 1 : totalDays > 0 ? days / totalDays : 0;
            return {
              projectId: projId,
              projectName: projectNames[projId] || projId,
              days,
              proportion,
              accrued: isContract ? (emp.contractRate || 0) : days * (emp.dailyRate || 0),
            };
          });

        const department = mockDepartments.find((d) => d.id === emp.primaryDepartmentId);

        return {
          id: emp.id,
          name: emp.fullName,
          isContract,
          dailyRate: emp.dailyRate || 0,
          contractRate: emp.contractRate,
          departmentId: emp.primaryDepartmentId,
          departmentName: department?.name || "—",
          totalDays,
          totalAccrued,
          projects,
        };
      })
      .filter((e) => e.totalAccrued > 0);
  }, [selectedMonth]);

  const filtered = useMemo(() => {
    let result = employees;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    if (selectedDepartment !== "all") {
      result = result.filter((e) => e.departmentId === selectedDepartment);
    }
    return result;
  }, [employees, searchQuery, selectedDepartment]);

  const projectSummary = useMemo(() => {
    const summary: Record<string, { name: string; accrued: number; days: number }> = {};
    for (const emp of filtered) {
      for (const proj of emp.projects) {
        if (!summary[proj.projectId]) {
          summary[proj.projectId] = { name: proj.projectName, accrued: 0, days: 0 };
        }
        summary[proj.projectId].accrued += proj.accrued;
        summary[proj.projectId].days += proj.days;
      }
    }
    return summary;
  }, [filtered]);

  const grandTotal = filtered.reduce((s, e) => s + e.totalAccrued, 0);
  const grandDays = filtered.reduce((s, e) => s + e.totalDays, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Месяц" />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Подразделение" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все подразделения</SelectItem>
            {mockDepartments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Main table */}
      <div className="rounded-lg border border-border overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Сотрудник</TableHead>
              <TableHead className="min-w-[180px]">Подразделение</TableHead>
              <TableHead className="text-center min-w-[80px]">Тип</TableHead>
              <TableHead className="min-w-[200px]">Проект</TableHead>
              <TableHead className="text-right min-w-[80px]">Дней</TableHead>
              <TableHead className="text-right min-w-[80px]">Доля</TableHead>
              <TableHead className="text-right min-w-[100px]">Ставка</TableHead>
              <TableHead className="text-right min-w-[120px]">Начислено</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Нет данных за выбранный период
                </TableCell>
              </TableRow>
            )}
            {filtered.map((emp) => (
              <>
                <TableRow key={emp.id} className="bg-muted/30 font-semibold border-t-2 border-border">
                  <TableCell>{emp.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{emp.departmentName}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={emp.isContract ? "secondary" : "outline"} className="text-xs">
                      {emp.isContract ? "Контракт" : "Штат"}
                    </Badge>
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right">{emp.isContract ? "—" : emp.totalDays}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right">
                    {emp.isContract
                      ? formatCurrency(emp.contractRate || 0)
                      : `${formatCurrency(emp.dailyRate)}/день`}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(emp.totalAccrued)}</TableCell>
                </TableRow>

                {emp.projects.map((proj) => (
                  <TableRow key={`${emp.id}-${proj.projectId}`}>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-sm">{proj.projectName}</TableCell>
                    <TableCell className="text-right text-sm">{emp.isContract ? "—" : proj.days}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {Math.round(proj.proportion * 100)}%
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right text-sm">{formatCurrency(proj.accrued)}</TableCell>
                  </TableRow>
                ))}
              </>
            ))}

            {filtered.length > 0 && (
              <TableRow className="bg-muted/50 border-t-2 border-border font-bold">
                <TableCell>Итого</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{grandDays}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{formatCurrency(grandTotal)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Project summary */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
          Сводка по проектам (нагрузка ЗП на бюджет)
        </h3>
        <div className="rounded-lg border border-border overflow-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[250px]">Проект</TableHead>
                <TableHead className="text-right min-w-[100px]">Дней</TableHead>
                <TableHead className="text-right min-w-[130px]">Начислено (ЗП)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(projectSummary).map(([projId, data]) => (
                <TableRow key={projId}>
                  <TableCell className="font-medium">{data.name}</TableCell>
                  <TableCell className="text-right">{data.days}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.accrued)}</TableCell>
                </TableRow>
              ))}
              {Object.keys(projectSummary).length > 0 && (
                <TableRow className="bg-muted/50 font-bold border-t">
                  <TableCell>Итого</TableCell>
                  <TableCell className="text-right">
                    {Object.values(projectSummary).reduce((s, d) => s + d.days, 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Object.values(projectSummary).reduce((s, d) => s + d.accrued, 0))}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
