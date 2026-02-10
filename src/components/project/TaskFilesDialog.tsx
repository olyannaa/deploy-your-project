import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectFile {
  id: string;
  fileName: string;
  fileUrl: string;
  description: string;
  taskId: string | null;
  taskName: string | null;
  userName: string;
  createdAt: string;
}

interface TaskFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  taskId: string;
  files: ProjectFile[];
}

export default function TaskFilesDialog({
  open,
  onOpenChange,
  taskTitle,
  taskId,
  files,
}: TaskFilesDialogProps) {
  const taskFiles = files.filter((f) => f.taskId === taskId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Файлы задачи</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{taskTitle}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3 pr-4">
            {taskFiles.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground mt-4">Нет связанных файлов</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Добавьте файлы на вкладке "Файлы"
                </p>
              </div>
            ) : (
              taskFiles.map((file) => (
                <Card key={file.id} className="p-4 border-border/40 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{file.fileName}</h4>
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      {file.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {file.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {file.userName} • {file.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
