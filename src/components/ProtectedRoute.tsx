import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, appUser, loading, refreshAppUser } = useAuth();
  const navigate = useNavigate();
  const [hasInitialized, setHasInitialized] = useState(false);

  // Hook simplificado: apenas verificar estados básicos
  useEffect(() => {
    // Se ainda está carregando inicial, aguardar
    if (loading) {
      return;
    }

    // Se não tem usuário, redirecionar para auth
    if (!user) {
      console.log('🔄 Redirecionando para /auth - usuário não logado');
      navigate("/auth");
      return;
    }

    // Se tem usuário e appUser, marcar como inicializado
    if (user && appUser) {
      console.log('✅ ProtectedRoute inicializado para:', appUser.email);
      setHasInitialized(true);
      return;
    }

    // Se tem usuário mas não tem appUser, e ainda não inicializou
    if (user && !appUser && !hasInitialized) {
      console.log('⚠️ Usuário sem appUser detectado');
      
      // Aguardar um tempo menor antes de assumir que é primeiro acesso
      const timer = setTimeout(() => {
        if (!appUser) {
          console.log('🔄 AppUser não carregado após aguardar - redirecionando para first-setup');
          navigate("/first-setup");
        }
      }, 5000); // Reduzido para 5 segundos

      return () => clearTimeout(timer);
    }
  }, [user, appUser, loading, navigate, hasInitialized]);

  // Hook para verificar first_login e proteção de rotas
  useEffect(() => {
    if (user && appUser && hasInitialized) {
      // Verificar se usuário precisa definir senha (primeiro acesso)
      if (appUser.first_login) {
        console.log('🔐 Primeiro acesso detectado, redirecionando para definir senha...');
        navigate("/set-password");
        return;
      }

      // Proteger rotas baseado na hierarquia de usuários
      const currentPath = window.location.pathname;
      if (currentPath === "/usuarios" && appUser.role === 'user') {
        console.log('🚫 Usuário do tipo "user" tentou acessar /usuarios, redirecionando...');
        navigate("/");
        return;
      }
    }
  }, [user, appUser, hasInitialized, navigate]);

  // Estados de loading - APENAS durante carregamento inicial
  if (loading && !hasInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não tem usuário, não mostrar nada
  if (!user) {
    return null;
  }

  // Se tem usuário e appUser, mostrar conteúdo
  if (user && appUser) {
    console.log('✅ ProtectedRoute: Mostrando conteúdo para:', appUser.email);
    return <>{children}</>;
  }

  // Caso padrão: não mostrar nada
  return null;
};