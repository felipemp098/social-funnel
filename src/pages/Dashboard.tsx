import { useState } from "react";
import { DateRange } from "react-day-picker";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DashboardDrilldown } from "@/components/DashboardDrilldown";
import { DashboardChart } from "@/components/DashboardChart";
import { useDashboard, dashboardUtils } from "@/hooks/useDashboard";
import { useClientsList } from "@/hooks/useClients";
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
  Filter,
  AlertCircle,
  RefreshCw,
  Calendar as CalendarIcon,
  X
} from "lucide-react";

// Utilitários para trabalhar com datas locais (sem fuso horário)
const dateUtils = {
  // Converter Date para string no formato YYYY-MM-DD (local)
  toLocalDateString: (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Converter string YYYY-MM-DD para Date (local)
  fromLocalDateString: (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  },

  // Obter primeiro dia do mês atual
  getFirstDayOfCurrentMonth: (): string => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return dateUtils.toLocalDateString(firstDay);
  },

  // Obter data atual
  getCurrentDate: (): string => {
    return dateUtils.toLocalDateString(new Date());
  },

  // Formatar data para exibição (DD/MM/AAAA)
  formatForDisplay: (dateString: string): string => {
    const date = dateUtils.fromLocalDateString(dateString);
    return date.toLocaleDateString('pt-BR');
  },

  // Verificar se as datas são iguais
  datesEqual: (date1: string, date2: string): boolean => {
    return date1 === date2;
  }
};

// Componente de loading para KPI cards
function KPICardSkeleton() {
  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
    </GlassCard>
  );
}

// Componente de erro para exibir quando houver falha no carregamento
function ErrorCard({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <GlassCard className="col-span-full">
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    </GlassCard>
  );
}

// Componente de estado vazio
function EmptyState() {
  return (
    <GlassCard className="col-span-full">
      <div className="text-center py-12">
        <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Nenhum dado encontrado</h3>
        <p className="text-muted-foreground mb-6">
          Não há prospecções no período selecionado. Ajuste os filtros ou adicione novos prospects.
        </p>
        <Button variant="outline">
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Ir para Prospects
        </Button>
      </div>
    </GlassCard>
  );
}

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

interface FilterBarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  availableSegments: string[];
  loading?: boolean;
}

function FilterBar({ filters, onFiltersChange, availableSegments, loading }: FilterBarProps) {
  // Hook para buscar lista de clientes
  const { clients: clientsList, loading: clientsLoading } = useClientsList();
  // Converter filtros para DateRange
  const getDateRange = (): DateRange | undefined => {
    if (!filters.startDate || !filters.endDate) {
      // Retornar o período padrão se não há filtros
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        from: firstDay,
        to: today
      };
    }
    
    return {
      from: dateUtils.fromLocalDateString(filters.startDate),
      to: dateUtils.fromLocalDateString(filters.endDate)
    };
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) {
      // Se não há range, usar padrão (mês atual)
      onFiltersChange({
        startDate: dateUtils.getFirstDayOfCurrentMonth(),
        endDate: dateUtils.getCurrentDate(),
      });
      return;
    }

    // Usar datas locais diretamente, sem conversão de fuso horário
    onFiltersChange({
      startDate: dateUtils.toLocalDateString(range.from),
      endDate: dateUtils.toLocalDateString(range.to),
    });
  };

  return (
    <GlassCard className="mb-6">
      {/* Todos os filtros em uma única linha */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <DateRangePicker
          date={getDateRange()}
          onDateChange={handleDateRangeChange}
          disabled={loading}
          placeholder="Selecione o período"
        />
        
        <Select 
          value={filters.source || "all"} 
          onValueChange={(value) => onFiltersChange({ source: value === "all" ? undefined : value })}
          disabled={loading}
        >
          <SelectTrigger className="w-40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            <SelectItem value="inbound">Apenas Inbound</SelectItem>
            <SelectItem value="outbound">Apenas Outbound</SelectItem>
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.segment || "all"} 
          onValueChange={(value) => onFiltersChange({ segment: value === "all" ? undefined : value })}
          disabled={loading}
        >
          <SelectTrigger className="w-40 bg-background/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos segmentos</SelectItem>
            {availableSegments.map((segment) => (
              <SelectItem key={segment} value={segment}>
                {segment}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={filters.temperature || "all"} 
          onValueChange={(value) => onFiltersChange({ temperature: value === "all" ? undefined : value })}
          disabled={loading}
        >
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
        
        <Select 
          value={filters.client_id || "all"} 
          onValueChange={(value) => onFiltersChange({ client_id: value === "all" ? undefined : value })}
          disabled={loading || clientsLoading}
        >
          <SelectTrigger className="w-48 bg-background/50">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clientsList.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.source || filters.segment || filters.temperature || filters.client_id) && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onFiltersChange({})}
            disabled={loading}
          >
            Limpar Filtros
          </Button>
        )}
      </div>
    </GlassCard>
  );
}

