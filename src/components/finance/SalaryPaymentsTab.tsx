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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, AlertCircle } from "lucide-react";
import {
  getGlobalPayrolls,
  setGlobalPayrolls,
  getEmployeeAccrued,
  type SalaryPayroll,
  type SalaryPaymentRecord,
} from "@/data/salaryStore";
import { mockEmployees, mockDepartments } from "@/data/mockData";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPayrollOptions(): { value: string; label: string }[] {
  const payrolls = getGlobalPayrolls();
  return payrolls.map((p) => ({
    value: p.id,
    label: `${p.date.split("-").reverse().join(".")} — ${p.type === "advance" ? "Аванс" : "ЗП"} (${p.monthLabel})`,
  }));
}

interface SalaryPaymentsTabProps {
  onPayrollProcessed?: () => void;
}

export default function SalaryPaymentsTab({ onPayrollProcessed }: SalaryPaymentsTabProps) {
  const payrolls = getGlobalPayrolls();

  // Default to first unprocessed, or last one
  const defaultPayroll = payrolls.find((p) => !p.processed) || payrolls[payrolls.length - 1];
  const [selectedPayrollId, setSelectedPayrollId] = useState(defaultPayroll?.id || "");
  const [localPayrolls, setLocalPayrolls] = useState<SalaryPayroll[]>(payrolls);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});

  const selectedPayroll = localPayrolls.find((p) => p.id === selectedPayrollId);
  const payrollOptions = useMemo(() => {
    return localPayrolls.map((p) => ({
      value: p.id,
      label: `${p.date.split("-").reverse().join(".")} — ${p.type === "advance" ? "Аванс" : "ЗП"} (${p.monthLabel})`,
    }));
  }, [localPayrolls]);

  const isProcessed = selectedPayroll?.processed || false;

  // Compute totals
  const totalAmount = selectedPayroll?.employees.reduce((s, e) => s + e.amount, 0) || 0;
  const totalPaid = selectedPayroll?.employees.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0) || 0;
  const totalUnpaid = totalAmount - totalPaid;
  const allChecked = selectedPayroll?.employees.every((e) => e.paid) || false;

  const toggleEmployee = (empId: string) => {
    if (isProcessed) return;
    setLocalPayrolls((prev) =>
      prev.map((p) =>
        p.id === selectedPayrollId
          ? {
              ...p,
              employees: p.employees.map((e) =>
                e.employeeId === empId ? { ...e, paid: !e.paid } : e
              ),
            }
          : p
      )
    );
  };

  const toggleAll = () => {
    if (isProcessed) return;
    const newPaid = !allChecked;
    setLocalPayrolls((prev) =>
      prev.map((p) =>
        p.id === selectedPayrollId
          ? { ...p, employees: p.employees.map((e) => ({ ...e, paid: newPaid })) }
          : p
      )
    );
  };

  const updateAmount = (empId: string, value: string) => {
    if (isProcessed) return;
    setEditAmounts((prev) => ({ ...prev, [empId]: value }));
    const numVal = parseFloat(value) || 0;
    setLocalPayrolls((prev) =>
      prev.map((p) =>
        p.id === selectedPayrollId
          ? {
              ...p,
              employees: p.employees.map((e) =>
                e.employeeId === empId ? { ...e, amount: numVal } : e
              ),
            }
          : p
      )
    );
  };

  const processPayroll = () => {
    const updated = localPayrolls.map((p) =>
      p.id === selectedPayrollId ? { ...p, processed: true } : p
    );
    setLocalPayrolls(updated);
    setGlobalPayrolls(updated);
    setConfirmOpen(false);
    onPayrollProcessed?.();
  };

  // Employee details enrichment
  const getEmployeeDetails = (empId: string) => {
    const emp = mockEmployees.find((e) => e.id === empId);
    if (!emp) return { department: "—", isContract: false, rate: 0 };
    const dept = mockDepartments.find((d) => d.id === emp.primaryDepartmentId);
    return {
      department: dept?.name || "—",
      isContract: !!emp.contractRate,
      rate: emp.contractRate || emp.dailyRate || 0,
    };
  };

  // Get month key from payroll date for accrued calculation
  const getAccruedMonth = () => {
    if (!selectedPayroll) return "";
    const d = new Date(selectedPayroll.date);
    if (selectedPayroll.type === "salary") {
      // 5th = salary for previous month
      d.setMonth(d.getMonth() - 1);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const accruedMonth = getAccruedMonth();

  return (
    <div className="space-y-4">
      {/* Payroll selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedPayrollId} onValueChange={setSelectedPayrollId}>
          <SelectTrigger className="w-[400px]">
            <SelectValue placeholder="Выберите ведомость" />
          </SelectTrigger>
          <SelectContent>
            {payrollOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPayroll && (
          <Badge
            variant={isProcessed ? "default" : "secondary"}
            className="text-xs"
          >
            {isProcessed ? (
              <><Check className="h-3 w-3 mr-1" /> Проведена</>
            ) : (
              <><AlertCircle className="h-3 w-3 mr-1" /> Не проведена</>
            )}
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      {selectedPayroll && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Итого к выплате</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(totalAmount)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Выплачено</div>
            <div className="text-xl font-bold mt-1 text-primary">{formatCurrency(totalPaid)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">Остаток</div>
            <div className={`text-xl font-bold mt-1 ${totalUnpaid > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
              {formatCurrency(totalUnpaid)}
            </div>
          </div>
        </div>
      )}

      {/* Employee payroll table */}
      {selectedPayroll && (
        <div className="rounded-lg border border-border overflow-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={toggleAll}
                    disabled={isProcessed}
                  />
                </TableHead>
                <TableHead className="min-w-[220px]">Сотрудник</TableHead>
                <TableHead className="min-w-[180px]">Подразделение</TableHead>
                <TableHead className="text-center min-w-[80px]">Тип</TableHead>
                <TableHead className="text-right min-w-[120px]">Начислено (мес.)</TableHead>
                <TableHead className="text-right min-w-[130px]">К выплате</TableHead>
                <TableHead className="text-center min-w-[100px]">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedPayroll.employees.map((emp) => {
                const details = getEmployeeDetails(emp.employeeId);
                const accrued = accruedMonth
                  ? getEmployeeAccrued(emp.employeeId, accruedMonth)
                  : 0;

                return (
                  <TableRow
                    key={emp.employeeId}
                    className={emp.paid ? "bg-muted/20" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={emp.paid}
                        onCheckedChange={() => toggleEmployee(emp.employeeId)}
                        disabled={isProcessed}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{emp.employeeName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {details.department}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={details.isContract ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {details.isContract ? "Контракт" : "Штат"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCurrency(accrued)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isProcessed ? (
                        <span className="font-medium">{formatCurrency(emp.amount)}</span>
                      ) : (
                        <Input
                          type="number"
                          className="w-32 ml-auto text-right"
                          value={editAmounts[emp.employeeId] ?? emp.amount}
                          onChange={(e) =>
                            updateAmount(emp.employeeId, e.target.value)
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {emp.paid ? (
                        <Badge variant="default" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Выплачено
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Ожидает
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Total row */}
              <TableRow className="bg-muted/50 border-t-2 border-border font-bold">
                <TableCell />
                <TableCell>Итого</TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{formatCurrency(totalAmount)}</TableCell>
                <TableCell className="text-center text-sm">
                  {selectedPayroll.employees.filter((e) => e.paid).length} / {selectedPayroll.employees.length}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Process button */}
      {selectedPayroll && !isProcessed && (
        <div className="flex justify-end">
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={totalPaid === 0}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Провести выплату ({formatCurrency(totalPaid)})
          </Button>
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение выплаты</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm">
              Вы проводите ведомость:{" "}
              <span className="font-semibold">
                {selectedPayroll?.type === "advance" ? "Аванс" : "ЗП"} —{" "}
                {selectedPayroll?.monthLabel}
              </span>
            </p>
            <p className="text-sm">
              Сумма выплаты:{" "}
              <span className="font-semibold text-primary">
                {formatCurrency(totalPaid)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Отмечено сотрудников:{" "}
              {selectedPayroll?.employees.filter((e) => e.paid).length} из{" "}
              {selectedPayroll?.employees.length}
            </p>
            {totalUnpaid > 0 && (
              <p className="text-sm text-destructive">
                Остаток невыплаченных: {formatCurrency(totalUnpaid)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button onClick={processPayroll}>Подтвердить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
