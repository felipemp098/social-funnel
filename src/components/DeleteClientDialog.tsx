import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, AlertTriangle, Building } from 'lucide-react';
import { Client } from '@/hooks/useClients';

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export function DeleteClientDialog({ 
  open, 
  onOpenChange, 
  client, 
  onConfirm, 
  loading = false 
}: DeleteClientDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  if (!client) return null;

  const getTemperaturaColor = (temp: string | null) => {
    switch (temp) {
      case "quente": return "bg-red-500/20 text-red-400 border-red-400/30";
      case "morno": return "bg-orange-500/20 text-orange-400 border-orange-400/30";
      case "frio": return "bg-blue-500/20 text-blue-400 border-blue-400/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTemperaturaIcon = (temp: string | null) => {
    switch (temp) {
      case "quente": return "🔥";
      case "morno": return "🌡️";
      case "frio": return "❄️";
      default: return "🌡️";
    }
  };

  const hasLinkedSheet = client.sheet_status !== 'not_linked' && client.sheet_url;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir Cliente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-6 py-2">
              <p className="text-muted-foreground">
                Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
              </p>
              
              {/* Informações do Cliente */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground">{client.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {client.segment && (
                        <Badge variant="outline" className="text-xs">
                          {client.segment}
                        </Badge>
                      )}
                      {client.temperature && (
                        <Badge className={getTemperaturaColor(client.temperature)}>
                          <span className="mr-1">{getTemperaturaIcon(client.temperature)}</span>
                          {client.temperature === "quente" ? "Quente" : 
                           client.temperature === "morno" ? "Morno" : "Frio"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p><strong>Proprietário:</strong> {client.owner.name}</p>
                  {client.budget && <p><strong>Faturamento:</strong> {client.budget}</p>}
                  {hasLinkedSheet && (
                    <p className="text-orange-600 font-medium">
                      ⚠️ Este cliente possui planilha vinculada que também será desvinculada
                    </p>
                  )}
                </div>
              </div>

              {/* Avisos importantes */}
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive mb-1">Atenção:</p>
                    <ul className="text-destructive/80 space-y-1">
                      <li>• Todos os dados do cliente serão perdidos</li>
                      <li>• Histórico de audit será mantido</li>
                      {hasLinkedSheet && <li>• Planilha será desvinculada automaticamente</li>}
                      <li>• Esta ação não pode ser desfeita</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Cliente
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
