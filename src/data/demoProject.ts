import { ProjectSection, irdTemplate, projectDocumentationTemplate, workDocumentationTemplate } from "./projectTemplates";

// Demo users for the organization
export const demoUsers = [
  { id: "user1", name: "Иванов И.И.", email: "ivanov@project.com" },
  { id: "user2", name: "Петров П.П.", email: "petrov@project.com" },
  { id: "user3", name: "Сидорова А.С.", email: "sidorova@project.com" },
  { id: "user4", name: "Козлов В.М.", email: "kozlov@project.com" },
  { id: "user5", name: "Морозова Е.А.", email: "morozova@project.com" },
  { id: "user6", name: "Волков Д.К.", email: "volkov@project.com" },
  { id: "user7", name: "Лебедева О.Н.", email: "lebedeva@project.com" },
  { id: "user8", name: "Новиков С.В.", email: "novikov@project.com" },
];

// Helper to generate dates
const addDays = (date: Date, days: number): string => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
};

const baseDate = new Date("2024-01-15");

// Generate sections with filled dates and executors
const generateFilledSections = (): ProjectSection[] => {
  const sections: ProjectSection[] = [];
  let dayOffset = 0;

  // Add IRD sections
  irdTemplate.forEach((template, index) => {
    const duration = 7 + Math.floor(Math.random() * 14); // 7-21 days
    sections.push({
      ...template,
      id: crypto.randomUUID(),
      startDate: addDays(baseDate, dayOffset),
      plannedEndDate: addDays(baseDate, dayOffset + duration),
      executor: demoUsers[index % demoUsers.length].name, Math.floor(Math.random() * 100)),
      actualEndDate: Math.random() > 0.5 ? addDays(baseDate, dayOffset + duration + Math.floor(Math.random() * 5)) : "",
    });
    dayOffset += Math.floor(duration * 0.3); // Overlap sections
  });

  // Add Project Documentation sections
  const pdOffset = 60; // Start after 60 days
  dayOffset = pdOffset;
  projectDocumentationTemplate.forEach((template, index) => {
    const duration = 14 + Math.floor(Math.random() * 21); // 14-35 days
    sections.push({
      ...template,
      id: crypto.randomUUID(),
      startDate: addDays(baseDate, dayOffset),
      plannedEndDate: addDays(baseDate, dayOffset + duration),
      executor: demoUsers[(index + 2) % demoUsers.length].name, Math.floor(Math.random() * 80)),
      actualEndDate: "",
    });
    dayOffset += Math.floor(duration * 0.4);
  });

  // Add Work Documentation sections
  const wdOffset = 150; // Start after 150 days
  dayOffset = wdOffset;
  workDocumentationTemplate.forEach((template, index) => {
    const duration = 21 + Math.floor(Math.random() * 28); // 21-49 days
    sections.push({
      ...template,
      id: crypto.randomUUID(),
      startDate: addDays(baseDate, dayOffset),
      plannedEndDate: addDays(baseDate, dayOffset + duration),
      executor: demoUsers[(index + 4) % demoUsers.length].name, Math.floor(Math.random() * 50)),
      actualEndDate: "",
    });
    dayOffset += Math.floor(duration * 0.5);
  });

  return sections;
};

export const demoProject = {
  id: 7,
  name: "Агропромышленный комплекс 'Рассвет'",
  description: "Комплексный проект агропромышленного предприятия с полным циклом документации: сбор ИРД, проектная и рабочая документация",
  status: "active",
  progress: 35,
  team: 8,
  startDate: "15 янв 2024",
  endDate: "30 дек 2024",
  tasks: { total: 72, completed: 25 },
  color: "from-amber-500 to-amber-600",
  manager: "Иванов И.И.",
  organization: "ООО 'АгроПроект'",
  externalLink: "https://cloud.project.com/agro-complex",
  sections: generateFilledSections(),
};

export const demoProjectForList = {
  id: demoProject.id,
  name: demoProject.name,
  description: demoProject.description,
  status: demoProject.status,
  progress: demoProject.progress,
  team: demoProject.team,
  startDate: demoProject.startDate,
  endDate: demoProject.endDate,
  tasks: demoProject.tasks,
  color: demoProject.color,
};

