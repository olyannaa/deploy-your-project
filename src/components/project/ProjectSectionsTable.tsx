import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ChevronRight, CornerDownRight } from "lucide-react";
import { ProjectSection } from "@/data/projectTemplates";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";

interface ProjectSectionsTableProps {
  sections: ProjectSection[];
  onChange: (sections: ProjectSection[]) => void;
  isReadOnly?: boolean;
  users?: { id: string; fullName: string; contractorName?: string | null }[];
  canAssignExecutors?: boolean;
  lockedSectionIds?: string[];
  subcontractSectionIds?: string[];
}

export default function ProjectSectionsTable({
  sections,
  onChange,
  isReadOnly = false,
  users = [],
  canAssignExecutors = true,
  lockedSectionIds = [],
  subcontractSectionIds = [],
}: ProjectSectionsTableProps) {
  const [openExecutorPopover, setOpenExecutorPopover] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSection | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const generateId = () => crypto.randomUUID();
  const lockedSectionSet = useMemo(() => new Set(lockedSectionIds), [lockedSectionIds]);
  const subcontractSectionSet = useMemo(
    () => new Set(subcontractSectionIds),
    [subcontractSectionIds],
  );

  const getSectionDepth = (code: string) => {
    return code.split(".").filter(Boolean).length;
  };

  const commitSections = (nextSections: ProjectSection[]) => {
    onChange(nextSections);
  };

  const orderedSections = useMemo(() => sections, [sections]);

  const getSubsectionInsertIndex = (
    parentId: string,
    parentCode: string,
    parentIndex: number,
  ) => {
    let lastSubIndex = -1;
    orderedSections.forEach((section, index) => {
      if (section.id === parentId) {
        return;
      }
      const hasParentLink = section.parentId === parentId;
      const hasCodePrefix =
        parentCode && String(section.sectionCode ?? "").startsWith(`${parentCode}.`);
      if (hasParentLink || hasCodePrefix) {
        lastSubIndex = index;
      }
    });

    return lastSubIndex >= 0 ? lastSubIndex : parentIndex;
  };

  const addRow = (parentId?: string, afterIndex?: number) => {
    const parentSection = parentId ? orderedSections.find((s) => s.id === parentId) : null;
    const parentCode = parentSection?.sectionCode || "";
    if (parentId && parentCode && getSectionDepth(parentCode) >= 3) {
      toast.error("Максимальная глубина разделов — 3 уровня");
      return;
    }

    let newSectionCode = "";
    if (parentId) {
      const existingSubsections = orderedSections.filter(
        (s) =>
          s.parentId === parentId ||
          (parentCode && String(s.sectionCode ?? "").startsWith(`${parentCode}.`)),
      );
      const nextSubIndex = existingSubsections.length + 1;
      newSectionCode = `${parentCode}.${nextSubIndex}`;
    }
    
    const newSection: ProjectSection = {
      id: generateId(),
      sectionCode: newSectionCode,
      designation: "",
      sectionName: "",
      startDate: "",
      plannedEndDate: "",
      executor: "",
      actualEndDate: "",
      notes: "",
      parentId: parentId,
      level: parentId ? 1 : 0,
      isNew: true,
    };
    
    const insertAfterIndex =
      parentId && parentSection
        ? getSubsectionInsertIndex(parentId, parentCode, afterIndex ?? orderedSections.indexOf(parentSection))
        : afterIndex;

    if (insertAfterIndex !== undefined) {
      const newSections = [...orderedSections];
      newSections.splice(insertAfterIndex + 1, 0, newSection);
      commitSections(newSections);
      return;
    }

    commitSections([...orderedSections, newSection]);
  };

  const addSubsection = (parentId: string, parentIndex: number) => {
    addRow(parentId, parentIndex);
  };

  const removeRow = (id: string) => {
    const sectionToRemove = orderedSections.find(s => s.id === id);
    if (sectionToRemove) {
      const filteredSections = orderedSections.filter(s => {
        if (s.id === id) return false;
        if (s.parentId === id) return false;
        if (sectionToRemove.sectionCode && s.sectionCode.startsWith(sectionToRemove.sectionCode + ".")) {
          return false;
        }
        return true;
      });
      commitSections(filteredSections);
    }
  };

  const openDeleteDialog = (section: ProjectSection) => {
    setDeleteTarget(section);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    removeRow(deleteTarget.id);
    setDeleteTarget(null);
    setIsDeleteDialogOpen(false);
  };

  const updateRow = (
    id: string,
    field: keyof ProjectSection,
    value: string | number | null,
  ) => {
    if (field === "sectionCode") {
      const nextValue = String(value ?? "").trim();
      if (nextValue && getSectionDepth(nextValue) > 3) {
        toast.error("Максимальная глубина разделов — 3 уровня");
        return;
      }
    }
    commitSections(orderedSections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const isSubsection = (section: ProjectSection) => {
    return section.level === 1 || section.parentId || section.sectionCode.includes(".");
  };

  const renderExecutorCell = (section: ProjectSection) => {
    if (isReadOnly || lockedSectionSet.has(section.id)) {
      return (
        <span className="text-xs">
          {section.executor || section.executorName}
        </span>
      );
    }

    if (!canAssignExecutors || users.length === 0) {
      return (
        <Button
          variant="ghost"
          className="h-7 w-full justify-start text-xs px-2 font-normal text-muted-foreground"
          disabled
        >
          Назначить после создания
        </Button>
      );
    }

    return (
      <Popover 
        open={openExecutorPopover === section.id} 
        onOpenChange={(open) => setOpenExecutorPopover(open ? section.id : null)}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-7 w-full justify-start text-xs px-2 font-normal"
          >
            {section.executor || section.executorName || "Выберите..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск..." className="h-8 text-xs" />
            <CommandList>
              <CommandEmpty>Не найдено</CommandEmpty>
              <CommandGroup>
                {users.map((user) => {
                  const label = user.contractorName
                    ? `${user.fullName} (\u041a\u043e\u043d\u0442\u0440\u0430\u0433\u0435\u043d\u0442: ${user.contractorName})`
                    : user.fullName;
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.fullName}
                      onSelect={() => {
                        const nextSections = orderedSections.map((item) =>
                          item.id === section.id
                            ? {
                                ...item,
                                executor: user.fullName,
                                executorName: user.fullName,
                                executorId: user.id,
                              }
                            : item,
                        );
                        commitSections(nextSections);
                        setOpenExecutorPopover(null);
                      }}
                      className="text-xs"
                    >
                      {label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  const renderTableRow = (section: ProjectSection, index: number) => {
    const isSub = isSubsection(section);
    
    const rowContent = (
      <TableRow key={section.id} className={isSub ? "bg-muted/20" : ""}>
        <TableCell className="p-1 w-[60px]">
          <div className="flex items-center gap-1">
            {isSub && <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            {isReadOnly ? (
              <span className="text-xs">{section.sectionCode}</span>
            ) : (
              <Input
                value={section.sectionCode}
                onChange={(e) => updateRow(section.id, "sectionCode", e.target.value)}
                className="h-7 text-xs px-1 w-full"
              />
            )}
          </div>
        </TableCell>
        <TableCell className="p-1 w-[60px]">
          {isReadOnly ? (
            <span className="text-xs">{section.designation}</span>
          ) : (
            <Input
              value={section.designation}
              onChange={(e) => updateRow(section.id, "designation", e.target.value)}
              className="h-7 text-xs px-1"
            />
          )}
        </TableCell>
        <TableCell className="p-1 min-w-[200px]">
          {isReadOnly ? (
            <span className={`text-xs ${isSub ? "pl-2" : ""}`}>{section.sectionName}</span>
          ) : (
            <Input
              value={section.sectionName}
              onChange={(e) => updateRow(section.id, "sectionName", e.target.value)}
              className={`h-7 text-xs px-1 ${isSub ? "pl-2" : ""}`}
            />
          )}
        </TableCell>
        <TableCell className="p-1 w-[100px]">
          {isReadOnly ? (
            <span className="text-xs">{section.startDate}</span>
          ) : (
            <Input
              type="date"
              value={section.startDate}
              onChange={(e) => updateRow(section.id, "startDate", e.target.value)}
              className="h-7 text-xs px-1"
            />
          )}
        </TableCell>
        <TableCell className="p-1 w-[100px]">
          {isReadOnly ? (
            <span className="text-xs">{section.plannedEndDate}</span>
          ) : (
            <Input
              type="date"
              value={section.plannedEndDate}
              onChange={(e) => updateRow(section.id, "plannedEndDate", e.target.value)}
              className="h-7 text-xs px-1"
            />
          )}
        </TableCell>
        <TableCell className="p-1 w-[120px]">
          {renderExecutorCell(section)}
        </TableCell>
        <TableCell className="p-1 w-[110px]">
          {subcontractSectionSet.has(section.id) && (
            <Badge variant="secondary" className="text-[10px]">
              Субподряд
            </Badge>
          )}
        </TableCell>
        <TableCell className="p-1 w-[100px]">
          {isReadOnly ? (
            <span className="text-xs">{section.actualEndDate}</span>
          ) : (
            <Input
              type="date"
              value={section.actualEndDate}
              onChange={(e) => updateRow(section.id, "actualEndDate", e.target.value)}
              className="h-7 text-xs px-1"
            />
          )}
        </TableCell>
        <TableCell className="p-1 min-w-[100px]">
          {isReadOnly ? (
            <span className="text-xs">{section.notes}</span>
          ) : (
            <Input
              value={section.notes}
              onChange={(e) => updateRow(section.id, "notes", e.target.value)}
              className="h-7 text-xs px-1"
            />
          )}
        </TableCell>
        {!isReadOnly && (
          <TableCell className="p-1 w-[60px]">
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addSubsection(section.id, index)}
                className="h-6 w-6 p-0"
                title="Добавить подраздел"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteDialog(section)}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                title="Удалить"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    );

    if (isReadOnly) {
      return rowContent;
    }

    return (
      <ContextMenu key={section.id}>
        <ContextMenuTrigger asChild>
          {rowContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => addRow(undefined, index)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить раздел после
          </ContextMenuItem>
          <ContextMenuItem onClick={() => addSubsection(section.id, index)}>
            <ChevronRight className="h-4 w-4 mr-2" />
            Добавить подраздел
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => openDeleteDialog(section)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="h-[400px] rounded-md border border-border">
        <div className="min-w-[1000px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow className="bg-muted/50">
                <TableHead className="w-[60px] text-center font-semibold text-xs p-1">Раздел</TableHead>
                <TableHead className="w-[60px] text-center font-semibold text-xs p-1">Обозн.</TableHead>
                <TableHead className="min-w-[200px] font-semibold text-xs p-1">Наименование</TableHead>
                <TableHead className="w-[100px] text-center font-semibold text-xs p-1">Начало</TableHead>
                <TableHead className="w-[100px] text-center font-semibold text-xs p-1">План. срок</TableHead>
                <TableHead className="w-[120px] font-semibold text-xs p-1">Исполнитель</TableHead>
                <TableHead className="w-[110px] font-semibold text-xs p-1">Субподряд</TableHead>
                <TableHead className="w-[100px] text-center font-semibold text-xs p-1">Факт</TableHead>
                <TableHead className="min-w-[100px] font-semibold text-xs p-1">Примечание</TableHead>
                {!isReadOnly && <TableHead className="w-[60px] p-1"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedSections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isReadOnly ? 9 : 10} className="text-center text-muted-foreground py-8 text-sm">
                    Нет разделов. Нажмите «Добавить строку» или загрузите шаблон.
                  </TableCell>
                </TableRow>
              ) : (
                orderedSections.map((section, index) => renderTableRow(section, index))
              )}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {!isReadOnly && (
        <div className="pt-3 shrink-0">
          <Button variant="outline" size="sm" onClick={() => addRow()} className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить строку
          </Button>
        </div>
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Да</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



