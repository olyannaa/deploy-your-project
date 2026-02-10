import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileText, Search, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ProjectFile {
  id: string;
  fileName: string;
  fileUrl: string;
  description?: string;
}

interface FilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: ProjectFile[];
  onSelect: (file: ProjectFile) => void;
}

export default function FilePickerDialog({
  open,
  onOpenChange,
  files,
  onSelect,
}: FilePickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);

  const filteredFiles = files.filter((file) => {
    const description = file.description ?? "";
    return (
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleSelect = () => {
    if (selectedFile) {
      onSelect(selectedFile);
      setSelectedFile(null);
      setSearchQuery("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Выбрать файл из проекта</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск файлов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground mt-2">Файлы не найдены</p>
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <Card
                    key={file.id}
                    className={cn(
                      "p-3 cursor-pointer transition-all hover:bg-accent",
                      selectedFile?.id === file.id && "ring-2 ring-primary bg-accent"
                    )}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{file.fileName}</p>
                          {selectedFile?.id === file.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                        {file.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSelect} disabled={!selectedFile}>
              Выбрать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
