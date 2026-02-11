// Mock data store for demo mode
import { demoUsers } from "./demoProject";
import { irdTemplate, projectDocumentationTemplate, workDocumentationTemplate, type ProjectSection } from "./projectTemplates";

// ── Departments ──
export const mockDepartments = [
  { id: "dept-1", name: "Отдел проектирования", description: "Архитектурные и конструктивные решения" },
  { id: "dept-2", name: "Отдел инженерных систем", description: "ИОС, электрика, вентиляция" },
  { id: "dept-3", name: "Отдел изысканий", description: "Геодезия, геология, экология" },
  { id: "dept-4", name: "Бухгалтерия", description: "Финансовый учет и отчетность" },
];

// ── Employees ──
export const mockEmployees = [
  { id: "user-1", fullName: "Иванов Иван Иванович", email: "ivanov@project.com", roles: ["admin"], departmentIds: ["dept-1"], primaryDepartmentId: "dept-1", canApproveSubcontracts: true, dailyRate: 5000, contractRate: null, activeProjects: 5 },
  { id: "user-2", fullName: "Петров Пётр Петрович", email: "petrov@project.com", roles: ["gip"], departmentIds: ["dept-1"], primaryDepartmentId: "dept-1", canApproveSubcontracts: false, dailyRate: 4500, contractRate: null, activeProjects: 3 },
  { id: "user-3", fullName: "Сидорова Анна Сергеевна", email: "sidorova@project.com", roles: ["executor"], departmentIds: ["dept-1", "dept-2"], primaryDepartmentId: "dept-1", canApproveSubcontracts: false, dailyRate: 3500, contractRate: null, activeProjects: 4 },
  { id: "user-4", fullName: "Козлов Виктор Михайлович", email: "kozlov@project.com", roles: ["executor"], departmentIds: ["dept-2"], primaryDepartmentId: "dept-2", canApproveSubcontracts: false, dailyRate: 3500, contractRate: null, activeProjects: 2 },
  { id: "user-5", fullName: "Морозова Елена Андреевна", email: "morozova@project.com", roles: ["accountant"], departmentIds: ["dept-4"], primaryDepartmentId: "dept-4", canApproveSubcontracts: false, dailyRate: 3000, contractRate: null, activeProjects: 0 },
  { id: "user-6", fullName: "Волков Дмитрий Константинович", email: "volkov@project.com", roles: ["executor"], departmentIds: ["dept-3"], primaryDepartmentId: "dept-3", canApproveSubcontracts: false, dailyRate: 0, contractRate: 150000, activeProjects: 2 },
  { id: "user-7", fullName: "Лебедева Ольга Николаевна", email: "lebedeva@project.com", roles: ["executor"], departmentIds: ["dept-2"], primaryDepartmentId: "dept-2", canApproveSubcontracts: false, dailyRate: 3200, contractRate: null, activeProjects: 3 },
  { id: "user-8", fullName: "Новиков Сергей Валерьевич", email: "novikov@project.com", roles: ["gip"], departmentIds: ["dept-3"], primaryDepartmentId: "dept-3", canApproveSubcontracts: false, dailyRate: 4000, contractRate: null, activeProjects: 2 },
];

// ── Contractors ──
export const mockContractors = [
  { id: "contr-1", name: "ООО «СтройМонтаж»", inn: "7701234567" },
  { id: "contr-2", name: "ООО «ГеоИзыскания»", inn: "7702345678" },
  { id: "contr-3", name: "ИП Кузнецов А.В.", inn: "770312345678" },
];

