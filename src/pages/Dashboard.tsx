import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Calendar,
  DollarSign,
  Target,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Filter
} from "lucide-react";

// Mock data
const kpiData = {
  prospeccoesHoje: 127,
  inboundTotal: { value: 89, percentage: 70 },
  outboundTotal: { value: 38, percentage: 30 },
  faturamentoTotal: 45780,
  
  inbound: {
    total: 89,
    respostas: 42,
    reunioesAgendadas: 18,
    reunioesRealizadas: 15,
    noShow: 3,
    followUp: 8,
    vendas: 6,
    faturamento: 28450,
    taxaNoShow: 16.7,
    taxaConversao: 40.0
  },
  
  outbound: {
    total: 38,
    respostas: 15,
    reunioesAgendadas: 8,
    reunioesRealizadas: 6,
    noShow: 2,
    followUp: 3,
    vendas: 2,
    faturamento: 17330,
    taxaNoShow: 25.0,
    taxaConversao: 33.3
  }
};

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  subtitle?: string;
  glow?: "primary" | "secondary" | "success";
  onClick?: () => void;
}

function KPICard({ title, value, icon: Icon, trend, trendValue, subtitle, glow = "primary", onClick }: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-destructive" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === "up") return "text-success";
    if (trend === "down") return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <GlassCard hover={!!onClick} glow={glow} className="cursor-pointer" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">{title}</span>
          </div>
          
          <div className="space-y-1">
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
        
        {trendValue && (
          <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="font-medium">{trendValue}</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function FilterBar() {
  return (
    <GlassCard className="mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <Select defaultValue="7d">
          <SelectTrigger className="w-40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="all">
          <SelectTrigger className="w-40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="inbound">Apenas Inbound</SelectItem>
            <SelectItem value="outbound">Apenas Outbound</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="all">
          <SelectTrigger className="w-40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos nichos</SelectItem>
            <SelectItem value="tech">Tecnologia</SelectItem>
            <SelectItem value="saude">Saúde</SelectItem>
            <SelectItem value="financas">Finanças</SelectItem>
          </SelectContent>
        </Select>
        
        <Select defaultValue="all">
          <SelectTrigger className="w-40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Temperatura</SelectItem>
            <SelectItem value="hot">🔥 Quente</SelectItem>
            <SelectItem value="warm">🌡️ Morno</SelectItem>
            <SelectItem value="cold">❄️ Frio</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </GlassCard>
  );
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das suas prospecções e vendas</p>
        </div>
        
        <Button className="bg-gradient-primary hover:scale-105 transition-transform">
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Prospecções Hoje"
          value={kpiData.prospeccoesHoje}
          icon={Target}
          trend="up"
          trendValue="+12%"
          glow="primary"
        />
        
        <KPICard
          title="Inbound"
          value={kpiData.inboundTotal.value}
          subtitle={`${kpiData.inboundTotal.percentage}% do total`}
          icon={TrendingUp}
          trend="up"
          trendValue="+8%"
          glow="success"
        />
        
        <KPICard
          title="Outbound"
          value={kpiData.outboundTotal.value}
          subtitle={`${kpiData.outboundTotal.percentage}% do total`}
          icon={MessageSquare}
          trend="neutral"
          glow="secondary"
        />
        
        <KPICard
          title="Faturamento Total"
          value={formatCurrency(kpiData.faturamentoTotal)}
          icon={DollarSign}
          trend="up"
          trendValue="+24%"
          glow="success"
        />
      </div>

      {/* Inbound Detailed */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-success" />
          <h2 className="text-xl font-semibold text-foreground">Inbound Detalhado</h2>
          <Badge className="bg-success/20 text-success border-success/30">
            {kpiData.inbound.total} prospecções
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Respostas"
            value={kpiData.inbound.respostas}
            icon={MessageSquare}
            glow="success"
          />
          
          <KPICard
            title="Reuniões Agendadas"
            value={kpiData.inbound.reunioesAgendadas}
            icon={Calendar}
            glow="success"
          />
          
          <KPICard
            title="Reuniões Realizadas"
            value={kpiData.inbound.reunioesRealizadas}
            icon={CheckCircle}
            glow="success"
          />
          
          <KPICard
            title="No Show"
            value={kpiData.inbound.noShow}
            subtitle={`${kpiData.inbound.taxaNoShow}% das reuniões`}
            icon={XCircle}
            trend="down"
            trendValue={`${kpiData.inbound.taxaNoShow}%`}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Follow-up"
            value={kpiData.inbound.followUp}
            icon={Clock}
            glow="secondary"
          />
          
          <KPICard
            title="Vendas"
            value={kpiData.inbound.vendas}
            icon={DollarSign}
            glow="success"
          />
          
          <KPICard
            title="Faturamento"
            value={formatCurrency(kpiData.inbound.faturamento)}
            icon={DollarSign}
            glow="success"
          />
          
          <KPICard
            title="Taxa Conversão"
            value={`${kpiData.inbound.taxaConversao}%`}
            icon={Target}
            trend="up"
            trendValue="+5%"
            glow="success"
          />
        </div>
      </div>

      {/* Outbound Detailed */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-secondary" />
          <h2 className="text-xl font-semibold text-foreground">Outbound Detalhado</h2>
          <Badge className="bg-secondary/20 text-secondary border-secondary/30">
            {kpiData.outbound.total} prospecções
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Respostas"
            value={kpiData.outbound.respostas}
            icon={MessageSquare}
            glow="secondary"
          />
          
          <KPICard
            title="Reuniões Agendadas"
            value={kpiData.outbound.reunioesAgendadas}
            icon={Calendar}
            glow="secondary"
          />
          
          <KPICard
            title="Reuniões Realizadas"
            value={kpiData.outbound.reunioesRealizadas}
            icon={CheckCircle}
            glow="secondary"
          />
          
          <KPICard
            title="No Show"
            value={kpiData.outbound.noShow}
            subtitle={`${kpiData.outbound.taxaNoShow}% das reuniões`}
            icon={XCircle}
            trend="down"
            trendValue={`${kpiData.outbound.taxaNoShow}%`}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Follow-up"
            value={kpiData.outbound.followUp}
            icon={Clock}
            glow="secondary"
          />
          
          <KPICard
            title="Vendas"
            value={kpiData.outbound.vendas}
            icon={DollarSign}
            glow="success"
          />
          
          <KPICard
            title="Faturamento"
            value={formatCurrency(kpiData.outbound.faturamento)}
            icon={DollarSign}
            glow="success"
          />
          
          <KPICard
            title="Taxa Conversão"
            value={`${kpiData.outbound.taxaConversao}%`}
            icon={Target}
            glow="secondary"
          />
        </div>
      </div>

      {/* Charts Section - Coming Soon */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Análises Visuais</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="lg:col-span-2">
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Funil de conversão em breve</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Distribuição por nicho em breve</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}