import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, appUser, loading, refreshAppUser } = useAuth();
  const navigate = useNavigate();
  const [waitingForAppUser, setWaitingForAppUser] = useState(false);
  const [hasTriedRefresh, setHasTriedRefresh] = useState(false);

  // Hook 1: Redirecionar para auth se não estiver logado
  useEffect(() => {
    if (!loading && !user) {
      console.log('🔄 Redirecionando para /auth - usuário não logado');
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Hook 2: Tentar buscar appUser UMA VEZ se não existir
  useEffect(() => {
    console.log('🔍 ProtectedRoute Hook 2 - Estados:', { 
      user: !!user, 
      appUser: !!appUser, 
      loading, 
      waitingForAppUser, 
      hasTriedRefresh 
    });
    
    if (user && !appUser && !loading && !waitingForAppUser && !hasTriedRefresh) {
      console.log('👤 Usuário logado sem appUser, tentando buscar...');
      setWaitingForAppUser(true);
      setHasTriedRefresh(true);
      
      const timer = setTimeout(async () => {
        console.log('🔄 Tentando buscar appUser...');
        await refreshAppUser();
        console.log('✅ refreshAppUser concluído');
        setWaitingForAppUser(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, appUser, loading, waitingForAppUser, hasTriedRefresh, refreshAppUser]);

  // Hook 3: Redirecionar para FirstSetup se appUser não foi encontrado
  useEffect(() => {
    console.log('🔍 ProtectedRoute Hook 3 - Estados:', { 
      user: !!user, 
      appUser: !!appUser, 
      loading, 
      waitingForAppUser, 
      hasTriedRefresh 
    });
    
    if (user && !appUser && !loading && !waitingForAppUser && hasTriedRefresh) {
      console.log('⚠️ Usuário sem appUser após tentativa, redirecionando para FirstSetup...');
      navigate("/first-setup");
    }
  }, [user, appUser, loading, waitingForAppUser, hasTriedRefresh, navigate]);

  // Hook 4: Verificar se usuário precisa definir senha (primeiro acesso)
  useEffect(() => {
    if (user && appUser && appUser.first_login) {
      console.log('🔐 Primeiro acesso detectado, redirecionando para definir senha...');
      navigate("/set-password");
    }
  }, [user, appUser, navigate]);

  // Reset hasTriedRefresh quando user muda
  useEffect(() => {
    if (user?.id) {
      setHasTriedRefresh(false);
    }
  }, [user?.id]);

  // Estados de loading
  if (loading || waitingForAppUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">
            {waitingForAppUser ? "Configurando conta..." : "Carregando..."}
          </p>
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