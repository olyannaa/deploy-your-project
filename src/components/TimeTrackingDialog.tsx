import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx-js-style";

interface TimeTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  hourlyRate?: number;
  contractRate?: number;
  contractorName?: string;
}

interface TimeEntry {
  taskId: string;
  day: number;
  month: number;
  year: number;
  value: string;
}

type DayOffCode = "b" | "k" | "o" | "v";

interface DayOffEntry {
  day: number;
  month: number;
  year: number;
  value: DayOffCode;
}

const dayOffLabels: Record<DayOffCode, string> = {
  b: "б",
  k: "к",
  o: "о",
  v: "в",
};

export function TimeTrackingDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  hourlyRate = 0,
  contractRate,
  contractorName,
}: TimeTrackingDialogProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthName = (month: number) => {
    const months = [
      "Январь",
      "Февраль",
      "Март",
      "Апрель",
      "Май",
      "Июнь",
      "Июль",
      "Август",
      "Сентябрь",
      "Октябрь",
      "Ноябрь",
      "Декабрь",
    ];
    return months[month];
  };

  const getDayOfWeek = (day: number, month: number, year: number) => {
    return new Date(year, month, day).getDay();
  };

  const isWeekend = (day: number) => {
    const dayOfWeek = getDayOfWeek(day, currentMonth, currentYear);
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getCurrentWeekDays = () => {
    const current = new Date(currentDate);
    const first = current.getDate() - current.getDay() + 1;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(current.setDate(first + i));
      days.push(day.getDate());
    }
    return days;
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const daysToShow = viewMode === "month"
    ? Array.from({ length: daysInMonth }, (_, i) => i + 1)
    : getCurrentWeekDays();

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const fromDate = viewMode === "month"
    ? formatDate(new Date(currentYear, currentMonth, 1))
    : formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), daysToShow[0]));
  const toDate = viewMode === "month"
    ? formatDate(new Date(currentYear, currentMonth, daysInMonth))
    : formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), daysToShow[daysToShow.length - 1]));

  const { data: entriesData = [] } = useQuery({
    queryKey: ["time-entries", employeeId, fromDate, toDate],
    queryFn: () =>
      apiFetch<any[]>(
        `/time-tracking/entries?userId=${employeeId}&from=${fromDate}&to=${toDate}`,
      ),
    enabled: !!employeeId,
  });

  const { data: dayOffData = [] } = useQuery({
    queryKey: ["day-offs", employeeId, fromDate, toDate],
    queryFn: () =>
      apiFetch<any[]>(
        `/time-tracking/day-offs?userId=${employeeId}&from=${fromDate}&to=${toDate}`,
      ),
    enabled: !!employeeId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", employeeId],
    queryFn: () => apiFetch<any[]>(`/tasks?assigneeId=${employeeId}`),
    enabled: !!employeeId,
  });

  const timeEntries = useMemo<TimeEntry[]>(
    () =>
      entriesData.map((entry) => {
        const date = new Date(entry.work_date);
        return {
          taskId: entry.task_id ?? entry.taskId,
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          value: String(entry.hours),
        };
      }),
    [entriesData],
  );

  const dayOffEntries = useMemo<DayOffEntry[]>(
    () =>
      dayOffData.map((entry) => {
        const date = new Date(entry.work_date);
        return {
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          value: entry.type as DayOffCode,
        };
      }),
    [dayOffData],
  );

  const tasksForView = useMemo(
    () =>
      tasks
        .filter((task) => task.taskType !== "subcontract" || task.approvalStatus === "approved")
        .map((task) => ({
          id: task.id,
          name: task.title ?? "Нет названия",
          projectName: task.projectName ? task.projectName : "Вне проекта",
        })),
    [tasks],
  );

  const navigatePeriod = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
    } else {
      if (direction === "prev") {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
    }
    setCurrentDate(newDate);
  };

  const getDayOffEntry = (day: number): DayOffEntry | undefined => {
    return dayOffEntries.find(
      (entry) => entry.day === day && entry.month === currentMonth && entry.year === currentYear,
    );
  };

  const getTimeEntry = (taskId: string, day: number): string => {
    const entry = timeEntries.find(
      (item) => item.taskId === taskId && item.day === day && item.month === currentMonth && item.year === currentYear,
    );
    return entry?.value || "";
  };

  const getCellValue = (taskId: string, day: number) => {
    const dayOff = getDayOffEntry(day);
    if (dayOff) return dayOffLabels[dayOff.value] || dayOff.value;
    return getTimeEntry(taskId, day);
  };

  const getDisplayValue = (value: string) => {
    const normalizedValue = normalizeDayValue(value);
    if (normalizedValue !== null && normalizedValue > 0) {
      return "+";
    }
    return value;
  };

  const getCellClass = (taskId: string, day: number) => {
    const value = getCellValue(taskId, day);
    const weekend = isWeekend(day);

    if (value === "б") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    if (value === "к") return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    if (value === "о") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (value === "в") return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    const numericValue = parseNumericValue(value);
    if (numericValue !== null && numericValue > 0) {
      return "bg-primary/20 text-primary font-semibold";
    }
    if (weekend) return "bg-muted/50";
    return "";
  };

  const parseNumericValue = (rawValue: string) => {
    const normalized = rawValue.replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const normalizeDayValue = (rawValue: string) => {
    const parsed = parseNumericValue(rawValue);
    if (parsed === null) return null;
    return parsed > 0 ? 1 : 0;
  };

  const calculateTotalHours = () => {
    return timeEntries
      .filter((entry) => entry.month === currentMonth && entry.year === currentYear)
      .reduce((sum, entry) => sum + (normalizeDayValue(entry.value) ?? 0), 0);
  };

  const calculateTotalCost = () => {
    if (contractRate) {
      return contractRate;
    }
    return calculateTotalHours() * hourlyRate;
  };

  const handleDownload = () => {
    const rateLabel =
      contractRate
        ? "\u0421\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c \u043f\u043e \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u0443"
        : "\u0421\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c \u043f\u043e \u0434\u043d\u044f\u043c/\u0447\u0430\u0441\u0430\u043c";
    const totalColumns = daysToShow.length + 3;

    const rows: (string | number)[][] = [
      ["\u0421\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a", employeeName],
      ...(contractorName
        ? [["\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442", contractorName]]
        : []),
      ["\u041f\u0435\u0440\u0438\u043e\u0434", `${getMonthName(currentMonth)} ${currentYear}`],
      [rateLabel, `${contractRate ?? hourlyRate} \u0440\u0443\u0431.`],
      [],
    ];

    const headerRowIndex = rows.length;
    rows.push(["\u0417\u0430\u0434\u0430\u0447\u0430", "\u041f\u0440\u043e\u0435\u043a\u0442", ...daysToShow, "\u0418\u0442\u043e\u0433\u043e"]);
    const firstTaskRowIndex = rows.length;

    const taskTotals: number[] = [];
    tasksForView.forEach((task) => {
      let taskTotal = 0;
      const values = daysToShow.map((day) => {
        const rawValue = getCellValue(task.id, day);
        const numericValue =
          typeof rawValue === "string" ? normalizeDayValue(rawValue) : Number(rawValue);
        if (numericValue !== null && Number.isFinite(numericValue)) {
          if (numericValue > 0) {
            taskTotal += numericValue;
            return numericValue;
          }
          return "";
        }
        return rawValue;
      });
      taskTotals.push(taskTotal);
      rows.push([task.name, task.projectName, ...values, taskTotal || ""]);
    });

    const lastTaskRowIndex = rows.length - 1;
    rows.push(new Array(totalColumns).fill(""));

    const totalHoursValue = taskTotals.reduce((sum, total) => sum + total, 0);
    const totalCostValue = contractRate ? contractRate : totalHoursValue * hourlyRate;

    const totalHoursRowIndex = rows.length;
    const totalHoursRow = new Array(totalColumns).fill("");
    totalHoursRow[0] = "\u0418\u0442\u043e\u0433\u043e \u0447\u0430\u0441\u043e\u0432";
    totalHoursRow[totalColumns - 1] = totalHoursValue;
    rows.push(totalHoursRow);

    const totalCostRowIndex = rows.length;
    const totalCostRow = new Array(totalColumns).fill("");
    totalCostRow[0] = "\u0421\u0442\u043e\u0438\u043c\u043e\u0441\u0442\u044c";
    totalCostRow[totalColumns - 1] = `${totalCostValue} \u0440\u0443\u0431.`;
    rows.push(totalCostRow);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    const firstDayColIndex = 2;
    const lastDayColIndex = totalColumns - 2;
    const totalColIndex = totalColumns - 1;
    const totalHoursCellRef = XLSX.utils.encode_cell({ r: totalHoursRowIndex, c: totalColIndex });
    const totalCostCellRef = XLSX.utils.encode_cell({ r: totalCostRowIndex, c: totalColIndex });

    if (taskTotals.length > 0 && lastDayColIndex >= firstDayColIndex) {
      taskTotals.forEach((total, index) => {
        const rowIndex = firstTaskRowIndex + index;
        const startCell = XLSX.utils.encode_cell({ r: rowIndex, c: firstDayColIndex });
        const endCell = XLSX.utils.encode_cell({ r: rowIndex, c: lastDayColIndex });
        const totalCell = XLSX.utils.encode_cell({ r: rowIndex, c: totalColIndex });
        worksheet[totalCell] = { t: "n", v: total, f: `SUM(${startCell}:${endCell})` };
      });

      const firstTotalCell = XLSX.utils.encode_cell({ r: firstTaskRowIndex, c: totalColIndex });
      const lastTotalCell = XLSX.utils.encode_cell({ r: lastTaskRowIndex, c: totalColIndex });
      worksheet[totalHoursCellRef] = {
        t: "n",
        v: totalHoursValue,
        f: `SUM(${firstTotalCell}:${lastTotalCell})`,
      };
    } else {
      worksheet[totalHoursCellRef] = { t: "n", v: totalHoursValue };
    }

    if (contractRate) {
      worksheet[totalCostCellRef] = { t: "n", v: totalCostValue };
    } else if (taskTotals.length > 0) {
      worksheet[totalCostCellRef] = {
        t: "n",
        v: totalCostValue,
        f: `${totalHoursCellRef}*${hourlyRate}`,
      };
    } else {
      worksheet[totalCostCellRef] = { t: "n", v: totalCostValue };
    }

    const border = {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
    };

    const headerStyle = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      fill: { patternType: "solid", fgColor: { rgb: "F3F4F6" } },
      border,
    };
    const rowHeaderStyle = {
      font: { bold: true },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border,
    };
    const cellCenterStyle = {
      alignment: { horizontal: "center", vertical: "center" },
      border,
    };
    const cellLeftStyle = {
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border,
    };
    const summaryLabelStyle = {
      font: { bold: true },
      alignment: { horizontal: "left", vertical: "center" },
      border,
    };
    const summaryValueStyle = {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      border,
    };

    const metaLabelStyle = {
      font: { bold: true },
      alignment: { horizontal: "left", vertical: "center" },
    };
    const metaValueStyle = {
      alignment: { horizontal: "left", vertical: "center" },
    };

    const setCellStyle = (row: number, col: number, style: any) => {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[address];
      if (cell) {
        cell.s = style;
      } else {
        worksheet[address] = { t: "s", v: "", s: style };
      }
    };

    const metaRows = contractorName ? [0, 1, 2, 3] : [0, 1, 2];
    metaRows.forEach((rowIndex) => {
      setCellStyle(rowIndex, 0, metaLabelStyle);
      setCellStyle(rowIndex, 1, metaValueStyle);
    });

    for (let col = 0; col < totalColumns; col += 1) {
      setCellStyle(headerRowIndex, col, headerStyle);
    }

    for (let row = firstTaskRowIndex; row <= lastTaskRowIndex; row += 1) {
      setCellStyle(row, 0, rowHeaderStyle);
      setCellStyle(row, 1, cellLeftStyle);
      for (let col = 2; col < totalColumns; col += 1) {
        setCellStyle(row, col, cellCenterStyle);
      }
    }

    [totalHoursRowIndex, totalCostRowIndex].forEach((rowIndex) => {
      setCellStyle(rowIndex, 0, summaryLabelStyle);
      for (let col = 1; col < totalColumns - 1; col += 1) {
        setCellStyle(rowIndex, col, cellCenterStyle);
      }
      setCellStyle(rowIndex, totalColumns - 1, summaryValueStyle);
    });

    worksheet["!cols"] = [
      { wch: 32 },
      { wch: 24 },
      ...daysToShow.map(() => ({ wch: 5 })),
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new() as XLSX.WorkBook & {
      Workbook?: { CalcPr?: { fullCalcOnLoad?: boolean } };
    };
    workbook.Workbook = { CalcPr: { fullCalcOnLoad: true } };
    XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");
    const data = XLSX.write(workbook, { bookType: "xlsx", type: "array", cellStyles: true });
    const blob = new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `timesheet_${employeeName}_${currentMonth + 1}_${currentYear}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-10">
            <span>Учет рабочего времени: {employeeName}</span>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Скачать
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {contractorName && (
            <Badge variant="outline" className="w-fit">
              {`\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442: ${contractorName}`}
            </Badge>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigatePeriod("prev")}> 
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[150px] text-center">
                {viewMode === "month"
                  ? `${getMonthName(currentMonth)} ${currentYear}`
                  : `Неделя ${getWeekNumber(currentDate)}`
                }
              </span>
              <Button variant="outline" size="sm" onClick={() => navigatePeriod("next")}> 
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Месяц
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                Неделя
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline">
              Ставка: {contractRate ? `${contractRate} руб. (контракт)` : `${hourlyRate} руб./чел-день`}
            </Badge>
            <Badge variant="secondary">
              Итого за период: {calculateTotalHours()} чел/дней = {calculateTotalCost().toLocaleString()} руб.
            </Badge>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 z-10 p-2 text-left font-medium min-w-[200px] border-r">
                    Задача / Проект
                  </th>
                  {daysToShow.map((day) => (
                    <th
                      key={day}
                      className={cn(
                        "p-2 text-center font-medium min-w-[32px] border-r",
                        isWeekend(day) && "bg-muted",
                      )}
                    >
                      {day}
                    </th>
                  ))}
                  <th className="p-2 text-center font-medium min-w-[50px]">Итого</th>
                </tr>
              </thead>
              <tbody>
                {tasksForView.map((task) => {
                  const taskTotal = daysToShow.reduce((sum, day) => {
                    const val = getTimeEntry(task.id, day);
                    return sum + (parseNumericValue(val) ?? 0);
                  }, 0);

                  return (
                    <tr key={task.id} className="border-t hover:bg-muted/30">
                      <td className="sticky left-0 bg-background z-10 p-2 border-r">
                        <div className="font-medium truncate">{task.name}</div>
                        <div className="text-muted-foreground truncate">{task.projectName}</div>
                      </td>
                      {daysToShow.map((day) => {
                        const value = getCellValue(task.id, day);
                        return (
                          <td
                            key={day}
                            className={cn(
                              "p-2 text-center border-r",
                              getCellClass(task.id, day),
                            )}
                          >
                            {getDisplayValue(value)}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center font-medium">{taskTotal || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center font-semibold">+</span>
              <span>День</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded flex items-center justify-center text-yellow-800 dark:text-yellow-400">б</span>
              <span>Больничный</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center text-blue-800 dark:text-blue-400">к</span>
              <span>Командировка</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center text-green-800 dark:text-green-400">о</span>
              <span>Отпуск</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center text-purple-800 dark:text-purple-400">в</span>
              <span>Выходной</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
