import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, 
  Shield, 
  Users, 
  Settings
} from "lucide-react";

// Importar os componentes das tabs
import { PerfilTab, SegurancaTab, UsuariosTab } from "@/components/configuracoes";

export default function Configuracoes() {
  const { appUser, isAdmin, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState("perfil");

  // Determinar quais tabs mostrar baseado nas permissões
  const availableTabs = [
    {
      id: "perfil",
      label: "Perfil",
      icon: User,
      description: "Gerenciar informações pessoais"
    },
    {
      id: "seguranca",
      label: "Segurança",
      icon: Shield,
      description: "Alterar senha e configurações de segurança"
    }
  ];

  // Adicionar tab Usuários apenas para Admin e Manager
  if (isAdmin || isManager) {
    availableTabs.push({
      id: "usuarios",
      label: "Usuários",
      icon: Users,
      description: "Gerenciar usuários do sistema"
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie seu perfil, segurança e usuários do sistema
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" />
        </div>
      </div>

      {/* Main Content */}
      <GlassCard className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3 bg-background/50 backdrop-blur-sm border border-border/50">
            {availableTabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-primary"
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Descriptions */}
          <div className="mt-4 mb-6">
            {availableTabs.map((tab) => (
              activeTab === tab.id && (
                <div key={tab.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.description}</span>
                </div>
              )
            ))}
          </div>

          {/* Tab Content */}
          <TabsContent value="perfil" className="mt-0">
            <PerfilTab />
          </TabsContent>

          <TabsContent value="seguranca" className="mt-0">
            <SegurancaTab />
          </TabsContent>

          {(isAdmin || isManager) && (
            <TabsContent value="usuarios" className="mt-0">
              <UsuariosTab />
            </TabsContent>
          )}
        </Tabs>
      </GlassCard>
    </div>
  );
}
