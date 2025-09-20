import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ScriptWithOwner } from '@/hooks/useScripts';

interface DeleteScriptDialogProps {
  script: ScriptWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteScriptDialog({ 
  script, 
  open, 
  onOpenChange, 
  onConfirm,
  loading = false 
}: DeleteScriptDialogProps) {
  if (!script) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o script <strong>"{script.title}"</strong>?
          </p>
          
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Este script será permanentemente removido:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Título: {script.title}</li>
              <li>• Tags: {script.tags?.length || 0} tag(s)</li>
              <li>• Visibilidade: {script.visibility}</li>
              <li>• Criado em: {new Date(script.created_at).toLocaleDateString('pt-BR')}</li>
            </ul>
          </div>

          <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
            <p className="text-xs text-destructive font-medium">
              ⚠️ Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? (
              'Excluindo...'
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Script
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
