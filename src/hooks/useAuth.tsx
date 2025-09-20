import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { AppUser, UserRole, UserProfile } from "@/integrations/supabase/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  appUser: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAppUser: () => Promise<void>;
  // Funções de conveniência para verificar permissões
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
  canCreateUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error("❌ useAuth chamado fora do AuthProvider");
    console.trace("Stack trace do erro:");
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRolesCache, setUserRolesCache] = useState<Record<string, UserRole>>({});
  const [appUserCache, setAppUserCache] = useState<Record<string, AppUser | null>>({});
  const [userProfileCache, setUserProfileCache] = useState<Record<string, UserProfile | null>>({});
  const [fetchingUsers, setFetchingUsers] = useState<Set<string>>(new Set());

  // Função para buscar perfil do usuário
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    console.log('🔍 fetchUserProfile: Buscando perfil para userId:', userId);
    
    // Verificar cache primeiro
    if (userProfileCache[userId] !== undefined) {
      console.log('💾 Perfil encontrado no cache:', userProfileCache[userId]);
      return userProfileCache[userId];
    }
    
    try {
      console.log(`📡 Executando query OTIMIZADA de perfil para userId: ${userId}`);
      const { data, error } = await supabaseAdmin
        .rpc('get_current_user_profile', { user_id: userId })
        .maybeSingle();
      
      console.log(`📊 Query de perfil concluída - data:`, data, 'error:', error);

      if (error) {
        console.log(`❌ Erro na query de perfil:`, error);
        setUserProfileCache(prev => ({ ...prev, [userId]: null }));
        return null;
      }

      if (!data) {
        console.log('⚠️ Perfil não encontrado');
        setUserProfileCache(prev => ({ ...prev, [userId]: null }));
        return null;
      }

      console.log(`✅ Perfil encontrado:`, data);
      // Salvar no cache
      setUserProfileCache(prev => ({ ...prev, [userId]: data }));
      return data;
      
    } catch (error: any) {
      console.warn(`❌ Erro ao buscar perfil:`, error.message, error.code);
      setUserProfileCache(prev => ({ ...prev, [userId]: null }));
      return null;
    }
  };

  // Função para buscar dados REAIS do banco com retry
  const fetchAppUser = async (userId: string): Promise<AppUser | null> => {
    console.log('🔍 fetchAppUser: Buscando dados REAIS para userId:', userId);
    
    // Verificar cache primeiro
    if (appUserCache[userId] !== undefined) {
      console.log('💾 Dados encontrados no cache:', appUserCache[userId]);
      return appUserCache[userId];
    }
    
    // Evitar múltiplas chamadas simultâneas para o mesmo usuário
    if (fetchingUsers.has(userId)) {
      console.log('⏳ Já está buscando dados para este usuário, aguardando...');
      // Aguardar até que a busca termine
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (appUserCache[userId] !== undefined) {
            clearInterval(checkInterval);
            console.log('💾 Resultado da busca em andamento encontrado no cache:', appUserCache[userId]);
            resolve(appUserCache[userId]);
          }
        }, 100);
        
        // Timeout de segurança reduzido
        setTimeout(() => {
          clearInterval(checkInterval);
          console.log('⏰ Timeout aguardando busca em andamento');
          resolve(null);
        }, 3000);
      });
    }
    
    // Marcar como em busca
    setFetchingUsers(prev => new Set(prev).add(userId));
    
    // Timeout global otimizado
    const globalTimeout = new Promise<null>((_, reject) => {
      setTimeout(() => {
        console.log('🚨 TIMEOUT GLOBAL: fetchAppUser travou por mais de 8 segundos');
        reject(new Error('Timeout global'));
      }, 8000); // Reduzido para 8 segundos
    });
    
    const fetchPromise = (async () => {
      const maxRetries = 1; // Reduzido para 1 tentativa para evitar loops
      const retryDelay = 300; // Reduzido para 300ms entre tentativas
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Tentativa ${attempt}/${maxRetries} - Buscando com Service Role...`);
          
          // Usar Service Role com timeout otimizado
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log(`⏰ Timeout na tentativa ${attempt}`);
            controller.abort();
          }, 3000); // Reduzido para 3 segundos
          
          console.log(`📡 Executando query SUPER OTIMIZADA para userId: ${userId}`);
          // Usar função SQL otimizada que bypassa RLS
          const { data, error } = await supabaseAdmin
            .rpc('get_current_user_data', { user_id: userId })
            .abortSignal(controller.signal)
            .maybeSingle();
          
          clearTimeout(timeoutId);
          console.log(`📊 Query concluída - data:`, data, 'error:', error);

          if (error) {
            console.log(`❌ Erro na query (tentativa ${attempt}):`, error);
            throw error;
          }

          // Se não encontrou dados (maybeSingle retorna null sem erro)
          if (!data) {
            console.log('⚠️ Usuário não encontrado em app_users');
            setAppUserCache(prev => ({ ...prev, [userId]: null }));
            return null;
          }

          console.log(`✅ Dados REAIS encontrados na tentativa ${attempt}:`, data);
          // Salvar no cache
          setAppUserCache(prev => ({ ...prev, [userId]: data }));
          return data;
          
        } catch (error: any) {
          console.warn(`❌ Tentativa ${attempt} falhou:`, error.message, error.code);
          
          // Se erro de autenticação, não tentar novamente
          if (error.message?.includes('JWT') || error.message?.includes('expired') || error.message?.includes('Unauthorized')) {
            console.log('🔐 Erro de autenticação, parando tentativas');
            setAppUserCache(prev => ({ ...prev, [userId]: null }));
            throw error; // Propagar o erro para ser tratado no nível superior
          }
          
          if (attempt === maxRetries) {
            console.error('❌ Todas as tentativas falharam');
            // Salvar null no cache para evitar novas tentativas
            setAppUserCache(prev => ({ ...prev, [userId]: null }));
            return null;
          }
            
          // Aguardar antes da próxima tentativa
          console.log(`⏳ Aguardando ${retryDelay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      console.log('🏁 fetchAppUser: Retornando null após todas as tentativas');
      return null;
    })();
    
    try {
      // Race entre fetch e timeout global
      const result = await Promise.race([fetchPromise, globalTimeout]);
      return result;
    } finally {
      // Sempre remover da lista de busca
      setFetchingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Função para atualizar dados do app_user
  const refreshAppUser = async () => {
    console.log('🔄 refreshAppUser chamado para userId:', user?.id);
    if (user?.id) {
      // Evitar múltiplas chamadas simultâneas
      if (loading) {
        console.log('⚠️ refreshAppUser cancelado - ainda carregando');
        return;
      }
      
      // Verificar se sessão está válida antes de buscar dados
      if (session) {
        const isExpired = new Date(session.expires_at! * 1000) < new Date();
        if (isExpired) {
          console.log('⚠️ refreshAppUser cancelado - sessão expirada');
          await supabase.auth.signOut();
          return;
        }
      }
      
      try {
        const [userData, profileData] = await Promise.all([
          fetchAppUser(user.id),
          fetchUserProfile(user.id)
        ]);
        
        console.log('📊 refreshAppUser - dados recebidos:', { userData, profileData });
        setAppUser(userData);
        setUserProfile(profileData);
      } catch (error: any) {
        console.error('❌ Erro em refreshAppUser:', error);
        // Se erro de autenticação, fazer logout
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          console.log('🔐 Erro de autenticação em refreshAppUser, fazendo logout...');
          await supabase.auth.signOut();
        }
      }
    } else {
      console.log('⚠️ refreshAppUser - nenhum user.id disponível');
    }
  };

  useEffect(() => {
    console.log('🚀 useAuth: Iniciando useEffect');
    let isInitialized = false;
    
    // Função centralizada para processar sessão
    const processSession = async (session: any, isInitial = false) => {
      if (!session?.user) {
        console.log('❌ Nenhum usuário logado');
        setAppUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Verificar se a sessão está expirada
      const isExpired = new Date(session.expires_at! * 1000) < new Date();
      if (isExpired) {
        console.log('⚠️ Sessão expirada detectada, fazendo logout...');
        await supabase.auth.signOut();
        return;
      }

      console.log('👤 Usuário logado, buscando dados REAIS do app_users e perfil...');
      try {
        // Buscar dados REAIS do app_users e perfil em paralelo
        const [userData, profileData] = await Promise.all([
          fetchAppUser(session.user.id),
          fetchUserProfile(session.user.id)
        ]);
        console.log('📊 Dados REAIS recebidos:', { userData, profileData });
        setAppUser(userData);
        setUserProfile(profileData);
      } catch (error) {
        console.error('❌ Erro ao buscar dados do usuário:', error);
        // Se erro de autenticação, fazer logout
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          console.log('🔐 Erro de autenticação detectado, fazendo logout...');
          await supabase.auth.signOut();
          return;
        }
        setAppUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', { event, userId: session?.user?.id, isExpired: session && new Date(session.expires_at! * 1000) < new Date() });
        
        // Limpar caches quando sessão muda/expira
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || !session) {
          console.log('🧹 Limpando caches devido a:', event);
          setAppUserCache({});
          setUserProfileCache({});
          setFetchingUsers(new Set());
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Processar sessão apenas se não for inicial (para evitar duplicação)
        if (!isInitialized) {
          await processSession(session);
        }
      }
    );

    // Check for existing session (apenas uma vez)
    console.log('🔍 Verificando sessão existente...');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('📋 Sessão existente:', { userId: session?.user?.id });
      isInitialized = true;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      await processSession(session, true);
      console.log('✅ Carregamento inicial concluído');
    }).catch(error => {
      console.error('❌ Erro ao obter sessão:', error);
      setLoading(false);
      isInitialized = true;
    });

    return () => {
      console.log('🧹 Limpando subscription do auth');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Limpar caches ao fazer logout
    setAppUserCache({});
    setUserProfileCache({});
    setFetchingUsers(new Set());
    
    await supabase.auth.signOut();
    setAppUser(null);
    setUserProfile(null);
  };

  // Adicionar listener para detectar quando usuário volta à aba
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && session) {
        // Usuário voltou à aba, verificar se sessão ainda é válida
        const isExpired = new Date(session.expires_at! * 1000) < new Date();
        if (isExpired) {
          console.log('⚠️ Sessão expirada detectada ao voltar à aba, fazendo logout...');
          await supabase.auth.signOut();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session]);

  // Computar permissões baseadas no papel do usuário
  const isAdmin = appUser?.role === 'admin';
  const isManager = appUser?.role === 'manager';
  const isUser = appUser?.role === 'user';
  const canCreateUsers = isAdmin || isManager;

  const value = {
    user,
    session,
    appUser,
    userProfile,
    loading,
    signOut,
    refreshAppUser,
    isAdmin,
    isManager,
    isUser,
    canCreateUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};