// ── Helper ──
const addDays = (date: Date, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

const generateSections = (
  template: Omit<ProjectSection, "id">[],
  baseDate: Date,
  startOffset: number,
): ProjectSection[] => {
  let dayOffset = startOffset;
  return template.map((t, i) => {
    const duration = 7 + Math.floor(Math.random() * 14);
    const section: ProjectSection = {
      ...t,
      id: crypto.randomUUID(),
      startDate: addDays(baseDate, dayOffset),
      plannedEndDate: addDays(baseDate, dayOffset + duration),
      executor: mockEmployees[i % mockEmployees.length].fullName,
      actualEndDate: Math.random() > 0.6 ? addDays(baseDate, dayOffset + duration + Math.floor(Math.random() * 5)) : "",
    };
    dayOffset += Math.floor(duration * 0.4);
    return section;
  });
};

const base = new Date("2024-03-01");

// ── Projects ──
export const mockProjects = [
  {
    id: "proj-1",
    name: "Агропромышленный комплекс «Рассвет»",
    description: "Проектирование агропромышленного предприятия полного цикла",
    status: "active",
    progress: 35,
    team: 5,
    startDate: "2024-03-01",
    endDate: "2024-12-30",
    tasks: { total: 72, completed: 25 },
    departmentId: "dept-1",
    departmentName: "Отдел проектирования",
    manager: "Петров П.П.",
    organization: "ООО «АгроПроект»",
    budget: 12500000,
    sections: [
      ...generateSections(irdTemplate, base, 0),
      ...generateSections(projectDocumentationTemplate, base, 60),
      ...generateSections(workDocumentationTemplate, base, 150),
    ],
  },
  {
    id: "proj-2",
    name: "Жилой комплекс «Парковый»",
    description: "Многоэтажный жилой комплекс из трёх секций",
    status: "active",
    progress: 60,
    team: 4,
    startDate: "2024-01-15",
    endDate: "2024-11-30",
    tasks: { total: 54, completed: 32 },
    departmentId: "dept-1",
    departmentName: "Отдел проектирования",
    manager: "Петров П.П.",
    organization: "ООО «ПаркСтрой»",
    budget: 8200000,
    sections: generateSections(projectDocumentationTemplate, new Date("2024-01-15"), 0),
  },
  {
    id: "proj-3",
    name: "Логистический центр «Восток»",
    description: "Складской комплекс с офисным блоком",
    status: "active",
    progress: 15,
    team: 3,
    startDate: "2024-06-01",
    endDate: "2025-06-01",
    tasks: { total: 40, completed: 6 },
    departmentId: "dept-2",
    departmentName: "Отдел инженерных систем",
    manager: "Новиков С.В.",
    organization: "ООО «ВостокЛогистик»",
    budget: 6800000,
    sections: generateSections(irdTemplate, new Date("2024-06-01"), 0),
  },
  {
    id: "proj-4",
    name: "Школа на 550 мест",
    description: "Общеобразовательная школа с бассейном и спортзалом",
    status: "completed",
    progress: 100,
    team: 6,
    startDate: "2023-09-01",
    endDate: "2024-04-30",
    tasks: { total: 65, completed: 65 },
    departmentId: "dept-1",
    departmentName: "Отдел проектирования",
    manager: "Петров П.П.",
    organization: "Администрация г. Краснодар",
    budget: 15000000,
    sections: generateSections(workDocumentationTemplate, new Date("2023-09-01"), 0),
  },
  {
    id: "proj-5",
    name: "Реконструкция цеха «Молоко»",
    description: "Реконструкция существующего молочного цеха",
    status: "archived",
    progress: 100,
    team: 2,
    startDate: "2023-03-01",
    endDate: "2023-08-15",
    tasks: { total: 28, completed: 28 },
    departmentId: "dept-3",
    departmentName: "Отдел изысканий",
    manager: "Новиков С.В.",
    organization: "ООО «МолПром»",
    budget: 3200000,
    sections: [],
  },
];

// ── Tasks ──
const taskTypes = ["project", "personal", "accounting", "subcontract"] as const;
const taskStatuses = ["new", "in_progress", "review", "done"] as const;

export const mockTasks = [
  { id: "task-1", title: "Разработка генплана", status: "in_progress", taskType: "project", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-3", assigneeName: "Сидорова Анна Сергеевна", plannedStartDate: "2024-03-15", plannedEndDate: "2024-04-15", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: false, sectionId: null },
  { id: "task-2", title: "Расчёт фундаментов", status: "new", taskType: "project", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-4", assigneeName: "Козлов Виктор Михайлович", plannedStartDate: "2024-04-01", plannedEndDate: "2024-05-01", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: false, sectionId: null },
  { id: "task-3", title: "Проект электроснабжения", status: "in_progress", taskType: "project", projectId: "proj-2", projectName: "Жилой комплекс «Парковый»", assigneeId: "user-7", assigneeName: "Лебедева Ольга Николаевна", plannedStartDate: "2024-03-01", plannedEndDate: "2024-04-30", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: false, sectionId: null },
  { id: "task-5", title: "Геологические изыскания площадки", status: "done", taskType: "project", projectId: "proj-3", projectName: "Логистический центр «Восток»", assigneeId: "user-6", assigneeName: "Волков Дмитрий Константинович", plannedStartDate: "2024-06-15", plannedEndDate: "2024-07-15", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: false, sectionId: null },
  { id: "task-6", title: "Согласование ТУ на водоснабжение", status: "new", taskType: "project", projectId: "proj-2", projectName: "Жилой комплекс «Парковый»", assigneeId: "user-4", assigneeName: "Козлов Виктор Михайлович", plannedStartDate: "2024-05-01", plannedEndDate: "2024-05-30", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: false, sectionId: null },
  { id: "task-8", title: "Монтаж вентиляции (субподряд)", status: "new", taskType: "subcontract", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-6", assigneeName: "Волков Дмитрий Константинович", plannedStartDate: "2024-06-01", plannedEndDate: "2024-07-30", approvalStatus: "pending", assigneeContractorName: "ООО «СтройМонтаж»", assigneeIsAccountant: false, sectionId: null },
  { id: "task-9", title: "Разработка раздела ОВ", status: "in_progress", taskType: "project", projectId: "proj-2", projectName: "Жилой комплекс «Парковый»", assigneeId: "user-7", assigneeName: "Лебедева Ольга Николаевна", plannedStartDate: "2024-04-15", plannedEndDate: "2024-06-01", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: false, sectionId: null },
  { id: "task-10", title: "Топографическая съёмка", status: "done", taskType: "project", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-8", assigneeName: "Новиков Сергей Валерьевич", plannedStartDate: "2024-03-01", plannedEndDate: "2024-03-20", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: false, sectionId: null },
  { id: "task-12", title: "Земляные работы (субподряд)", status: "in_progress", taskType: "subcontract", projectId: "proj-3", projectName: "Логистический центр «Восток»", assigneeId: "user-6", assigneeName: "Волков Дмитрий Константинович", plannedStartDate: "2024-07-01", plannedEndDate: "2024-08-15", approvalStatus: "approved", assigneeContractorName: "ООО «ГеоИзыскания»", assigneeIsAccountant: false, sectionId: null },
  // Бухгалтерские задачи
  { id: "acc-1", title: "Выплата ЗП за март — «Рассвет»", status: "done", taskType: "accounting", accountingSubtype: "salary", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-03-25", plannedEndDate: "2024-03-31", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: ["user-1", "user-2", "user-3", "user-4"] },
  { id: "acc-2", title: "Оплата субподрядчику СтройМонтаж", status: "done", taskType: "accounting", accountingSubtype: "subcontract", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-04-01", plannedEndDate: "2024-04-10", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: ["psub-1"] },
  { id: "acc-3", title: "Доп. расходы: командировка на площадку", status: "done", taskType: "accounting", accountingSubtype: "additional", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-04-05", plannedEndDate: "2024-04-12", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: [] },
  { id: "acc-4", title: "Выплата аванса за апрель — «Рассвет»", status: "in_progress", taskType: "accounting", accountingSubtype: "salary", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-04-15", plannedEndDate: "2024-04-20", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: ["user-2", "user-3", "user-6"] },
  { id: "acc-5", title: "Оплата ИП Кузнецов — изыскания", status: "new", taskType: "accounting", accountingSubtype: "subcontract", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-04-20", plannedEndDate: "2024-04-30", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: ["psub-2"] },
  { id: "acc-6", title: "Приход оплаты от заказчика — «Рассвет»", status: "done", taskType: "accounting", accountingSubtype: "other", projectId: "proj-1", projectName: "Агропромышленный комплекс «Рассвет»", assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-03-10", plannedEndDate: "2024-03-15", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: [] },
  { id: "acc-7", title: "Выплата ЗП (общая)", status: "new", taskType: "accounting", accountingSubtype: "salary", projectId: null, projectName: null, assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-04-25", plannedEndDate: "2024-04-30", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: ["user-1", "user-2", "user-3", "user-4", "user-6", "user-7", "user-8"] },
  { id: "acc-8", title: "Оформление КС-2/КС-3 — «Парковый»", status: "in_progress", taskType: "accounting", accountingSubtype: "subcontract", projectId: "proj-2", projectName: "Жилой комплекс «Парковый»", assigneeId: "user-5", assigneeName: "Морозова Елена Андреевна", plannedStartDate: "2024-05-01", plannedEndDate: "2024-05-20", approvalStatus: null, assigneeContractorName: null, assigneeIsAccountant: true, sectionId: null, selectedEmployeeIds: ["psub-3"] },
];

// ── Subcontract approval requests ──
export const mockSubcontractRequests = [
  { id: "sub-1", taskId: "task-8", taskTitle: "Монтаж вентиляции (субподряд)", projectName: "Агропромышленный комплекс «Рассвет»", contractorName: "ООО «СтройМонтаж»", estimatedCost: 850000, finalCost: null, status: "pending", createdAt: "2024-04-10" },
  { id: "sub-2", taskId: "task-12", taskTitle: "Земляные работы (субподряд)", projectName: "Логистический центр «Восток»", contractorName: "ООО «ГеоИзыскания»", estimatedCost: 1200000, finalCost: 1150000, status: "approved", createdAt: "2024-06-20" },
];

// ── Project subcontractors (freelancers) ──
export const mockProjectSubcontractors = [
  { id: "psub-1", projectId: "proj-1", contractorId: "contr-1", contractorName: "ООО «СтройМонтаж»", contractAmount: 850000, workDays: 45 },
  { id: "psub-2", projectId: "proj-1", contractorId: "contr-3", contractorName: "ИП Кузнецов А.В.", contractAmount: 320000, workDays: 20 },
  { id: "psub-3", projectId: "proj-2", contractorId: "contr-1", contractorName: "ООО «СтройМонтаж»", contractAmount: 500000, workDays: 30 },
  { id: "psub-4", projectId: "proj-3", contractorId: "contr-2", contractorName: "ООО «ГеоИзыскания»", contractAmount: 1200000, workDays: 60 },
  { id: "psub-5", projectId: "proj-3", contractorId: "contr-3", contractorName: "ИП Кузнецов А.В.", contractAmount: 180000, workDays: 15 },
];

// ── Project members mapping ──
export const mockProjectMembers: Record<string, string[]> = {
  "proj-1": ["user-1", "user-2", "user-3", "user-4", "user-6"],
  "proj-2": ["user-2", "user-3", "user-7", "user-4"],
  "proj-3": ["user-6", "user-8", "user-4"],
  "proj-4": ["user-2", "user-3", "user-5", "user-7", "user-8", "user-1"],
  "proj-5": ["user-6", "user-8"],
};
