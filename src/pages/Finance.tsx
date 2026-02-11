import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { differenceInDays, parseISO, startOfWeek, addWeeks, format, getMonth, getYear } from "date-fns";
import { ru } from "date-fns/locale";

interface Project {
  id: string;
  name: string;
  budget: number;
  endDate: string;
  startDate: string;
}

// Generate weeks from earliest project start to latest project end + buffer
function generateWeeks(projects: Project[]): Date[] {
  if (!projects.length) return [];
  const starts = projects.map((p) => parseISO(p.startDate));
  const ends = projects.map((p) => parseISO(p.endDate));
  const minDate = startOfWeek(new Date(Math.min(...starts.map((d) => d.getTime()))), { weekStartsOn: 1 });
  const maxDate = new Date(Math.max(...ends.map((d) => d.getTime())));

  const weeks: Date[] = [];
  let current = minDate;
  while (current <= addWeeks(maxDate, 2)) {
    weeks.push(current);
    current = addWeeks(current, 1);
  }
  return weeks;
}

// Group weeks by month
function groupByMonth(weeks: Date[]): { label: string; weeks: Date[] }[] {
  const groups: { label: string; weeks: Date[] }[] = [];
  for (const w of weeks) {
    const label = format(w, "LLLL yyyy", { locale: ru });
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.weeks.push(w);
    } else {
      groups.push({ label, weeks: [w] });
    }
  }
  return groups;
}

function weekLabel(date: Date): string {
  return format(date, "dd.MM");
}

export default function Finance() {
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/api/projects"),
  });

  const activeProjects = useMemo(
    () => projects.filter((p: any) => p.status === "active" || p.status === "completed"),
    [projects],
  );

  const weeks = useMemo(() => generateWeeks(activeProjects), [activeProjects]);
  const monthGroups = useMemo(() => groupByMonth(weeks), [weeks]);

  // payments[projectId][weekIndex] = number
  const [payments, setPayments] = useState<Record<string, Record<number, number>>>({});

  const handlePaymentChange = (projectId: string, weekIndex: number, value: string) => {
    const num = parseFloat(value) || 0;
    setPayments((prev) => ({
      ...prev,
      [projectId]: { ...prev[projectId], [weekIndex]: num },
    }));
  };

  const getTotalPaid = (projectId: string) => {
    const p = payments[projectId];
    if (!p) return 0;
    return Object.values(p).reduce((sum, v) => sum + v, 0);
  };

  const today = new Date();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Финансы</h1>

      <div className="rounded-lg border border-border overflow-auto bg-card">
        <Table>
          <TableHeader>
            {/* Month row */}
            <TableRow>
              <TableHead className="sticky left-0 z-20 bg-muted min-w-[200px]" rowSpan={2}>
                Название проекта
              </TableHead>
              <TableHead className="text-center bg-muted min-w-[120px]" rowSpan={2}>
                Сумма по договору
              </TableHead>
              <TableHead className="text-center bg-muted min-w-[100px]" rowSpan={2}>
                Оплачено
              </TableHead>
              <TableHead className="text-center bg-muted min-w-[100px]" rowSpan={2}>
                Остаток
              </TableHead>
              <TableHead className="text-center bg-muted min-w-[80px]" rowSpan={2}>
                Дней
              </TableHead>
              {monthGroups.map((mg) => (
                <TableHead
                  key={mg.label}
                  className="text-center bg-muted border-l border-border capitalize"
                  colSpan={mg.weeks.length}
                >
                  {mg.label}
                </TableHead>
              ))}
            </TableRow>
            {/* Week row */}
            <TableRow>
              {weeks.map((w, i) => (
                <TableHead key={i} className="text-center bg-muted text-xs min-w-[80px] border-l border-border">
                  {weekLabel(w)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeProjects.map((project) => {
              const paid = getTotalPaid(project.id);
              const remaining = project.budget - paid;
              const daysLeft = Math.max(0, differenceInDays(parseISO(project.endDate), today));

              return (
                <TableRow key={project.id}>
                  <TableCell className="sticky left-0 z-10 bg-card font-medium">
                    <Link
                      to={`/projects/${project.id}?tab=analytics`}
                      className="text-primary hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {project.budget.toLocaleString("ru-RU")} ₽
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-primary">
                    {paid.toLocaleString("ru-RU")} ₽
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {remaining.toLocaleString("ru-RU")} ₽
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{daysLeft}</TableCell>
                  {weeks.map((_, wi) => (
                    <TableCell key={wi} className="p-1 border-l border-border">
                      <Input
                        type="number"
                        className="h-8 w-full min-w-[70px] text-center text-sm"
                        value={payments[project.id]?.[wi] || ""}
                        onChange={(e) => handlePaymentChange(project.id, wi, e.target.value)}
                        placeholder="—"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
