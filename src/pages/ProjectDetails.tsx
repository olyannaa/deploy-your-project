import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import ProjectAnalytics from "@/components/project/ProjectAnalytics";
import ProjectProperties from "@/components/project/ProjectProperties";
import ProjectTeam from "@/components/project/ProjectTeam";
import ProjectTasks from "@/components/project/ProjectTasks";
import ProjectGantt from "@/components/project/ProjectGantt";
import ProjectFiles from "@/components/project/ProjectFiles";
import ProjectChat from "@/components/project/ProjectChat";
import { useRole } from "@/contexts/RoleContext";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const projectColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-emerald-500 to-emerald-600",
  "from-pink-500 to-pink-600",
  "from-amber-500 to-amber-600",
];

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentRole } = useRole();

  const showAnalytics = currentRole !== "executor";
  const showTasks = ["admin", "gip", "executor", "accountant"].includes(currentRole);
  const allowedTabs = useMemo(() => {
    const tabs = [
      showAnalytics ? "analytics" : null,
      "properties",
      "team",
      showTasks ? "tasks" : null,
      "files",
      "gantt",
      "chat",
    ].filter(Boolean) as string[];
    return tabs;
  }, [showAnalytics, showTasks]);
  const defaultTab = showAnalytics ? "analytics" : "properties";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const searchKey = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const tab = params.get("tab");
    const nextTab = tab && allowedTabs.includes(tab) ? tab : defaultTab;
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchKey, allowedTabs, defaultTab]);

  const handleTabChange = (nextTab: string) => {
    if (!allowedTabs.includes(nextTab)) {
      return;
    }
    if (nextTab === activeTab) {
      return;
    }
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === defaultTab) {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiFetch<any>(`/projects/${id}`),
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["project", id, "tasks"],
    queryFn: () => apiFetch<any[]>(`/projects/${id}/tasks`),
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["project", id, "members"],
    queryFn: () => apiFetch<any[]>(`/projects/${id}/members`),
    enabled: !!id,
  });

  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const projectView = project
    ? {
        ...project,
        progress,
        team: members.length,
        tasks: { total: totalTasks, completed: completedTasks },
        color: projectColors[0],
      }
    : null;

  if (!projectView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}> 
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к проектам
          </Button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground">Проект не найден</h2>
          <p className="text-muted-foreground mt-2">
            Проект с таким идентификатором не существует
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}> 
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{projectView.name}</h1>
          <p className="text-muted-foreground">{projectView.description}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList
          className="flex w-full flex-nowrap items-center gap-1 overflow-x-auto justify-start touch-pan-x overscroll-x-contain sm:grid sm:gap-0 sm:overflow-visible"
          style={{ gridTemplateColumns: `repeat(${allowedTabs.length}, minmax(0, 1fr))` }}
        >
          {showAnalytics && (
            <TabsTrigger
              value="analytics"
              onClick={() => handleTabChange("analytics")}
              onPointerDown={() => handleTabChange("analytics")}
            >
              Аналитика
            </TabsTrigger>
          )}
          <TabsTrigger
            value="properties"
            onClick={() => handleTabChange("properties")}
            onPointerDown={() => handleTabChange("properties")}
          >
            Свойства
          </TabsTrigger>
          <TabsTrigger
            value="team"
            onClick={() => handleTabChange("team")}
            onPointerDown={() => handleTabChange("team")}
          >
            Команда
          </TabsTrigger>
          {showTasks && (
            <TabsTrigger
              value="tasks"
              onClick={() => handleTabChange("tasks")}
              onPointerDown={() => handleTabChange("tasks")}
            >
              Задачи
            </TabsTrigger>
          )}
          <TabsTrigger
            value="files"
            onClick={() => handleTabChange("files")}
            onPointerDown={() => handleTabChange("files")}
          >
            Файлы
          </TabsTrigger>
          <TabsTrigger
            value="gantt"
            onClick={() => handleTabChange("gantt")}
            onPointerDown={() => handleTabChange("gantt")}
          >
            Диаграмма Ганта
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            onClick={() => handleTabChange("chat")}
            onPointerDown={() => handleTabChange("chat")}
          >
            Чат
          </TabsTrigger>
        </TabsList>

        {showAnalytics && (
          <TabsContent value="analytics" className="mt-6">
            <ProjectAnalytics project={projectView} />
          </TabsContent>
        )}

        <TabsContent value="properties" className="mt-6">
          <ProjectProperties project={projectView} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <ProjectTeam project={projectView} />
        </TabsContent>

        {showTasks && (
          <TabsContent value="tasks" className="mt-6">
            <ProjectTasks project={projectView} />
          </TabsContent>
        )}

        <TabsContent value="files" className="mt-6">
          <ProjectFiles project={projectView} />
        </TabsContent>

        <TabsContent value="gantt" className="mt-6">
          <ProjectGantt project={projectView} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ProjectChat project={projectView} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
