import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { AppUser, UserRole } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { getInitialsFromEmailOrName } from "@/utils/userUtils";
import { 
  Users, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Key,
  Mail,
  Eye,
  Filter,
  UserPlus,
  Crown,
  Shield,
  User,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw
} from "lucide-react";

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
  // Campos adicionais para funcionalidade
  creator?: AppUser;
  isPending?: boolean;
  inviteId?: string;
  expiresAt?: string;
  first_login?: boolean;
}

interface CreateUserForm {
  email: string;
  role: UserRole;
  credentialMethod: 'invite' | 'temp' | 'custom';
  customPassword?: string;
}

export default function UsuariosTab() {
  const { appUser, isAdmin, isManager } = useAuth();
  const [users, setUsers] = useState<UserWithCreator[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  // Estados para criação de usuário
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: "",
    role: "user",
    credentialMethod: 'invite'
  });

  // Estados para senha temporária
  const [tempPassword, setTempPassword] = useState<string>("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithCreator | null>(null);

  // Estados para exclusão
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithCreator | null>(null);

  // Estados para edição
  const [editingUser, setEditingUser] = useState<UserWithCreator | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editForm, setEditForm] = useState({
    role: 'user' as UserRole,
    newPassword: '',
    shouldResetPassword: false
  });

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
            created_at: invite.invited_at,
            updated_at: invite.invited_at,
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
      
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [appUser, isAdmin, isManager]);

  // Filtrar usuários
  useEffect(() => {
    let filtered = users;

    if (searchTerm.trim()) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-amber-400" />;
      case 'manager': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'user': return <User className="w-4 h-4 text-gray-400" />;
      default: return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return "bg-amber-500/20 text-amber-400 border-amber-400/30";
      case 'manager': return "bg-blue-500/20 text-blue-400 border-blue-400/30";
      case 'user': return "bg-gray-500/20 text-gray-400 border-gray-400/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-400/30";
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'manager': return 'Manager';
      case 'user': return 'User';
      default: return 'User';
    }
  };

  const getAvailableRoles = (): UserRole[] => {
    if (isAdmin) {
      return ['admin', 'manager', 'user'];
    } else if (isManager) {
      return ['user'];
    }
    return [];
  };

  const canEditUser = (user: UserWithCreator) => {
    if (!appUser) return false;
    if (isAdmin) return true;
    if (isManager && user.created_by === appUser.id) return true;
    return false;
  };

  const canDeleteUser = (user: UserWithCreator) => {
    if (!appUser) return false;
    if (user.id === appUser.id) return false;
    return isAdmin;
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateUser = async () => {
    if (!appUser || isCreatingUser) return;

    // Validações
    if (!createForm.email.trim()) {
      toast.error("E-mail é obrigatório");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createForm.email)) {
      toast.error("E-mail inválido");
      return;
    }

    if (isManager && createForm.role !== 'user') {
      toast.error("Manager pode criar apenas usuários com papel 'User'");
      return;
    }

    if (createForm.credentialMethod === 'custom' && !createForm.customPassword?.trim()) {
      toast.error("Senha personalizada é obrigatória quando selecionada");
      return;
    }

    if (createForm.credentialMethod === 'custom' && createForm.customPassword && createForm.customPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsCreatingUser(true);
    
    try {
      console.log('👤 Criando usuário com Service Role...');

      let password = "";
      let shouldSendInvite = false;

      if (createForm.credentialMethod === 'invite') {
        shouldSendInvite = true;
      } else if (createForm.credentialMethod === 'temp') {
        password = generateTempPassword();
      } else if (createForm.credentialMethod === 'custom') {
        password = createForm.customPassword!;
      }

      // Criar usuário usando Service Role
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: createForm.email.trim(),
        password: shouldSendInvite ? undefined : password,
        email_confirm: true, // SEMPRE confirmar email automaticamente
        user_metadata: {
          role: createForm.role,
          created_by: appUser.id
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error("Este e-mail já está cadastrado");
        } else {
          throw authError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário");
      }

      console.log('✅ Usuário criado no auth.users');

      // Criar registro em app_users
      const { error: appUserError } = await supabase
        .from('app_users')
        .insert({
          id: authData.user.id,
          email: createForm.email.trim(),
          role: createForm.role,
          created_by: appUser.id,
          first_login: shouldSendInvite // Se enviou convite, é primeiro login
        });

      if (appUserError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw appUserError;
      }

      console.log('✅ Registro criado em app_users');

      // Mostrar senha se necessário
      if (!shouldSendInvite) {
        setTempPassword(password);
        setShowTempPassword(true);
      }

      // Reset form
      setCreateForm({
        email: "",
        role: "user",
        credentialMethod: 'invite'
      });
      
      setIsCreateDialogOpen(false);
      await loadUsers();
      
      const successMessage = shouldSendInvite 
        ? "Usuário criado! Convite enviado por e-mail."
        : createForm.credentialMethod === 'temp'
        ? "Usuário criado! Senha temporária gerada."
        : "Usuário criado! Senha personalizada definida.";
      
      toast.success(successMessage);
      
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error("Erro ao criar usuário");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = (user: UserWithCreator) => {
    if (!appUser || !canDeleteUser(user)) return;
    
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete || !appUser || !canDeleteUser(userToDelete)) return;

    setDeletingUserId(userToDelete.id);
    console.log('🗑️ Excluindo usuário:', userToDelete.email);

    try {
      // Deletar de app_users
      const { error: appUserError } = await supabase
        .from('app_users')
        .delete()
        .eq('id', userToDelete.id);

      if (appUserError) {
        throw appUserError;
      }

      // Deletar do auth.users usando Service Role
      try {
        await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);
        console.log('✅ Usuário deletado do auth.users');
      } catch (authError) {
        console.warn('⚠️ Não foi possível deletar do auth.users:', authError);
      }

      await loadUsers();
      toast.success(`Usuário ${userToDelete.email} excluído com sucesso`);
      
    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error);
      toast.error("Erro ao excluir usuário");
    } finally {
      setDeletingUserId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  // Função para editar usuário
  const handleEditUser = async () => {
    if (!editingUser || isUpdatingUser) return;

    setIsUpdatingUser(true);
    try {
      console.log('✏️ Editando usuário:', editingUser.email);

      // Atualizar papel se mudou
      if (editForm.role !== editingUser.role) {
        const { error: roleError } = await supabase
          .from('app_users')
          .update({ 
            role: editForm.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);

        if (roleError) {
          throw roleError;
        }
        console.log('✅ Papel atualizado');
      }

      // Resetar senha se solicitado
      if (editForm.shouldResetPassword && editForm.newPassword.trim()) {
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          editingUser.id,
          { password: editForm.newPassword }
        );

        if (passwordError) {
          throw passwordError;
        }
        
        // Marcar como primeiro login se resetou senha
        await supabase
          .from('app_users')
          .update({ 
            first_login: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);

        console.log('✅ Senha resetada');
        
        // Mostrar nova senha
        setTempPassword(editForm.newPassword);
        setResetPasswordUser(editingUser);
        setShowTempPassword(true);
      }

      // Fechar modal e recarregar
      setIsEditDialogOpen(false);
      setEditingUser(null);
      await loadUsers();
      
      toast.success("Usuário atualizado com sucesso!");
      
    } catch (error) {
      console.error('❌ Erro ao editar usuário:', error);
      toast.error("Erro ao editar usuário");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Abrir modal de edição
  const openEditDialog = (user: UserWithCreator) => {
    setEditingUser(user);
    setEditForm({
      role: user.role,
      newPassword: '',
      shouldResetPassword: false
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
              <Crown className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-success flex items-center justify-center">
              <Shield className="w-5 h-5 text-success-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Managers</p>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === 'manager').length}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filtros e Ações */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            {/* Filtro por papel */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-32 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={loadUsers}
              className="hover:scale-105 transition-transform"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Usuário
                </Button>
              </DialogTrigger>
              
              <DialogContent className="glass-card border-border/50">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    Criar Novo Usuário
                  </DialogTitle>
                  <DialogDescription>
                    Adicione um novo usuário ao sistema.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="usuario@exemplo.com"
                      className="bg-background/50"
                    />
                  </div>

                  {/* Papel */}
                  <div className="space-y-2">
                    <Label htmlFor="role">Papel *</Label>
                    <Select 
                      value={createForm.role} 
                      onValueChange={(value: UserRole) => setCreateForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableRoles().map(role => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(role)}
                              {getRoleLabel(role)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Método de credenciais */}
                  <div className="space-y-3">
                    <Label>Método de Credenciais</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={createForm.credentialMethod === 'invite'}
                          onChange={() => setCreateForm(prev => ({ 
                            ...prev, 
                            credentialMethod: 'invite'
                          }))}
                          className="text-primary"
                        />
                        <span className="text-sm">Enviar convite por e-mail (recomendado)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={createForm.credentialMethod === 'temp'}
                          onChange={() => setCreateForm(prev => ({ 
                            ...prev, 
                            credentialMethod: 'temp'
                          }))}
                          className="text-primary"
                        />
                        <span className="text-sm">Gerar senha temporária</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={createForm.credentialMethod === 'custom'}
                          onChange={() => setCreateForm(prev => ({ 
                            ...prev, 
                            credentialMethod: 'custom'
                          }))}
                          className="text-primary"
                        />
                        <span className="text-sm">Definir senha personalizada</span>
                      </label>
                    </div>
                  </div>

                  {/* Campo de senha personalizada */}
                  {createForm.credentialMethod === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="customPassword">Senha Personalizada *</Label>
                      <Input
                        id="customPassword"
                        type="password"
                        value={createForm.customPassword || ""}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, customPassword: e.target.value }))}
                        placeholder="Digite a senha (mínimo 6 caracteres)"
                        className="bg-background/50"
                        minLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        A senha deve ter pelo menos 6 caracteres
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreatingUser}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateUser}
                      disabled={isCreatingUser}
                      className="bg-gradient-primary"
                    >
                      {isCreatingUser ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Criar Usuário
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </GlassCard>

      {/* Lista de Usuários */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Usuários ({filteredUsers.length})
        </h3>
        
        <div className="space-y-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <GlassCard key={user.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Info do usuário */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="" />
                      <AvatarFallback className={
                        user.isPending 
                          ? "bg-amber-500/20 text-amber-600" 
                          : "bg-gradient-primary text-primary-foreground"
                      }>
                        {user.isPending ? (
                          <Mail className="w-5 h-5" />
                        ) : (
                          getInitialsFromEmailOrName(user.full_name || user.email)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                          {user.full_name || user.email}
                        </p>
                        {user.full_name && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                        
                        {/* Badge de Status */}
                        {user.isPending ? (
                          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                            <Mail className="w-3 h-3 mr-1" />
                            Convite Pendente
                          </Badge>
                        ) : user.first_login ? (
                          <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                            <Key className="w-3 h-3 mr-1" />
                            Primeiro Acesso
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        )}
                        
                        {/* Badge de Papel */}
                        <Badge className={getRoleBadgeClass(user.role)}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1">{getRoleLabel(user.role)}</span>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{user.isPending ? 'Convidado' : 'Criado'} por: {user.creator?.email || 'Sistema'}</span>
                        <span>•</span>
                        <span>{new Date(user.user_created_at).toLocaleDateString('pt-BR')}</span>
                        {user.isPending && user.expiresAt && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600">
                              Expira: {new Date(user.expiresAt).toLocaleDateString('pt-BR')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {canEditUser(user) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {canDeleteUser(user) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deletingUserId === user.id}
                      >
                        {deletingUserId === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 
                  "Nenhum usuário corresponde aos filtros." :
                  "Nenhum usuário no sistema."
                }
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Dialog de Edição de Usuário */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Usuário
            </DialogTitle>
            <DialogDescription>
              Editar informações de {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Papel */}
            <div className="space-y-2">
              <Label htmlFor="editRole">Papel</Label>
              <Select 
                value={editForm.role} 
                onValueChange={(value: UserRole) => setEditForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map(role => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        {getRoleLabel(role)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opção de resetar senha */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.shouldResetPassword}
                  onChange={(e) => setEditForm(prev => ({ ...prev, shouldResetPassword: e.target.checked }))}
                  className="text-primary"
                />
                <Label>Resetar senha do usuário</Label>
              </div>

              {editForm.shouldResetPassword && (
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite a nova senha (mínimo 6 caracteres)"
                    className="bg-background/50"
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    O usuário será obrigado a redefinir esta senha no próximo login
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingUser(null);
                }}
                disabled={isUpdatingUser}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditUser}
                disabled={isUpdatingUser || (editForm.shouldResetPassword && editForm.newPassword.length < 6)}
                className="bg-gradient-primary"
              >
                {isUpdatingUser ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Senha Temporária */}
      <Dialog open={showTempPassword} onOpenChange={setShowTempPassword}>
        <DialogContent className="glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              {resetPasswordUser ? 'Senha Resetada' : 'Usuário Criado'}
            </DialogTitle>
            <DialogDescription>
              Senha gerada com sucesso
            </DialogDescription>
          </DialogHeader>

          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <AlertDescription className="text-amber-200">
              <strong>Importante:</strong> Esta senha será exibida apenas uma vez. 
              Copie e compartilhe com segurança.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="flex gap-2">
                <Input
                  value={tempPassword}
                  readOnly
                  className="bg-background/50 font-mono"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(tempPassword)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Compartilhe esta informação de forma segura</p>
              <p>• Esta janela não será exibida novamente</p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowTempPassword(false);
                  setTempPassword("");
                  setResetPasswordUser(null);
                }}
                className="bg-gradient-primary"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Entendido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão de Usuário */}
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={userToDelete}
        onConfirm={handleConfirmDeleteUser}
        loading={!!deletingUserId}
      />
    </div>
  );
}
