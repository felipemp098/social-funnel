import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, Crown, Shield, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const { user, appUser, signOut } = useAuth();
  const { toast } = useToast();

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'manager': return <Shield className="w-3 h-3 text-blue-500" />;
      case 'user': return <User className="w-3 h-3 text-green-500" />;
      default: return <User className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuário';
      default: return 'Carregando...';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'user': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
        {/* Papel do usuário */}
        {appUser && (
          <Badge className={getRoleColor(appUser.role)}>
            {getRoleIcon(appUser.role)}
            <span className="ml-1">{getRoleName(appUser.role)}</span>
          </Badge>
        )}
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Último sync: há 5 min</span>
          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
            Online
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Avatar className="w-9 h-9 ring-2 ring-primary/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-foreground">{user?.email}</p>
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