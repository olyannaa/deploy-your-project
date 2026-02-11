// Mock API handler — intercepts all apiFetch calls and returns demo data
import {
  mockDepartments,
  mockEmployees,
  mockProjects,
  mockTasks,
  mockContractors,
  mockSubcontractRequests,
  mockProjectMembers,
  mockProjectSubcontractors,
} from "@/data/mockData";

// In-memory mutable copies so CRUD operations work in the session
let departments = [...mockDepartments];
let employees = [...mockEmployees];
let projects = [...mockProjects.map((p) => ({ ...p }))];
let tasks = [...mockTasks.map((t) => ({ ...t }))];
let contractors = [...mockContractors];
let subcontractRequests = [...mockSubcontractRequests.map((r) => ({ ...r }))];
const projectMembers: Record<string, string[]> = { ...mockProjectMembers };
let projectSubcontractors = [...mockProjectSubcontractors.map((s) => ({ ...s }))];
let timeEntries: any[] = [];
let dayOffs: any[] = [];

function matchRoute(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export async function mockApiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const [rawPath, queryString] = path.split("?");
  const params = new URLSearchParams(queryString || "");
  const body = options.body ? JSON.parse(options.body as string) : null;

  // Small delay to simulate network
  await new Promise((r) => setTimeout(r, 50));

  // ── Departments ──
  if (rawPath === "/departments" && method === "GET") {
    return departments as unknown as T;
  }
  if (rawPath === "/departments" && method === "POST") {
    const dept = { id: `dept-${Date.now()}`, ...body };
    departments.push(dept);
    return dept as unknown as T;
  }
  let m = matchRoute(rawPath, "/departments/:id");
  if (m && method === "PATCH") {
    const idx = departments.findIndex((d) => d.id === m!.id);
    if (idx >= 0) departments[idx] = { ...departments[idx], ...body };
    return departments[idx] as unknown as T;
  }
  if (m && method === "DELETE") {
    departments = departments.filter((d) => d.id !== m!.id);
    return {} as T;
  }

  // ── Users / Employees ──
  if (rawPath === "/users" && method === "GET") {
    return employees as unknown as T;
  }
  if (rawPath === "/users" && method === "POST") {
    const emp = { id: `user-${Date.now()}`, ...body, activeProjects: 0 };
    employees.push(emp);
    return emp as unknown as T;
  }
  m = matchRoute(rawPath, "/users/:id");
  if (m && method === "PATCH") {
    const idx = employees.findIndex((e) => e.id === m!.id);
    if (idx >= 0) employees[idx] = { ...employees[idx], ...body };
    return employees[idx] as unknown as T;
  }
  if (m && method === "DELETE") {
    employees = employees.filter((e) => e.id !== m!.id);
    return {} as T;
  }

  // ── Contractors ──
  if (rawPath === "/contractors" && method === "GET") {
    return contractors as unknown as T;
  }
  if (rawPath === "/contractors" && method === "POST") {
    const c = { id: `contr-${Date.now()}`, ...body };
    contractors.push(c);
    return c as unknown as T;
  }
  m = matchRoute(rawPath, "/contractors/:id");
  if (m && method === "GET") {
    const c = contractors.find((x) => x.id === m!.id);
    return (c || {}) as unknown as T;
  }
  if (m && method === "PATCH") {
    const idx = contractors.findIndex((c) => c.id === m!.id);
    if (idx >= 0) contractors[idx] = { ...contractors[idx], ...body };
    return contractors[idx] as unknown as T;
  }
  if (m && method === "DELETE") {
    contractors = contractors.filter((c) => c.id !== m!.id);
    return {} as T;
  }

  // ── Projects ──
  if (rawPath === "/projects" && method === "GET") {
    const deptFilter = params.get("departmentId");
    let result = projects;
    if (deptFilter) result = result.filter((p) => p.departmentId === deptFilter);
    return result as unknown as T;
  }
  if (rawPath === "/projects" && method === "POST") {
    const p = { id: `proj-${Date.now()}`, ...body, progress: 0, team: 0, tasks: { total: 0, completed: 0 }, sections: [] };
    projects.push(p);
    return p as unknown as T;
  }
  m = matchRoute(rawPath, "/projects/:id");
  if (m && method === "GET") {
    const p = projects.find((x) => x.id === m!.id);
    return (p || null) as unknown as T;
  }
  if (m && method === "PATCH") {
    const idx = projects.findIndex((p) => p.id === m!.id);
    if (idx >= 0) projects[idx] = { ...projects[idx], ...body };
    return projects[idx] as unknown as T;
  }
  if (m && method === "DELETE") {
    projects = projects.filter((p) => p.id !== m!.id);
    return {} as T;
  }
  m = matchRoute(rawPath, "/projects/:id/restore");
  if (m && method === "POST") {
    const idx = projects.findIndex((p) => p.id === m!.id);
    if (idx >= 0) projects[idx] = { ...projects[idx], status: "active" };
    return {} as T;
  }

  // ── Project members ──
  m = matchRoute(rawPath, "/projects/:id/members");
  if (m && method === "GET") {
    const memberIds = projectMembers[m.id] || [];
    const members = memberIds.map((id) => employees.find((e) => e.id === id)).filter(Boolean);
    return members as unknown as T;
  }

  // ── Project tasks ──
  m = matchRoute(rawPath, "/projects/:id/tasks");
  if (m && method === "GET") {
    const projectTasks = tasks.filter((t) => t.projectId === m!.id);
    return projectTasks as unknown as T;
  }

  // ── Project subcontractors ──
  m = matchRoute(rawPath, "/projects/:id/subcontractors");
  if (m && method === "GET") {
    return projectSubcontractors.filter((s) => s.projectId === m!.id) as unknown as T;
  }

  // ── Project sections ──
  m = matchRoute(rawPath, "/projects/:id/sections");
  if (m && method === "GET") {
    const p = projects.find((x) => x.id === m!.id);
    return (p?.sections || []) as unknown as T;
  }
  if (m && method === "PUT") {
    const idx = projects.findIndex((p) => p.id === m!.id);
    if (idx >= 0) projects[idx] = { ...projects[idx], sections: body };
    return body as unknown as T;
  }

  // ── Tasks ──
  if (rawPath === "/tasks" && method === "GET") {
    let result = [...tasks];
    const projectId = params.get("projectId");
    const taskType = params.get("taskType");
    const assigneeId = params.get("assigneeId");
    if (projectId) result = result.filter((t) => t.projectId === projectId);
    if (taskType) result = result.filter((t) => t.taskType === taskType);
    if (assigneeId) result = result.filter((t) => t.assigneeId === assigneeId);
    return result as unknown as T;
  }
  if (rawPath === "/tasks" && method === "POST") {
    const t = { id: `task-${Date.now()}`, ...body };
    tasks.push(t);
    return t as unknown as T;
  }
  m = matchRoute(rawPath, "/tasks/:id");
  if (m && method === "GET") {
    const t = tasks.find((x) => x.id === m!.id);
    return (t || null) as unknown as T;
  }
  if (m && method === "PATCH") {
    const idx = tasks.findIndex((t) => t.id === m!.id);
    if (idx >= 0) tasks[idx] = { ...tasks[idx], ...body };
    return tasks[idx] as unknown as T;
  }
  if (m && method === "DELETE") {
    tasks = tasks.filter((t) => t.id !== m!.id);
    return {} as T;
  }

  // ── Subcontract requests ──
  if (rawPath === "/subcontracts/requests" && method === "GET") {
    const statusF = params.get("status");
    if (statusF && statusF !== "all") {
      return subcontractRequests.filter((r) => r.status === statusF) as unknown as T;
    }
    return subcontractRequests as unknown as T;
  }

  // ── Time tracking entries ──
  if (rawPath === "/time-tracking/entries" && method === "GET") {
    const userId = params.get("userId");
    return timeEntries.filter((e) => e.userId === userId) as unknown as T;
  }
  if (rawPath === "/time-tracking/entries" && method === "POST") {
    const existing = timeEntries.findIndex(
      (e) => e.userId === body.userId && e.taskId === body.taskId && e.date === body.date,
    );
    if (existing >= 0) {
      timeEntries[existing] = { ...timeEntries[existing], ...body };
    } else {
      timeEntries.push({ id: `te-${Date.now()}`, ...body });
    }
    return {} as T;
  }

  // ── Day offs ──
  if (rawPath === "/time-tracking/day-offs" && method === "GET") {
    const userId = params.get("userId");
    return dayOffs.filter((d) => d.userId === userId) as unknown as T;
  }
  if (rawPath === "/time-tracking/day-offs" && method === "POST") {
    dayOffs.push({ id: `do-${Date.now()}`, ...body });
    return {} as T;
  }

  // ── Project files (stub) ──
  m = matchRoute(rawPath, "/projects/:id/files");
  if (m) return [] as unknown as T;

  // ── Project chat (stub) ──
  m = matchRoute(rawPath, "/projects/:id/messages");
  if (m && method === "GET") return [] as unknown as T;
  if (m && method === "POST") return body as unknown as T;

  // ── Contractor details ──
  m = matchRoute(rawPath, "/contractors/:id/projects");
  if (m) return [] as unknown as T;

  // ── Auth refresh (no-op in demo) ──
  if (rawPath === "/auth/refresh") return {} as T;

  // ── Fallback ──
  console.warn(`[MockAPI] Unhandled: ${method} ${path}`);
  return [] as unknown as T;
}
