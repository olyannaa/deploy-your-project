import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "Ожидает",
  approved: "Согласовано",
  rejected: "Отклонено",
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function Approvals() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [finalCosts, setFinalCosts] = useState<Record<string, string>>({});

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["subcontracts", "filtered", statusFilter],
    queryFn: () =>
      apiFetch<any[]>(`/subcontracts/requests?status=${encodeURIComponent(statusFilter)}`),
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ["subcontracts", "all"],
    queryFn: () => apiFetch<any[]>("/subcontracts/requests?status=all"),
  });

  useEffect(() => {
    const next: Record<string, string> = {};
    requests.forEach((request) => {
      const fallback = request.subcontractCostFinal ?? request.subcontractCostRequested ?? "";
      next[request.id] = fallback ? String(fallback) : "";
    });
    setFinalCosts(next);
  }, [requests]);

  const handleApprove = async (requestId: string) => {
    const rawValue = finalCosts[requestId] ?? "";
    const normalized = rawValue.replace(",", ".").trim();
    const finalCost = Number(normalized);
    if (!Number.isFinite(finalCost) || finalCost <= 0) {
      toast.error("Укажите финальную стоимость");
      return;
    }

    try {
      await apiFetch(`/subcontracts/${requestId}/approve`, {
        method: "POST",
        body: JSON.stringify({ finalCost }),
      });
      queryClient.invalidateQueries({ queryKey: ["subcontracts"] });
      toast.success("Заявка согласована");
    } catch (error: any) {
      toast.error(error.message || "Не удалось согласовать заявку");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await apiFetch(`/subcontracts/${requestId}/reject`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["subcontracts"] });
      toast.success("Заявка отклонена");
    } catch (error: any) {
      toast.error(error.message || "Не удалось отклонить заявку");
    }
  };

  const totals = useMemo(() => {
    const source = allRequests.length > 0 ? allRequests : requests;
    return {
      pending: source.filter((request) => request.approvalStatus === "pending").length,
      approved: source.filter((request) => request.approvalStatus === "approved").length,
      rejected: source.filter((request) => request.approvalStatus === "rejected").length,
    };
  }, [allRequests, requests]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Заявки на субподряд</h1>
          <p className="text-muted-foreground mt-1">
            Согласование стоимости и контроль статуса заявок
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Ожидают согласования</SelectItem>
              <SelectItem value="approved">Согласованные</SelectItem>
              <SelectItem value="rejected">Отклоненные</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Ожидают: {totals.pending}</Badge>
        <Badge variant="outline">Согласовано: {totals.approved}</Badge>
        <Badge variant="outline">Отклонено: {totals.rejected}</Badge>
      </div>

      <Card className="border-border/40 bg-card p-4 shadow-soft">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Загрузка заявок...</div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Заявок нет</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Задача</TableHead>
                <TableHead>Проект</TableHead>
                <TableHead>Исполнитель</TableHead>
                <TableHead className="text-right">Запрошено</TableHead>
                <TableHead className="text-right">Финальная цена</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.title}</TableCell>
                  <TableCell>{request.projectName || "Вне проекта"}</TableCell>
                  <TableCell>{request.assigneeName || "—"}</TableCell>
                  <TableCell className="text-right">
                    {(request.subcontractCostRequested ?? 0).toLocaleString("ru-RU")} ₽
                  </TableCell>
                  <TableCell className="text-right">
                    {request.approvalStatus === "pending" ? (
                      <Input
                        className="h-8 text-right"
                        value={finalCosts[request.id] ?? ""}
                        onChange={(event) =>
                          setFinalCosts((prev) => ({ ...prev, [request.id]: event.target.value }))
                        }
                        placeholder="0"
                      />
                    ) : request.subcontractCostFinal ? (
                      `${Number(request.subcontractCostFinal).toLocaleString("ru-RU")} ₽`
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusStyles[request.approvalStatus] ?? ""}
                    >
                      {statusLabels[request.approvalStatus] ?? request.approvalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {request.approvalStatus === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleApprove(request.id)}>
                          Согласовать
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(request.id)}
                        >
                          Отклонить
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
