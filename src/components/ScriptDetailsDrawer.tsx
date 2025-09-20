import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Copy, 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  Hash, 
  Eye, 
  EyeOff,
  Lock,
  Users,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { ScriptWithOwner } from '@/hooks/useScripts';
import type { ScriptVisibility } from '@/integrations/supabase/types';

interface ScriptDetailsDrawerProps {
  script: ScriptWithOwner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  loading?: boolean;
}

export function ScriptDetailsDrawer({ 
  script, 
  open, 
  onOpenChange, 
  onEdit, 
  onDelete,
  loading = false 
}: ScriptDetailsDrawerProps) {
  const { user } = useAuth();
  const { canManage } = usePermissions();

  if (!script) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(script.content);
    toast.success('Script copiado!', {
      description: `${script.title} foi copiado para a área de transferência.`,
    });
  };

  const getVisibilityInfo = (visibility: ScriptVisibility) => {
    switch (visibility) {
      case 'private':
        return {
          icon: Lock,
          label: 'Privado',
          description: 'Apenas você pode ver',
          color: 'bg-muted text-muted-foreground'
        };
      case 'public':
        return {
          icon: Globe,
          label: 'Público',
          description: 'Você e sua hierarquia podem ver',
          color: 'bg-success/20 text-success border-success/30'
        };
      default:
        return {
          icon: Lock,
          label: 'Privado',
          description: 'Apenas você pode ver',
          color: 'bg-muted text-muted-foreground'
        };
    }
  };

  const canEdit = canManage(script.owner_id);
  const canDelete = canManage(script.owner_id);
  const isOwner = user?.id === script.owner_id;

  const visibilityInfo = getVisibilityInfo(script.visibility);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl font-bold leading-tight">
                {script.title}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={visibilityInfo.color}>
                  <visibilityInfo.icon className="w-3 h-3 mr-1" />
                  {visibilityInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {visibilityInfo.description}
                </span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Informações do Criador */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/30">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {script.owner_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{script.owner_name}</span>
                <Badge variant="outline" className="text-xs">
                  {script.owner_role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Criado em {new Date(script.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Tags */}
          {script.tags && script.tags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Tags</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {script.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="bg-secondary/20 text-secondary border-secondary/30"
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Conteúdo do Script */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Conteúdo</span>
            </div>
            <div className="bg-background/50 rounded-lg p-4 border border-border/30">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {script.content || 'Nenhum conteúdo definido.'}
              </div>
            </div>
          </div>

          {/* Informações de Data */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Informações</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Criado em:</p>
                <p className="font-medium">
                  {new Date(script.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Atualizado em:</p>
                <p className="font-medium">
                  {new Date(script.updated_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Dicas de Uso */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <h4 className="font-medium text-sm mb-2 text-primary">💡 Dicas de Uso:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Substitua variáveis como {{nome}} e {{empresa}} pelos valores reais</li>
              <li>• Personalize o script para cada situação específica</li>
              <li>• Teste diferentes abordagens e meça os resultados</li>
              <li>• Mantenha o tom profissional e respeitoso</li>
            </ul>
          </div>
        </div>

        <SheetFooter className="flex gap-2 pt-6">
          <Button
            variant="outline"
            onClick={handleCopyScript}
            className="flex-1"
            disabled={loading}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar Script
          </Button>
          
          {canEdit && (
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex-1"
              disabled={loading}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
          
          {canDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={loading}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
