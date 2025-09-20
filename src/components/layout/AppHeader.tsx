import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getDisplayNameFromAuth, getDisplayInitialsFromAuth } from "@/utils/userUtils";
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const { user, appUser, userProfile, signOut } = useAuth();
  const { toast } = useToast();

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuário';
      default: return 'Carregando...';
    }
  };

  // Usar funções utilitárias para display name e iniciais
  const displayName = getDisplayNameFromAuth(user, appUser, userProfile);
  const displayInitials = getDisplayInitialsFromAuth(user, appUser, userProfile);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="h-16 glass-card border-b border-border/30 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-foreground hover:bg-accent/50" />
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SF</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">SocialFunnel</h1>
              <p className="text-xs text-muted-foreground -mt-1">Transforme conexões em vendas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Último sync: há 5 min</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Avatar className="w-9 h-9 ring-2 ring-primary/20">
            <AvatarImage src={userProfile?.effective_avatar || ""} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
              {displayInitials}
            </AvatarFallback>
          </Avatar>
          
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{getRoleName(appUser?.role)}</p>
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}