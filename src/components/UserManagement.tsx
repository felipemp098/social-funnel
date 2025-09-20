import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { AppUser, UserRole } from '@/integrations/supabase/types';
import { 
  Users, 
  Plus, 
  Crown, 
  Shield, 
  User, 
  Mail,
  Calendar,
  ChevronRight,
  UserPlus,
  Settings
} from 'lucide-react';

interface UserRowProps {
  user: AppUser;
  level?: number;
  onPromote: (userId: string, newRole: UserRole) => void;
  canPromote: boolean;
}

function UserRow({ user, level = 0, onPromote, canPromote }: UserRowProps) {
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'manager': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'user': return <User className="w-4 h-4 text-green-500" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'user': return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const getRoleName = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuário';
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-background/30 ${level > 0 ? 'ml-8' : ''}`}>
      {/* Hierarquia visual */}
      {level > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground">
          {Array.from({ length: level }).map((_, i) => (
            <ChevronRight key={i} className="w-3 h-3" />
          ))}
        </div>
      )}

      {/* Avatar */}
      <Avatar className="w-10 h-10">
        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
          {getInitials(user.email)}
        </AvatarFallback>
      </Avatar>

      {/* Info do usuário */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-foreground truncate">{user.email}</p>
          <Badge className={getRoleColor(user.role)}>
            {getRoleIcon(user.role)}
            <span className="ml-1">{getRoleName(user.role)}</span>
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(user.created_at).toLocaleDateString('pt-BR')}
          </div>
          {user.created_by && (
            <div className="text-xs">
              Criado por: {user.created_by.substring(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      {canPromote && user.role !== 'admin' && (
        <Select
          value={user.role}
          onValueChange={(newRole: UserRole) => onPromote(user.id, newRole)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="manager">Gerente</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

interface CreateUserDialogProps {
  onCreateUser: (email: string, role: UserRole) => Promise<boolean>;
  canCreateAdmin: boolean;
  canCreateManager: boolean;
}

function CreateUserDialog({ onCreateUser, canCreateAdmin, canCreateManager }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const success = await onCreateUser(email.trim(), role);
    
    if (success) {
      toast({
        title: 'Usuário criado!',
        description: `Convite enviado para ${email}`,
      });
      setOpen(false);
      setEmail('');
      setRole('user');
    } else {
      toast({
        title: 'Erro ao criar usuário',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary">
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar Usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Papel</Label>
            <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-green-500" />
                    Usuário
                  </div>
                </SelectItem>
                {canCreateManager && (
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      Gerente
                    </div>
                  </SelectItem>
                )}
                {canCreateAdmin && (
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      Administrador
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-gradient-primary"
            >
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const { appUser, isAdmin } = useAuth();
  const { 
    managedUsers, 
    hierarchyStats, 
    loading, 
    error, 
    promoteUser, 
    createUser, 
    canCreateUser,
    refreshManagedUsers 
  } = usePermissions();
  const { toast } = useToast();

  const handlePromoteUser = async (userId: string, newRole: UserRole) => {
    const success = await promoteUser(userId, newRole);
    if (success) {
      toast({
        title: 'Papel atualizado!',
        description: 'O papel do usuário foi alterado com sucesso.',
      });
    } else {
      toast({
        title: 'Erro ao atualizar papel',
        description: 'Verifique suas permissões e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUser = async (email: string, role: UserRole): Promise<boolean> => {
    return await createUser(email, role);
  };

  if (loading) {
    return (
      <GlassCard>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando usuários...</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={refreshManagedUsers} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      </GlassCard>
    );
  }

  const totalUsers = managedUsers.length;
  const adminCount = managedUsers.filter(u => u.role === 'admin').length;
  const managerCount = managedUsers.filter(u => u.role === 'manager').length;
  const userCount = managedUsers.filter(u => u.role === 'user').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie usuários e permissões do sistema
          </p>
        </div>
        
        {(isAdmin || canCreateUser('user')) && (
          <CreateUserDialog
            onCreateUser={handleCreateUser}
            canCreateAdmin={canCreateUser('admin')}
            canCreateManager={canCreateUser('manager')}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{adminCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gerentes</p>
              <p className="text-2xl font-bold">{managerCount}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuários</p>
              <p className="text-2xl font-bold">{userCount}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Lista de usuários */}
      <GlassCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-border/50">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Usuários do Sistema</h3>
          </div>

          {managedUsers.length > 0 ? (
            <div className="space-y-3">
              {managedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onPromote={handlePromoteUser}
                  canPromote={isAdmin}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
