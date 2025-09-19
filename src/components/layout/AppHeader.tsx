import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export function AppHeader() {
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
          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
            Online
          </Badge>
        </div>
        
        <Avatar className="w-9 h-9 ring-2 ring-primary/20">
          <AvatarImage src="" />
          <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
            JS
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}