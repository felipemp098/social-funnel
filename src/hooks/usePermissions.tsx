import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AppUser, UserHierarchyStats } from '@/integrations/supabase/types';

interface PermissionsHook {
  // Funções de verificação de permissão
  canManage: (ownerId: string) => Promise<boolean>;
  canCreateUser: (role: 'admin' | 'manager' | 'user') => boolean;
  
  // Dados de hierarquia
  managedUsers: AppUser[];
  hierarchyStats: UserHierarchyStats[];
  
  // Estados
  loading: boolean;
  error: string | null;
  
  // Funções de ação
  refreshManagedUsers: () => Promise<void>;
  promoteUser: (userId: string, newRole: 'admin' | 'manager' | 'user') => Promise<boolean>;
  createUser: (email: string, role: 'admin' | 'manager' | 'user') => Promise<boolean>;
}

export const usePermissions = (): PermissionsHook => {
  const { user, appUser, isAdmin, isManager } = useAuth();
  const [managedUsers, setManagedUsers] = useState<AppUser[]>([]);
  const [hierarchyStats, setHierarchyStats] = useState<UserHierarchyStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para verificar se pode gerenciar um recurso
  const canManage = async (ownerId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    try {
      const { data, error } = await supabase
        .rpc('can_manage', {
          actor: user.id,
          owner: ownerId
        });

      if (error) {
        console.error('Erro ao verificar permissões:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  };

  // Função para verificar se pode criar usuário com determinado papel
  const canCreateUser = (role: 'admin' | 'manager' | 'user'): boolean => {
    if (isAdmin) return true; // Admin pode criar qualquer papel
    if (isManager && role === 'user') return true; // Manager pode criar apenas user
    return false;
  };

  // Função para buscar usuários gerenciados
  const fetchManagedUsers = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setManagedUsers(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao buscar usuários gerenciados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar estatísticas da hierarquia
  const fetchHierarchyStats = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_hierarchy_stats')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;

      setHierarchyStats(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar estatísticas da hierarquia:', err);
    }
  };

  // Função para atualizar dados
  const refreshManagedUsers = async () => {
    await Promise.all([
      fetchManagedUsers(),
      fetchHierarchyStats()
    ]);
  };

  // Função para promover usuário
  const promoteUser = async (userId: string, newRole: 'admin' | 'manager' | 'user'): Promise<boolean> => {
    if (!isAdmin) {
      setError('Apenas administradores podem alterar papéis');
      return false;
    }

    try {
      const { error } = await supabase
        .from('app_users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Atualizar lista local
      await refreshManagedUsers();
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao promover usuário:', err);
      return false;
    }
  };

  // Função para criar usuário
  const createUser = async (email: string, role: 'admin' | 'manager' | 'user'): Promise<boolean> => {
    if (!canCreateUser(role)) {
      setError('Você não tem permissão para criar usuários com este papel');
      return false;
    }

    if (!user?.id) {
      setError('Usuário não autenticado');
      return false;
    }

    try {
      // Primeiro, convidar o usuário via auth
      const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (authError) throw authError;

      if (!authData.user?.id) {
        throw new Error('Falha ao criar usuário no sistema de autenticação');
      }

      // Depois, criar entrada em app_users
      const { error: appUserError } = await supabase
        .from('app_users')
        .insert({
          id: authData.user.id,
          email: email,
          role: role,
          created_by: user.id
        });

      if (appUserError) throw appUserError;

      // Atualizar lista local
      await refreshManagedUsers();
      return true;
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao criar usuário:', err);
      return false;
    }
  };

  // Carregar dados quando o usuário muda
  useEffect(() => {
    if (user?.id && appUser) {
      refreshManagedUsers();
    }
  }, [user?.id, appUser?.role]);

  return {
    canManage,
    canCreateUser,
    managedUsers,
    hierarchyStats,
    loading,
    error,
    refreshManagedUsers,
    promoteUser,
    createUser,
  };
};
