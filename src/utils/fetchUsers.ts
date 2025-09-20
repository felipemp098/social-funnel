import { supabase } from '@/integrations/supabase/client';

export interface UserWithCreator {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  preferences?: any;
  display_name: string;
  effective_avatar?: string;
}

/**
 * Busca todos os usuários do sistema com informações do criador
 */
export async function fetchAllUsers(): Promise<UserWithCreator[]> {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select(`
        *,
        creator:created_by(id, email, role)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    throw error;
  }
}

/**
 * Busca usuários que o usuário atual pode gerenciar (com base nas permissões de hierarquia)
 */
export async function fetchManagedUsers(currentUserId: string): Promise<UserWithCreator[]> {
  try {
    // Primeiro, verificar se o usuário atual é admin
    const { data: currentUser, error: currentUserError } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', currentUserId)
      .single();

    if (currentUserError) {
      throw new Error(`Erro ao verificar usuário atual: ${currentUserError.message}`);
    }

    let query = supabase
      .from('app_users')
      .select(`
        *,
        creator:created_by(id, email, role)
      `)
      .order('created_at', { ascending: false });

    // Se não for admin, filtrar apenas usuários que pode gerenciar
    if (currentUser?.role !== 'admin') {
      // Buscar descendentes usando a função RPC
      const { data: descendants, error: descendantsError } = await supabase
        .rpc('get_user_descendants', { user_id: currentUserId });
      
      if (descendantsError) {
        console.warn('Erro ao buscar descendentes, usando filtro básico:', descendantsError);
        // Fallback: mostrar apenas usuários criados diretamente por este usuário
        query = query.eq('created_by', currentUserId);
      } else {
        const manageableIds = [currentUserId, ...(descendants?.map(d => d.id) || [])];
        query = query.in('id', manageableIds);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar usuários gerenciados:', error);
      throw new Error(`Erro ao buscar usuários gerenciados: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar usuários gerenciados:', error);
    throw error;
  }
}

/**
 * Busca perfis completos dos usuários (combinando app_users e profiles)
 */
export async function fetchUserProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('user_created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar perfis de usuários:', error);
      throw new Error(`Erro ao buscar perfis: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar perfis de usuários:', error);
    throw error;
  }
}

/**
 * Busca estatísticas dos usuários por papel
 */
export async function fetchUserStats() {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('role')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const stats = {
      total: data?.length || 0,
      admin: data?.filter(u => u.role === 'admin').length || 0,
      manager: data?.filter(u => u.role === 'manager').length || 0,
      user: data?.filter(u => u.role === 'user').length || 0
    };

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    throw error;
  }
}

/**
 * Busca um usuário específico por ID
 */
export async function fetchUserById(userId: string): Promise<UserWithCreator | null> {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select(`
        *,
        creator:created_by(id, email, role)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Usuário não encontrado
        return null;
      }
      console.error('Erro ao buscar usuário:', error);
      throw new Error(`Erro ao buscar usuário: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    throw error;
  }
}

/**
 * Busca usuários por email (busca parcial)
 */
export async function searchUsersByEmail(email: string): Promise<UserWithCreator[]> {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select(`
        *,
        creator:created_by(id, email, role)
      `)
      .ilike('email', `%${email}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários por email:', error);
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar usuários por email:', error);
    throw error;
  }
}