export default function Dashboard() {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownMetric, setDrilldownMetric] = useState("");
  const [drilldownTitle, setDrilldownTitle] = useState("");

  // Hook principal do dashboard
  const {
    filters,
    updateFilters,
    resetFilters,
    metrics,
    metricsLoading,
    metricsError,
    refetchMetrics,
    dailyMetrics,
    dailyMetricsLoading,
    dailyMetricsError,
    refetchDailyMetrics,
    drilldownData,
    drilldownLoading,
    drilldownError,
    openDrilldown,
  } = useDashboard();

  // Função para abrir drill-down
  const handleDrilldownClick = (metric: string, title: string) => {
    setDrilldownMetric(metric);
    setDrilldownTitle(title);
    setDrilldownOpen(true);
    openDrilldown(metric);
  };

  // Obter segmentos disponíveis
  const availableSegments = dashboardUtils.getUniqueSegments(metrics);

  // Verificar se há dados
  const hasData = dashboardUtils.hasData(metrics);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral das suas prospecções e vendas
            {filters.startDate && filters.endDate && (
              <span className="ml-2 text-sm">
                ({dashboardUtils.formatPeriod(filters.startDate, filters.endDate)})
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={refetchMetrics}
            disabled={metricsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button className="bg-gradient-primary hover:scale-105 transition-transform">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar 
        filters={filters}
        onFiltersChange={updateFilters}
        availableSegments={availableSegments}
        loading={metricsLoading}
      />

      {/* Error State */}
      {metricsError && (
        <ErrorCard error={metricsError} onRetry={refetchMetrics} />
      )}

      {/* Loading State */}
      {metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!metricsLoading && !metricsError && !hasData && <EmptyState />}

      {/* Gráfico de Evolução Temporal */}
      {!metricsLoading && !metricsError && hasData && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Análise Temporal</h2>
          <DashboardChart
            data={dailyMetrics}
            loading={dailyMetricsLoading}
            error={dailyMetricsError}
            onRetry={refetchDailyMetrics}
          />
        </div>
      )}

      {/* Dashboard Content */}
      {!metricsLoading && !metricsError && hasData && metrics && (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Prospecções Hoje"
              value={metrics.prospeccoesDoDia}
              icon={Target}
              glow="primary"
              onClick={() => handleDrilldownClick('prospeccoes_dia', 'Prospecções de Hoje')}
            />
            
            <KPICard
              title="Inbound"
              value={metrics.inbound.total}
              subtitle={`${dashboardUtils.formatPercentage(metrics.taxaInbound * 100)} do total`}
              icon={TrendingUp}
              glow="success"
              onClick={() => handleDrilldownClick('inbound', 'Prospects Inbound')}
            />
            
            <KPICard
              title="Outbound"
              value={metrics.outbound.total}
              subtitle={`${dashboardUtils.formatPercentage(metrics.taxaOutbound * 100)} do total`}
              icon={MessageSquare}
              glow="secondary"
              onClick={() => handleDrilldownClick('outbound', 'Prospects Outbound')}
            />
            
            <KPICard
              title="Faturamento Total"
              value={dashboardUtils.formatCurrency(metrics.inbound.faturamento + metrics.outbound.faturamento)}
              icon={DollarSign}
              glow="success"
              onClick={() => handleDrilldownClick('vendas', 'Vendas Fechadas')}
            />
          </div>

          {/* Inbound Detailed */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <h2 className="text-xl font-semibold text-foreground">Inbound Detalhado</h2>
              <Badge className="bg-success/20 text-success border-success/30">
                {metrics.inbound.total} prospecções
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Respostas"
                value={metrics.inbound.respostas}
                icon={MessageSquare}
                glow="success"
                onClick={() => handleDrilldownClick('respostas', 'Respostas Inbound')}
              />
              
              <KPICard
                title="Reuniões Agendadas"
                value={metrics.inbound.reunioesAgendadas}
                icon={Calendar}
                glow="success"
                onClick={() => handleDrilldownClick('reunioes_agendadas', 'Reuniões Agendadas Inbound')}
              />
              
              <KPICard
                title="Reuniões Realizadas"
                value={metrics.inbound.reunioesRealizadas}
                icon={CheckCircle}
                glow="success"
                onClick={() => handleDrilldownClick('reunioes_realizadas', 'Reuniões Realizadas Inbound')}
              />
              
              <KPICard
                title="No Show"
                value={metrics.inbound.noShow}
                subtitle={`${dashboardUtils.formatPercentage(metrics.inbound.taxaNoShow)} das reuniões`}
                icon={XCircle}
                trend="down"
                trendValue={`${dashboardUtils.formatPercentage(metrics.inbound.taxaNoShow)}`}
                onClick={() => handleDrilldownClick('no_show', 'No Show Inbound')}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Follow-up"
                value={metrics.inbound.followUp}
                icon={Clock}
                glow="secondary"
                onClick={() => handleDrilldownClick('follow_up', 'Follow-up Inbound')}
              />
              
              <KPICard
                title="Vendas"
                value={metrics.inbound.vendas}
                icon={DollarSign}
                glow="success"
                onClick={() => handleDrilldownClick('vendas', 'Vendas Inbound')}
              />
              
              <KPICard
                title="Faturamento"
                value={dashboardUtils.formatCurrency(metrics.inbound.faturamento)}
                icon={DollarSign}
                glow="success"
              />
              
              <KPICard
                title="Taxa Conversão"
                value={`${dashboardUtils.formatPercentage(metrics.inbound.taxaConversao)}`}
                icon={Target}
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
                {metrics.outbound.total} prospecções
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Respostas"
                value={metrics.outbound.respostas}
                icon={MessageSquare}
                glow="secondary"
                onClick={() => handleDrilldownClick('respostas', 'Respostas Outbound')}
              />
              
              <KPICard
                title="Reuniões Agendadas"
                value={metrics.outbound.reunioesAgendadas}
                icon={Calendar}
                glow="secondary"
                onClick={() => handleDrilldownClick('reunioes_agendadas', 'Reuniões Agendadas Outbound')}
              />
              
              <KPICard
                title="Reuniões Realizadas"
                value={metrics.outbound.reunioesRealizadas}
                icon={CheckCircle}
                glow="secondary"
                onClick={() => handleDrilldownClick('reunioes_realizadas', 'Reuniões Realizadas Outbound')}
              />
              
              <KPICard
                title="No Show"
                value={metrics.outbound.noShow}
                subtitle={`${dashboardUtils.formatPercentage(metrics.outbound.taxaNoShow)} das reuniões`}
                icon={XCircle}
                trend="down"
                trendValue={`${dashboardUtils.formatPercentage(metrics.outbound.taxaNoShow)}`}
                onClick={() => handleDrilldownClick('no_show', 'No Show Outbound')}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Follow-up"
                value={metrics.outbound.followUp}
                icon={Clock}
                glow="secondary"
                onClick={() => handleDrilldownClick('follow_up', 'Follow-up Outbound')}
              />
              
              <KPICard
                title="Vendas"
                value={metrics.outbound.vendas}
                icon={DollarSign}
                glow="success"
                onClick={() => handleDrilldownClick('vendas', 'Vendas Outbound')}
              />
              
              <KPICard
                title="Faturamento"
                value={dashboardUtils.formatCurrency(metrics.outbound.faturamento)}
                icon={DollarSign}
                glow="success"
              />
              
              <KPICard
                title="Taxa Conversão"
                value={`${dashboardUtils.formatPercentage(metrics.outbound.taxaConversao)}`}
                icon={Target}
                glow="secondary"
              />
            </div>
          </div>

          {/* Distribuições */}
          {(metrics.porSegmento.length > 0 || Object.keys(metrics.porTemperatura).length > 0) && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Distribuições</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por Temperatura */}
                {Object.keys(metrics.porTemperatura).length > 0 && (
                  <GlassCard>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Por Temperatura</h3>
                      <div className="space-y-2">
                        {Object.entries(metrics.porTemperatura).map(([temp, count]) => (
                          <div key={temp} className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              {dashboardUtils.getTemperatureEmoji(temp)}
                              {temp}
                            </span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Por Segmento */}
                {metrics.porSegmento.length > 0 && (
                  <GlassCard>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Por Segmento</h3>
                      <div className="space-y-3">
                        {metrics.porSegmento.slice(0, 5).map((item) => (
                          <div key={item.segmento} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{item.segmento}</span>
                              <div className="flex gap-2">
                                <Badge variant="outline">{item.total}</Badge>
                                {item.vendas > 0 && (
                                  <Badge className="bg-success/20 text-success">
                                    {item.vendas} vendas
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {item.faturamento > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {dashboardUtils.formatCurrency(item.faturamento)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Drill-down Dialog */}
      <DashboardDrilldown
        open={drilldownOpen}
        onClose={() => setDrilldownOpen(false)}
        title={drilldownTitle}
        data={drilldownData}
        loading={drilldownLoading}
        error={drilldownError}
      />
    </div>
  );
}