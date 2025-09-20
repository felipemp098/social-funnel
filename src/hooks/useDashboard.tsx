import { useState, useEffect, useCallback } from 'react';
import { 
  getDashboardMetrics, 
  getDashboardDrilldown,
  getDashboardDailyMetrics,
  type DashboardMetrics, 
  type DashboardFilters,
  type ProspectDrilldown,
  type DashboardDailyMetrics
} from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseDashboardMetricsResult {
  data: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseDashboardDrilldownResult {
  data: ProspectDrilldown[];
  loading: boolean;
  error: string | null;
  fetchDrilldown: (metric: string, filters?: DashboardFilters) => Promise<void>;
}

interface UseDashboardDailyMetricsResult {
  data: DashboardDailyMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para buscar métricas do dashboard
 */
export function useDashboardMetrics(filters: DashboardFilters = {}): UseDashboardMetricsResult {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const metrics = await getDashboardMetrics(filters);
      setData(metrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast({
        title: "Erro ao carregar métricas",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    data,
    loading,
    error,
    refetch: fetchMetrics,
  };
}

/**
 * Hook para buscar drill-down de métricas
 */
export function useDashboardDrilldown(): UseDashboardDrilldownResult {
  const [data, setData] = useState<ProspectDrilldown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDrilldown = useCallback(async (metric: string, filters: DashboardFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const prospects = await getDashboardDrilldown(metric, filters);
      setData(prospects);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast({
        title: "Erro ao carregar detalhes",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    data,
    loading,
    error,
    fetchDrilldown,
  };
}

/**
 * Hook para buscar métricas diárias do dashboard
 */
export function useDashboardDailyMetrics(filters: DashboardFilters = {}): UseDashboardDailyMetricsResult {
  const [data, setData] = useState<DashboardDailyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDailyMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dailyMetrics = await getDashboardDailyMetrics(filters);
      setData(dailyMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast({
        title: "Erro ao carregar métricas diárias",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    fetchDailyMetrics();
  }, [fetchDailyMetrics]);

  return {
    data,
    loading,
    error,
    refetch: fetchDailyMetrics,
  };
}

/**
 * Hook combinado para dashboard com filtros reativos
 */
export function useDashboard(initialFilters: DashboardFilters = {}) {
  // Definir valores padrão para as datas (primeiro dia do mês atual até hoje)
  const getDefaultFilters = (): DashboardFilters => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Usar datas locais sem conversão UTC
    const toLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      startDate: toLocalDateString(firstDayOfMonth),
      endDate: toLocalDateString(now),
      ...initialFilters
    };
  };

  const [filters, setFilters] = useState<DashboardFilters>(getDefaultFilters());
  
  // Métricas principais
  const metrics = useDashboardMetrics(filters);
  
  // Métricas diárias
  const dailyMetrics = useDashboardDailyMetrics(filters);
  
  // Drill-down
  const drilldown = useDashboardDrilldown();

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Função para resetar filtros
  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Função para buscar drill-down com filtros atuais
  const openDrilldown = useCallback((metric: string) => {
    drilldown.fetchDrilldown(metric, filters);
  }, [drilldown, filters]);

  return {
    // Estado dos filtros
    filters,
    updateFilters,
    resetFilters,
    
    // Métricas principais
    metrics: metrics.data,
    metricsLoading: metrics.loading,
    metricsError: metrics.error,
    refetchMetrics: metrics.refetch,
    
    // Métricas diárias
    dailyMetrics: dailyMetrics.data,
    dailyMetricsLoading: dailyMetrics.loading,
    dailyMetricsError: dailyMetrics.error,
    refetchDailyMetrics: dailyMetrics.refetch,
    
    // Drill-down
    drilldownData: drilldown.data,
    drilldownLoading: drilldown.loading,
    drilldownError: drilldown.error,
    openDrilldown,
  };
}

/**
 * Utilitários para formatação de dados do dashboard
 */
export const dashboardUtils = {
  /**
   * Formatar valor monetário
   */
  formatCurrency: (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  },

  /**
   * Formatar valor monetário de forma compacta
   */
  formatCurrencyCompact: (value: number): string => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return dashboardUtils.formatCurrency(value);
  },

  /**
   * Formatar porcentagem
   */
  formatPercentage: (value: number): string => {
    return `${value.toFixed(1)}%`;
  },

  /**
   * Calcular variação percentual
   */
  calculateVariation: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  /**
   * Obter cor da temperatura
   */
  getTemperatureColor: (temperature: string): string => {
    switch (temperature?.toLowerCase()) {
      case 'hot': return 'text-red-500';
      case 'warm': return 'text-yellow-500';
      case 'cold': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  },

  /**
   * Obter emoji da temperatura
   */
  getTemperatureEmoji: (temperature: string): string => {
    switch (temperature?.toLowerCase()) {
      case 'hot': return '🔥';
      case 'warm': return '🌡️';
      case 'cold': return '❄️';
      default: return '🌡️';
    }
  },

  /**
   * Obter cor do status
   */
  getStatusColor: (status: string): string => {
    switch (status) {
      case 'won': return 'text-green-500';
      case 'lost': return 'text-red-500';
      case 'meeting_scheduled': return 'text-blue-500';
      case 'meeting_done': return 'text-purple-500';
      case 'follow_up': return 'text-yellow-500';
      case 'responded': return 'text-cyan-500';
      default: return 'text-gray-500';
    }
  },

  /**
   * Traduzir status para português
   */
  translateStatus: (status: string): string => {
    const translations: Record<string, string> = {
      'new': 'Novo',
      'contacted': 'Contatado',
      'responded': 'Respondeu',
      'meeting_scheduled': 'Reunião Agendada',
      'meeting_done': 'Reunião Realizada',
      'proposal_sent': 'Proposta Enviada',
      'won': 'Ganho',
      'lost': 'Perdido',
      'follow_up': 'Follow-up',
    };
    return translations[status] || status;
  },

  /**
   * Obter lista de segmentos únicos dos dados
   */
  getUniqueSegments: (data: DashboardMetrics | null): string[] => {
    if (!data?.porSegmento) return [];
    return data.porSegmento
      .map(item => item.segmento)
      .filter(segment => segment && segment !== 'Não definido');
  },

  /**
   * Verificar se há dados para exibir
   */
  hasData: (data: DashboardMetrics | null): boolean => {
    return !!(data && data.totalPeriodo > 0);
  },

  /**
   * Obter período formatado
   */
  formatPeriod: (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return 'Último mês';
    
    // Usar conversão local sem problemas de fuso horário
    const parseLocalDate = (dateString: string): Date => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };
    
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    
    return `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
  }
};
