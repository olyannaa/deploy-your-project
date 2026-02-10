import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { projectTemplates, TemplateKey, ProjectSection } from "@/data/projectTemplates";
import { toast } from "sonner";

interface TemplateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplatesSelected: (sections: ProjectSection[]) => void;
  existingSections: ProjectSection[];
}

export default function TemplateSelectionDialog({
  open,
  onOpenChange,
  onTemplatesSelected,
  existingSections,
}: TemplateSelectionDialogProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<Record<TemplateKey, boolean>>({
    ird: true,
    projectDocumentation: true,
    workDocumentation: true,
    masterPlan: false,
    contract: false,
    block6Linear: false,
  });

  const handleCheckboxChange = (key: TemplateKey, checked: boolean) => {
    setSelectedTemplates((prev) => ({ ...prev, [key]: checked }));
  };

  const handleConfirm = () => {
    const selectedKeys = (Object.keys(selectedTemplates) as TemplateKey[]).filter(
      (key) => selectedTemplates[key]
    );

    if (selectedKeys.length === 0) {
      toast.error("Выберите хотя бы один шаблон");
      return;
    }

    // Combine all selected templates
    const newSections: ProjectSection[] = [];
    
    selectedKeys.forEach((key) => {
      const template = projectTemplates[key];
      template.sections.forEach((section) => {
        newSections.push({
          ...section,
          id: crypto.randomUUID(),
          isNew: true,
        });
      });
    });

    // Append to existing sections
    onTemplatesSelected([...existingSections, ...newSections]);
    
    const templateNames = selectedKeys.map((key) => projectTemplates[key].name).join(", ");
    toast.success(`Загружены шаблоны: ${templateNames}`);
    
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Выбор шаблонов</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Выберите шаблоны для загрузки. Разделы будут добавлены к существующим.
          </p>
          
          {(Object.keys(projectTemplates) as TemplateKey[]).map((key) => (
            <div key={key} className="flex items-start space-x-3">
              <Checkbox
                id={`template-${key}`}
                checked={selectedTemplates[key]}
                onCheckedChange={(checked) => handleCheckboxChange(key, checked as boolean)}
              />
              <Label
                htmlFor={`template-${key}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <span className="block">{projectTemplates[key].name}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {projectTemplates[key].sections.length} разделов
                </span>
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
          <Button onClick={handleConfirm}>
            Загрузить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
