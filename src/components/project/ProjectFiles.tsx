import { Card } from "@/components/ui/card";

interface ProjectFilesProps {
  project: {
    id: string;
    name: string;
  };
}

export default function ProjectFiles({ project }: ProjectFilesProps) {
  void project;

  return (
    <Card className="border-2 border-border/40 bg-card p-8 text-center shadow-soft">
      <p className="text-muted-foreground">Раздел в разработке</p>
    </Card>
  );
}
