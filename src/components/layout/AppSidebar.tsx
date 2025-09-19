import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings,
  TrendingUp,
  MessageSquare,
  Target
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
    description: "Visão geral e KPIs"
  },
  {
    title: "Scripts",
    url: "/scripts",
    icon: MessageSquare,
    description: "Templates de mensagens"
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    description: "Gestão de prospectos"
  },
];

const futureItems = [
  {
    title: "Metas",
    url: "/metas",
    icon: Target,
    description: "Definir objetivos"
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: TrendingUp,
    description: "Análises detalhadas"
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    description: "Preferências do sistema"
  },
];

export function AppSidebar() {
  const { open: collapsed } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const active = isActive(path);
    return `
      flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all
      ${active 
        ? "bg-gradient-primary text-primary-foreground shadow-glow-primary font-medium" 
        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      }
    `;
  };

  return (
    <Sidebar className={`glass-card border-r border-sidebar-border/30 ${!collapsed ? "w-[72px]" : "w-64"}`}>
      <SidebarContent className="pt-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="p-0">
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {collapsed && (
                        <div className="flex flex-col">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs opacity-70">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Future Features */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Em Breve
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {futureItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="p-0">
                    <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground/50 cursor-not-allowed">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {collapsed && (
                        <div className="flex flex-col">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-xs opacity-70">{item.description}</span>
                        </div>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}