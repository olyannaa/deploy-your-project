import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface EmployeeEntry {
  id: string;
  fullName: string;
  dailyRate?: number | null;
  contractRate?: number | null;
  contractorName?: string | null;
  workDays?: number;
  contractAmount?: number;
}

interface AccountingEmployeeSelectProps {
  label: string;
  employees: EmployeeEntry[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export default function AccountingEmployeeSelect({
  label,
  employees,
  selectedIds,
  onSelectionChange,
}: AccountingEmployeeSelectProps) {
  const [timesheetUserId, setTimesheetUserId] = useState<string | null>(null);
  const timesheetUser = timesheetUserId
    ? employees.find((e) => e.id === timesheetUserId)
    : null;

  const allSelected = employees.length > 0 && selectedIds.length === employees.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < employees.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(employees.map((e) => e.id));
    }
  };

  const toggleEmployee = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const formatRate = (emp: EmployeeEntry) => {
    if (emp.contractAmount != null && emp.contractAmount > 0) {
      return `${emp.contractAmount.toLocaleString("ru-RU")} ₽ (контракт)`;
    }
    if (emp.contractRate != null && emp.contractRate > 0) {
      return `${emp.contractRate.toLocaleString("ru-RU")} ₽/мес`;
    }
    if (emp.dailyRate != null && emp.dailyRate > 0) {
      return `${emp.dailyRate.toLocaleString("ru-RU")} ₽/день`;
    }
    return "—";
  };

  const getWorkDays = (emp: EmployeeEntry) => {
    return emp.workDays ?? 0;
  };

  // Mock timesheet data for dialog
  const generateMockTimesheet = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number; weekday: string; hours: number }[] = [];
    const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const wd = date.getDay();
      const isWeekend = wd === 0 || wd === 6;
      days.push({
        day: d,
        weekday: weekdays[wd],
        hours: isWeekend ? 0 : Math.random() > 0.15 ? 8 : 0,
      });
    }
    return days;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="max-h-48 overflow-y-auto rounded-md border border-border">
        {employees.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Нет доступных сотрудников</p>
        ) : (
          <>
            <div
              className="flex items-center gap-3 border-b border-border px-3 py-2 bg-muted/20 cursor-pointer hover:bg-muted/40"
              onClick={toggleAll}
            >
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) (el as any).indeterminate = someSelected;
                }}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">Выбрать всех ({employees.length})</span>
            </div>
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-muted/30"
            >
              <Checkbox
                checked={selectedIds.includes(emp.id)}
                onCheckedChange={() => toggleEmployee(emp.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {emp.fullName}
                  </span>
                  {emp.contractorName && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      контрагент
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Ставка: {formatRate(emp)}</span>
                  <span>Дней: {getWorkDays(emp)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setTimesheetUserId(emp.id);
                }}
                title="Табель рабочего времени"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            ))}
          </>
        )}
      </div>

      {/* Timesheet dialog */}
      <Dialog
        open={!!timesheetUserId}
        onOpenChange={(open) => !open && setTimesheetUserId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Табель: {timesheetUser?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-2 py-1">День</th>
                  <th className="px-2 py-1">Д/н</th>
                  <th className="px-2 py-1">Часов</th>
                </tr>
              </thead>
              <tbody>
                {generateMockTimesheet().map((row) => (
                  <tr
                    key={row.day}
                    className={`border-b border-border/50 ${row.hours === 0 ? "text-muted-foreground" : ""}`}
                  >
                    <td className="px-2 py-1">{row.day}</td>
                    <td className="px-2 py-1">{row.weekday}</td>
                    <td className="px-2 py-1">{row.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
