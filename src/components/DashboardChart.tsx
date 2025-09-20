import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  MessageSquare,
  Calendar,
  DollarSign,
  Target,
  BarChart3,
  LineChart,
  AlertCircle,
} from 'lucide-react';
import { type DashboardDailyMetrics } from '@/integrations/supabase/client';
import { dashboardUtils } from '@/hooks/useDashboard';

interface DashboardChartProps {
  data: DashboardDailyMetrics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

type ChartMetric = 'prospeccoes' | 'respostas' | 'agendamentos' | 'reunioes_realizadas' | 'vendas' | 'faturamento';

const METRIC_CONFIG = {
  prospeccoes: {
    label: 'Prospecções',
    icon: Target,
    color: 'rgb(59, 130, 246)', // blue-500
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  respostas: {
    label: 'Respostas',
    icon: MessageSquare,
    color: 'rgb(34, 197, 94)', // green-500
    bgColor: 'rgba(34, 197, 94, 0.1)',
  },
  agendamentos: {
    label: 'Agendamentos',
    icon: Calendar,
    color: 'rgb(168, 85, 247)', // purple-500
    bgColor: 'rgba(168, 85, 247, 0.1)',
  },
  reunioes_realizadas: {
    label: 'Reuniões Realizadas',
    icon: BarChart3,
    color: 'rgb(245, 158, 11)', // amber-500
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
  vendas: {
    label: 'Vendas',
    icon: TrendingUp,
    color: 'rgb(16, 185, 129)', // emerald-500
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  faturamento: {
    label: 'Faturamento',
    icon: DollarSign,
    color: 'rgb(239, 68, 68)', // red-500
    bgColor: 'rgba(239, 68, 68, 0.1)',
  },
};

export function DashboardChart({ data, loading, error, onRetry }: DashboardChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('prospeccoes');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');

  // Loading state
  if (loading) {
    return (
      <GlassCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar gráfico</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={onRetry} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </GlassCard>
    );
  }

  // Empty state
  if (!data || !data.labels.length) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <LineChart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Sem dados para o gráfico</h3>
          <p className="text-muted-foreground">
            Não há dados suficientes no período selecionado para gerar o gráfico.
          </p>
        </div>
      </GlassCard>
    );
  }

  const currentConfig = METRIC_CONFIG[selectedMetric];
  const currentData = data.datasets[selectedMetric];
  const maxValue = Math.max(...currentData);
  const minValue = Math.min(...currentData.filter(v => v > 0));

  // Função para calcular altura baseada no valor
  const calculateHeight = (value: number): number => {
    if (value <= 0 || maxValue <= 0) return 0;
    
    const normalizedValue = value / maxValue;
    if (normalizedValue === 1) return 90;
    if (normalizedValue >= 0.9) return 75;
    if (normalizedValue >= 0.8) return 60;
    if (normalizedValue >= 0.7) return 45;
    if (normalizedValue >= 0.6) return 35;
    if (normalizedValue >= 0.5) return 28;
    if (normalizedValue >= 0.4) return 22;
    if (normalizedValue >= 0.3) return 17;
    if (normalizedValue >= 0.2) return 12;
    if (normalizedValue >= 0.1) return 8;
    return 5;
  };

  return (
    <GlassCard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <currentConfig.icon className="w-5 h-5" style={{ color: currentConfig.color }} />
            <h3 className="text-lg font-semibold">Evolução Temporal</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={selectedMetric} onValueChange={(value: ChartMetric) => setSelectedMetric(value)}>
              <SelectTrigger className="w-48 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRIC_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={chartType} onValueChange={(value: 'line' | 'bar') => setChartType(value)}>
              <SelectTrigger className="w-24 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <LineChart className="w-4 h-4" />
                </SelectItem>
                <SelectItem value="bar">
                  <BarChart3 className="w-4 h-4" />
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative h-64 p-4 rounded-lg" style={{ backgroundColor: currentConfig.bgColor }}>
          {chartType === 'bar' ? (
            /* Modo Barras */
            <div className="flex items-end justify-between h-full space-x-1">
              {data.labels.map((label, index) => {
                const value = currentData[index];
                const height = calculateHeight(value);
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div className="flex items-end h-full mb-2 relative">
                      <div
                        className="w-full min-w-[12px] rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer"
                        style={{
                          height: `${height}%`,
                          backgroundColor: currentConfig.color,
                          minHeight: value > 0 ? '8px' : '0px',
                        }}
                        title={`${label}: ${selectedMetric === 'faturamento' ? dashboardUtils.formatCurrency(value) : value}`}
                      />
                      
                      {/* Value Label */}
                      {value > 0 && (
                        <div
                          className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium px-1 py-0.5 rounded text-white whitespace-nowrap"
                          style={{ backgroundColor: currentConfig.color }}
                        >
                          {selectedMetric === 'faturamento' 
                            ? `R$ ${(value / 1000).toFixed(0)}k`
                            : value
                          }
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground font-medium">
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Modo Linha */
            <div className="relative w-full h-full">
              {/* SVG para linha e área */}
              <svg 
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                style={{ marginBottom: '32px' }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id={`gradient-${selectedMetric}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={currentConfig.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={currentConfig.color} stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                
                {/* Área preenchida */}
                <path
                  d={`M 0,100 ${data.labels.map((label, index) => {
                    const value = currentData[index];
                    const height = calculateHeight(value);
                    const x = (index / Math.max(data.labels.length - 1, 1)) * 100;
                    const y = 100 - height;
                    return `L ${x},${y}`;
                  }).join(' ')} L 100,100 Z`}
                  fill={`url(#gradient-${selectedMetric})`}
                />
                
                {/* Linha principal */}
                <polyline
                  points={data.labels.map((label, index) => {
                    const value = currentData[index];
                    const height = calculateHeight(value);
                    const x = (index / Math.max(data.labels.length - 1, 1)) * 100;
                    const y = 100 - height;
                    return `${x},${y}`;
                  }).join(' ')}
                  stroke={currentConfig.color}
                  strokeWidth="0.8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Pontos posicionados com coordenadas absolutas */}
              {data.labels.map((label, index) => {
                const value = currentData[index];
                const height = calculateHeight(value);
                const x = (index / Math.max(data.labels.length - 1, 1)) * 100;
                const y = 100 - height;
                
                return (
                  <div key={index}>
                    {/* Ponto */}
                    <div
                      className="w-4 h-4 rounded-full border-2 bg-background cursor-pointer absolute z-10"
                      style={{
                        borderColor: currentConfig.color,
                        backgroundColor: value > 0 ? currentConfig.color : 'transparent',
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${label}: ${selectedMetric === 'faturamento' ? dashboardUtils.formatCurrency(value) : value}`}
                    />
                    
                    {/* Label da data */}
                    <div 
                      className="absolute text-xs text-muted-foreground font-medium z-10"
                      style={{
                        left: `${x}%`,
                        bottom: '-8px',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {label}
                    </div>
                    
                    {/* Value Label */}
                    {value > 0 && (
                      <div
                        className="absolute text-xs font-medium px-1 py-0.5 rounded text-white whitespace-nowrap z-10"
                        style={{ 
                          backgroundColor: currentConfig.color,
                          left: `${x}%`,
                          top: `${Math.max(y - 12, 0)}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {selectedMetric === 'faturamento' 
                          ? `R$ ${(value / 1000).toFixed(0)}k`
                          : value
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="font-semibold">
              {selectedMetric === 'faturamento' 
                ? dashboardUtils.formatCurrencyCompact(currentData.reduce((a, b) => a + b, 0))
                : currentData.reduce((a, b) => a + b, 0)
              }
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="text-sm text-muted-foreground">Máximo</div>
            <div className="font-semibold">
              {selectedMetric === 'faturamento' 
                ? dashboardUtils.formatCurrencyCompact(maxValue)
                : maxValue
              }
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="text-sm text-muted-foreground">Mínimo</div>
            <div className="font-semibold">
              {selectedMetric === 'faturamento' 
                ? dashboardUtils.formatCurrencyCompact(minValue || 0)
                : (minValue || 0)
              }
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background/50">
            <div className="text-sm text-muted-foreground">Média</div>
            <div className="font-semibold">
              {selectedMetric === 'faturamento' 
                ? dashboardUtils.formatCurrencyCompact(Math.round(currentData.reduce((a, b) => a + b, 0) / currentData.length))
                : Math.round(currentData.reduce((a, b) => a + b, 0) / currentData.length)
              }
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        {data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <span className="text-sm text-muted-foreground">Taxa de Resposta</span>
              <Badge variant="outline" className="bg-green-500/20 text-green-700">
                {dashboardUtils.formatPercentage(data.summary.taxa_resposta)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <span className="text-sm text-muted-foreground">Taxa de Agendamento</span>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-700">
                {dashboardUtils.formatPercentage(data.summary.taxa_agendamento)}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
              <Badge variant="outline" className="bg-purple-500/20 text-purple-700">
                {dashboardUtils.formatPercentage(data.summary.taxa_conversao)}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}