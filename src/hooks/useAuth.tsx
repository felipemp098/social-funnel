import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { AppUser, UserRole } from "@/integrations/supabase/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  appUser: AppUser | null;
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
  const [loading, setLoading] = useState(true);
  const [userRolesCache, setUserRolesCache] = useState<Record<string, UserRole>>({});

  // Função para buscar dados REAIS do banco com retry
  const fetchAppUser = async (userId: string): Promise<AppUser | null> => {
    console.log('🔍 fetchAppUser: Buscando dados REAIS para userId:', userId);
    
    const maxRetries = 3;
    const retryDelay = 1000; // 1 segundo entre tentativas
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa ${attempt}/${maxRetries} - Buscando com Service Role...`);
        
        // Usar Service Role com timeout curto
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const { data, error } = await supabaseAdmin
          .from('app_users')
          .select('*')
          .eq('id', userId)
          .abortSignal(controller.signal)
          .single();
        
        clearTimeout(timeoutId);

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('⚠️ Usuário não encontrado em app_users');
            return null;
          }
          throw error;
        }

        console.log(`✅ Dados REAIS encontrados na tentativa ${attempt}:`, data);
        return data;
        
      } catch (error: any) {
        console.warn(`❌ Tentativa ${attempt} falhou:`, error.message);
        
        if (attempt === maxRetries) {
          console.error('❌ Todas as tentativas falharam');
          return null;
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    return null;
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
      
      const userData = await fetchAppUser(user.id);
      console.log('📊 refreshAppUser - dados recebidos:', userData);
      setAppUser(userData);
    } else {
      console.log('⚠️ refreshAppUser - nenhum user.id disponível');
    }
  };

  useEffect(() => {
    console.log('🚀 useAuth: Iniciando useEffect');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', { event, userId: session?.user?.id });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 Usuário logado, buscando dados REAIS do app_users...');
          // Buscar dados REAIS do app_users
          const userData = await fetchAppUser(session.user.id);
          console.log('📊 Dados REAIS do app_users recebidos:', userData);
          setAppUser(userData);
        } else {
          console.log('❌ Nenhum usuário logado');
          setAppUser(null);
        }
        
        console.log('✅ Definindo loading como false');
        setLoading(false);
      }
    );

    // THEN check for existing session
    console.log('🔍 Verificando sessão existente...');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('📋 Sessão existente:', { userId: session?.user?.id });
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('👤 Sessão válida, buscando dados REAIS do app_users...');
        const userData = await fetchAppUser(session.user.id);
        console.log('📊 Dados REAIS iniciais do app_users:', userData);
        setAppUser(userData);
      }
      
      console.log('✅ Carregamento inicial concluído');
      setLoading(false);
    });

    return () => {
      console.log('🧹 Limpando subscription do auth');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setAppUser(null);
  };

  // Computar permissões baseadas no papel do usuário
  const isAdmin = appUser?.role === 'admin';
  const isManager = appUser?.role === 'manager';
  const isUser = appUser?.role === 'user';
  const canCreateUsers = isAdmin || isManager;

  const value = {
    user,
    session,
    appUser,
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