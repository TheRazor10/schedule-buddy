import { useState, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  ChevronDown,
  Plus,
  Trash2,
  Download,
  Upload,
  Check,
  FolderOpen,
} from 'lucide-react';

export default function FirmSelector() {
  const {
    firmSettings,
    firmsList,
    currentFirmId,
    isLoading,
    switchFirm,
    createFirm,
    deleteFirm,
    exportCurrentFirm,
    importFirm,
  } = useAppContext();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [firmToDelete, setFirmToDelete] = useState<{ id: string; name: string } | null>(null);
  const [newFirmName, setNewFirmName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFirm = async () => {
    if (newFirmName.trim()) {
      await createFirm(newFirmName.trim());
      setNewFirmName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleDeleteClick = (firm: { id: string; name: string }) => {
    setFirmToDelete(firm);
    setIsDeleteDialogOpen(true);
    setIsDropdownOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (firmToDelete) {
      await deleteFirm(firmToDelete.id);
      setFirmToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setIsDropdownOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importFirm(file);
      } catch (error) {
        console.error('Failed to import firm:', error);
        alert('Failed to import firm. Please check the file format.');
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportClick = () => {
    exportCurrentFirm();
    setIsDropdownOpen(false);
  };

  const handleSwitchFirm = async (firmId: string) => {
    await switchFirm(firmId);
    setIsDropdownOpen(false);
  };

  const currentFirmName = firmSettings.firmName || 'Нова фирма';

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 min-w-[200px] justify-between"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate max-w-[150px]">{currentFirmName}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Запазени фирми
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Firms list */}
          {firmsList.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Няма запазени фирми
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              {firmsList.map((firm) => (
                <DropdownMenuItem
                  key={firm.id}
                  className="flex items-center justify-between group cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    handleSwitchFirm(firm.id);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {firm.id === currentFirmId && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                    {firm.id !== currentFirmId && <div className="w-4" />}
                    <span className="truncate">{firm.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick({ id: firm.id, name: firm.name });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuItem>
              ))}
            </div>
          )}

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setIsCreateDialogOpen(true);
              setIsDropdownOpen(false);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Нова фирма
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" />
            Импортирай от файл
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={handleExportClick}>
            <Download className="mr-2 h-4 w-4" />
            Експортирай текущата
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Create firm dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Създай нова фирма</DialogTitle>
            <DialogDescription>
              Въведете име за новата фирма. Можете да го промените по-късно.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Име на фирмата"
              value={newFirmName}
              onChange={(e) => setNewFirmName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFirm();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Отказ
            </Button>
            <Button onClick={handleCreateFirm} disabled={!newFirmName.trim()}>
              Създай
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтрий фирма</AlertDialogTitle>
            <AlertDialogDescription>
              Сигурни ли сте, че искате да изтриете "{firmToDelete?.name}"?
              Това действие е необратимо и ще изтрие всички данни за тази фирма.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отказ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Изтрий
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
