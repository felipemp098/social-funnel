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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, AlertTriangle, User, Crown, Shield, Users } from 'lucide-react';
import { AppUser } from '@/integrations/supabase/types';
import { getInitialsFromEmailOrName } from '@/utils/userUtils';

interface UserWithCreator {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  created_by: string | null;
  user_created_at: string;
  user_updated_at: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferences: any;
  profile_created_at: string | null;
  profile_updated_at: string | null;
  display_name: string | null;
  effective_avatar: string | null;
  first_login?: boolean;
  // Campos adicionais
  creator?: AppUser;
  isPending?: boolean;
  inviteId?: string;
  expiresAt?: string;
}

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithCreator | null;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export function DeleteUserDialog({ 
  open, 
  onOpenChange, 
  user, 
  onConfirm, 
  loading = false 
}: DeleteUserDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  if (!user) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'manager': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'user': return <User className="w-4 h-4 text-green-500" />;
      default: return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuário';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'manager': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'user': return 'bg-green-500/10 text-green-600 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const getCreatorDisplayName = () => {
    if (!user.creator) return 'Sistema';
    // Se o criador tem profile com full_name, usar isso, senão usar email
    return user.creator.email; // Por enquanto usar email, pode ser melhorado depois
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const isCurrentUser = user.id === user.id; // Se for o próprio usuário logado

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Excluir Usuário
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-6 py-2">
              <p className="text-muted-foreground">
                Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
              </p>
              
              {/* Informações do Usuário */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                      {getInitialsFromEmailOrName(user.full_name || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {user.full_name || user.email}
                    </h4>
                    {user.full_name && (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{getRoleLabel(user.role)}</span>
                      </Badge>
                      {user.first_login && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-600/30">
                          Primeiro acesso
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Criado em:</strong> {formatDate(user.user_created_at)}</p>
                  <p><strong>Criado por:</strong> {getCreatorDisplayName()}</p>
                </div>
              </div>

              {/* Avisos importantes */}
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive mb-1">Consequências:</p>
                    <ul className="text-destructive/80 space-y-1">
                      <li>• Usuário será removido do sistema</li>
                      <li>• Acesso será revogado imediatamente</li>
                      <li>• Dados pessoais serão excluídos</li>
                      <li>• Clientes e recursos criados serão mantidos</li>
                      <li>• Histórico de audit será preservado</li>
                      {isCurrentUser && (
                        <li className="text-red-600 font-medium">⚠️ Você está excluindo sua própria conta!</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {user.role === 'admin' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Crown className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-700 mb-1">Atenção - Administrador:</p>
                      <p className="text-yellow-700/80">
                        Este usuário tem privilégios de administrador. Certifique-se de que há outros admins no sistema.
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                  Excluir Usuário
                </>
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
