export type TaskScheduleInput = {
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  status?: string | null;
};

const normalizeDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDate = (value?: Date | null) =>
  value ? value.toLocaleDateString("ru-RU") : "";

export const getTaskScheduleBadge = ({ plannedStartDate, plannedEndDate, status }: TaskScheduleInput) => {
  const start = normalizeDate(plannedStartDate) ?? normalizeDate(plannedEndDate);
  const end = normalizeDate(plannedEndDate) ?? start;
  const today = normalizeDate(new Date().toISOString());

  if (!start && !end) {
    return {
      label: "Без срока",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  const label =
    start && end && start.getTime() !== end.getTime()
      ? `${formatDate(start)} - ${formatDate(end)}`
      : formatDate(end ?? start);

  if (end && today && end < today && ["new", "in_progress"].includes(status ?? "")) {
    return {
      label,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    };
  }

  if (end && today) {
    const daysToEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToEnd >= 0 && daysToEnd <= 2) {
      return {
        label,
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      };
    }
  }

  if (start && today && start > today) {
    return {
      label,
      className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    };
  }

  if (start && end && today && start <= today && end >= today) {
    return {
      label,
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
  }

  return {
    label,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
};
