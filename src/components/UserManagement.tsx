import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { AppUser, UserRole } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { DeleteUserDialog } from '@/components/DeleteUserDialog';
import { getDisplayName, getDisplayInitials } from '@/utils/userUtils';

// Interface estendida para incluir dados do criador e perfil
interface UserWithCreator {
  id: string;
  email: string;
  role: UserRole;
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
  display_name: string;
  effective_avatar: string | null;
  creator: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
  isPending?: boolean;
  isActive: boolean;
  inviteId?: string;
  expiresAt?: string;
  first_login?: boolean;
}
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
  Settings,
  Edit,
  Trash2,
  Search,
  MoreHorizontal
} from 'lucide-react';

interface UserRowProps {
  user: UserWithCreator;
  level?: number;
  onPromote: (userId: string, newRole: UserRole) => void;
  canPromote: boolean;
  onEdit: (user: UserWithCreator) => void;
  onDelete: (user: UserWithCreator) => void;
  canEdit: boolean;
  canDelete: boolean;
}

function UserRow({ user, level = 0, onPromote, canPromote, onEdit, onDelete, canEdit, canDelete }: UserRowProps) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
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
      <Avatar className="w-12 h-12">
        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
          {getDisplayInitials(user.full_name, user.email)}
        </AvatarFallback>
      </Avatar>

      {/* Info do usuário */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div>
            <p className="font-medium text-foreground truncate">
              {getDisplayName(user.full_name, user.email)}
            </p>
            {user.full_name && (
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            )}
          </div>
          <Badge className={getRoleColor(user.role)}>
            {getRoleIcon(user.role)}
            <span className="ml-1">{getRoleName(user.role)}</span>
          </Badge>
          {user.isPending && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
              Pendente
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{user.isPending ? 'Convidado' : 'Criado'} em: {formatDate(user.user_created_at)}</span>
          </div>
          {user.creator && (
            <div className="text-xs">
              {user.isPending ? 'Convidado' : 'Criado'} por: {user.creator.email}
            </div>
          )}
          {!user.creator && user.created_by && (
            <div className="text-xs">
              {user.isPending ? 'Convidado' : 'Criado'} por: Sistema
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {canPromote && user.role !== 'admin' && !user.isPending && (
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
        
        {(canEdit || canDelete) && !user.isPending && (
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(user)}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(user)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
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
          <DialogDescription>
            Preencha os dados para criar um novo usuário no sistema.
          </DialogDescription>
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
    loading: permissionsLoading, 
    error: permissionsError, 
    promoteUser, 
    createUser, 
    canCreateUser,
    refreshManagedUsers 
  } = usePermissions();
  const { toast } = useToast();
  
  // Estados locais para gerenciar usuários completos
  const [users, setUsers] = useState<UserWithCreator[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithCreator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithCreator | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithCreator | null>(null);

  // Carregar usuários
  const loadUsers = async () => {
    console.log('🔄 Carregando usuários...');
    setIsLoading(true);
    try {
      // Carregar usuários confirmados com dados do criador
      const { data: confirmedUsers, error: usersError } = await supabase
        .from('app_users')
        .select(`
          *,
          creator:created_by(id, email, role)
        `)
        .order('created_at', { ascending: false });

      // Carregar perfis separadamente
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone, avatar_url, bio, preferences');

      // Combinar dados de usuários com perfis
      const usersWithProfiles = confirmedUsers?.map(user => {
        const profile = profiles?.find(p => p.id === user.id);
        return {
          ...user,
          full_name: profile?.full_name || null,
          phone: profile?.phone || null,
          avatar_url: profile?.avatar_url || null,
          bio: profile?.bio || null,
          preferences: profile?.preferences || null,
          display_name: profile?.full_name || user.email,
          user_created_at: user.created_at,
          user_updated_at: user.updated_at,
        };
      }) || [];

      if (usersError) {
        console.error('❌ Erro ao carregar usuários:', usersError);
        throw usersError;
      }
      
      // Carregar convites pendentes
      let pendingInvites: any[] = [];
      try {
        const { data: invites, error: invitesError } = await supabase
          .from('pending_invites')
          .select(`
            *,
            inviter:invited_by(id, email, role)
          `)
          .eq('accepted', false)
          .gt('expires_at', new Date().toISOString())
          .order('invited_at', { ascending: false });

        if (!invitesError && invites) {
          pendingInvites = invites.map(invite => ({
            id: `pending-${invite.id}`,
            email: invite.email,
            role: invite.role,
            created_by: invite.invited_by,
            user_created_at: invite.invited_at,
            user_updated_at: invite.invited_at,
            full_name: null,
            phone: null,
            avatar_url: null,
            bio: null,
            preferences: null,
            profile_created_at: null,
            profile_updated_at: null,
            display_name: invite.email,
            effective_avatar: null,
            creator: invite.inviter,
            isPending: true,
            isActive: false,
            inviteId: invite.id,
            expiresAt: invite.expires_at
          }));
        }
      } catch (inviteError) {
        console.warn('⚠️ Erro ao carregar convites pendentes:', inviteError);
      }
      
      // Combinar usuários confirmados e pendentes
      const allUsers = [
        ...usersWithProfiles.map(user => ({ ...user, isActive: true })),
        ...pendingInvites
      ];
      
      console.log('✅ Usuários ativos:', confirmedUsers?.length || 0);
      console.log('✅ Convites pendentes:', pendingInvites.length);
      console.log('📋 Total:', allUsers.length);
      
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      setError(null);
    } catch (error: any) {
      console.error('❌ Erro ao carregar usuários:', error);
      setError(error.message || 'Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar usuários
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  // Carregar usuários na inicialização
  useEffect(() => {
    loadUsers();
  }, []);

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
    const success = await createUser(email, role);
    if (success) {
      loadUsers(); // Recarregar lista
    }
    return success;
  };

  const handleEditUser = (user: UserWithCreator) => {
    setEditingUser(user);
  };

  const handleDeleteUser = (user: UserWithCreator) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async (userId: string) => {
    try {
      console.log('🗑️ Excluindo usuário:', userId);

      // Se for convite pendente, excluir da tabela pending_invites
      if (userId.startsWith('pending-')) {
        const inviteId = userId.replace('pending-', '');
        const { error } = await supabase
          .from('pending_invites')
          .delete()
          .eq('id', inviteId);

        if (error) throw error;
      } else {
        // Se for usuário confirmado, excluir da tabela app_users
        const { error } = await supabase
          .from('app_users')
          .delete()
          .eq('id', userId);

        if (error) throw error;
      }

      toast({
        title: 'Usuário excluído!',
        description: 'O usuário foi removido do sistema com sucesso.',
      });

      loadUsers(); // Recarregar lista
      setDeletingUser(null);
    } catch (error: any) {
      console.error('❌ Erro ao excluir usuário:', error);
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message || 'Ocorreu um erro ao tentar excluir o usuário.',
        variant: 'destructive',
      });
    }
  };

  const canEditUser = (user: UserWithCreator) => {
    if (!appUser) return false;
    if (appUser.role === 'admin') return true;
    if (appUser.role === 'manager' && user.created_by === appUser.id) return true;
    return user.id === appUser.id; // Pode editar próprio perfil
  };

  const canDeleteUser = (user: UserWithCreator) => {
    if (!appUser) return false;
    if (user.id === appUser.id) return false; // Não pode excluir a si mesmo
    if (appUser.role === 'admin') return true;
    if (appUser.role === 'manager' && user.created_by === appUser.id) return true;
    return false;
  };

  if (isLoading) {
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
          <Button onClick={loadUsers} variant="outline">
            Tentar Novamente
          </Button>
        </div>
      </GlassCard>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.isPending);
  const pendingUsers = users.filter(u => u.isPending);
  const adminCount = activeUsers.filter(u => u.role === 'admin').length;
  const managerCount = activeUsers.filter(u => u.role === 'manager').length;
  const userCount = activeUsers.filter(u => u.role === 'user').length;

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{pendingUsers.length}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Lista de usuários */}
      <GlassCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Usuários do Sistema</h3>
            </div>
            
            {/* Busca */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onPromote={handlePromoteUser}
                  canPromote={isAdmin}
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                  canEdit={canEditUser(user)}
                  canDelete={canDeleteUser(user)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum usuário encontrado com esse termo' : 'Nenhum usuário encontrado'}
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Modal de exclusão */}
      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          onConfirm={() => handleConfirmDelete(deletingUser.id)}
        />
      )}
    </div>
  );
}
