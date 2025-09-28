import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Filter, Calendar, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassTable, GlassTableHeader, GlassTableBody, GlassTableHead, GlassTableRow, GlassTableCell } from '@/components/ui/glass-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Eye, Copy, Trash2 } from 'lucide-react';
import { useProspects, useProspectSegments, useProspectMutations, type Prospect, type ProspectFilters } from '@/hooks/useProspects';
import { useDebounce } from '@/hooks/useDebounce';
import { AddProspectDialog } from '@/components/AddProspectDialog';
import { EditProspectDialog } from '@/components/EditProspectDialog';

// Funções utilitárias para tradução e cores
const getSourceColor = (source: string) => {
  switch (source) {
    case 'inbound': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'outbound': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const translateSource = (source: string) => {
  switch (source) {
    case 'inbound': return 'Inbound';
    case 'outbound': return 'Outbound';
    default: return source;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'new': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'contacted': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'responded': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'meeting_scheduled': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    case 'meeting_done': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'proposal_sent': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'won': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'lost': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'follow_up': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const translateStatus = (status: string) => {
  switch (status) {
    case 'new': return 'Novo';
    case 'contacted': return 'Contatado';
    case 'responded': return 'Respondeu';
    case 'meeting_scheduled': return 'Reunião Agendada';
    case 'meeting_done': return 'Reunião Realizada';
    case 'proposal_sent': return 'Proposta Enviada';
    case 'won': return 'Ganho';
    case 'lost': return 'Perdido';
    case 'follow_up': return 'Follow-up';
    default: return status;
  }
};

const getTemperatureColor = (temperature: string) => {
  switch (temperature) {
    case 'hot': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'warm': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'cold': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const translateTemperature = (temperature: string) => {
  switch (temperature) {
    case 'hot': return 'Quente';
    case 'warm': return 'Morno';
    case 'cold': return 'Frio';
    default: return temperature;
  }
};

const formatCurrency = (value: number | null) => {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('pt-BR');
};

export default function ProspectsPage() {
  // Estado dos filtros
  const [filters, setFilters] = useState<ProspectFilters>({
    search: '',
    source: 'all',
    status: 'all',
    temperature: 'all',
    segment: 'all',
    start_date: '',
    end_date: '',
  });

  // Estado dos modais
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // Estado da ordenação
  const [orderBy, setOrderBy] = useState('updated_at.desc');

  // Debounce para busca
  const debouncedSearch = useDebounce(filters.search || '', 300);

  // Memoizar filtros para evitar re-renders desnecessários
  const memoizedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch
  }), [filters.source, filters.status, filters.temperature, filters.segment, filters.start_date, filters.end_date, debouncedSearch]);

  // Hooks
  const { prospects, loading, loadingMore, error, pagination, hasMore, refetch, loadMore } = useProspects({
    filters: memoizedFilters,
    page_size: 10, // Fixo em 10 itens
    order: orderBy,
  });

  const { segments } = useProspectSegments();
  const { deleteProspect, duplicateProspect } = useProspectMutations();

  // Definir período padrão (mês atual)
  useEffect(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFilters(prev => ({
      ...prev,
      source: prev.source || 'all',
      status: prev.status || 'all',
      temperature: prev.temperature || 'all',
      segment: prev.segment || 'all',
      start_date: prev.start_date || firstDayOfMonth.toISOString().split('T')[0],
      end_date: prev.end_date || lastDayOfMonth.toISOString().split('T')[0],
    }));
  }, []);

  // A paginação é gerenciada internamente pelo hook

  const handleFilterChange = (key: keyof ProspectFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFilters({
      search: '',
      source: 'all',
      status: 'all',
      temperature: 'all',
      segment: 'all',
      start_date: firstDayOfMonth.toISOString().split('T')[0],
      end_date: lastDayOfMonth.toISOString().split('T')[0],
    });
    setPage(1);
  };

  const handleEdit = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setEditDialogOpen(true);
  };

  const handleDelete = async (prospect: Prospect) => {
    if (window.confirm(`Tem certeza que deseja excluir o prospect "${prospect.contact_name}"?`)) {
      const success = await deleteProspect(prospect.id);
      if (success) {
        refetch();
      }
    }
  };

  const handleDuplicate = async (prospect: Prospect) => {
    const duplicated = await duplicateProspect(prospect.id);
    if (duplicated) {
      refetch();
    }
  };

  const handleAddSuccess = () => {
    refetch();
    setAddDialogOpen(false);
  };

  const handleEditSuccess = () => {
    refetch();
    setEditDialogOpen(false);
    setSelectedProspect(null);
  };

  // Opções de ordenação
  const sortOptions = [
    { value: 'updated_at.desc', label: 'Atualizados recentemente' },
    { value: 'next_follow_up.asc', label: 'Próximos follow-ups' },
    { value: 'deal_value.desc', label: 'Maior valor' },
    { value: 'probability.desc', label: 'Maior probabilidade' },
    { value: 'contact_name.asc', label: 'Nome A-Z' },
  ];

  // Status options
  const statusOptions = [
    { value: 'all', label: 'Todos os status' },
    { value: 'new', label: 'Novo' },
    { value: 'contacted', label: 'Contatado' },
    { value: 'responded', label: 'Respondeu' },
    { value: 'meeting_scheduled', label: 'Reunião Agendada' },
    { value: 'meeting_done', label: 'Reunião Realizada' },
    { value: 'proposal_sent', label: 'Proposta Enviada' },
    { value: 'won', label: 'Ganho' },
    { value: 'lost', label: 'Perdido' },
    { value: 'follow_up', label: 'Follow-up' },
  ];

  // Source options
  const sourceOptions = [
    { value: 'all', label: 'Todos os sources' },
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' },
  ];

  // Temperature options
  const temperatureOptions = [
    { value: 'all', label: 'Todas as temperaturas' },
    { value: 'hot', label: 'Quente' },
    { value: 'warm', label: 'Morno' },
    { value: 'cold', label: 'Frio' },
  ];

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <GlassCard className="text-center p-8">
            <div className="text-red-500 mb-4">
              <TrendingUp className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar prospects</h3>
            <p className="text-white/70 mb-4">{error}</p>
            <Button onClick={refetch}>Tentar novamente</Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Prospects</h1>
          <p className="text-white/70 mt-1">Gerencie seus prospects e oportunidades</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Prospect
        </Button>
      </div>

      {/* Filtros */}
      <GlassCard>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-white/70" />
            <span className="text-sm font-medium text-white/80">Filtros</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Buscar prospects..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50"
              />
            </div>

            {/* Source */}
            <Select value={filters.source || 'all'} onValueChange={(value) => handleFilterChange('source', value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Temperature */}
            <Select value={filters.temperature || 'all'} onValueChange={(value) => handleFilterChange('temperature', value === 'all' ? undefined : value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Temperatura" />
              </SelectTrigger>
              <SelectContent>
                {temperatureOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Segment */}
            <Select value={filters.segment || 'all'} onValueChange={(value) => handleFilterChange('segment', value === 'all' ? '' : value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os segmentos</SelectItem>
                {segments.map(segment => (
                  <SelectItem key={segment.segment} value={segment.segment}>
                    {segment.segment} ({segment.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <DateRangePicker
              value={{
                from: filters.start_date ? new Date(filters.start_date) : undefined,
                to: filters.end_date ? new Date(filters.end_date) : undefined,
              }}
              onChange={(range) => {
                if (range?.from && range?.to) {
                  handleFilterChange('start_date', range.from.toISOString().split('T')[0]);
                  handleFilterChange('end_date', range.to.toISOString().split('T')[0]);
                }
              }}
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">Ordenar por:</span>
              <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="border-white/20 text-white/80 hover:bg-white/10"
            >
              Limpar filtros
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Tabela */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#131316cc' }}>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-[200px] bg-white/10" />
                <Skeleton className="h-4 w-[150px] bg-white/10" />
                <Skeleton className="h-4 w-[100px] bg-white/10" />
                <Skeleton className="h-4 w-[80px] bg-white/10" />
                <Skeleton className="h-4 w-[120px] bg-white/10" />
              </div>
            ))}
          </div>
        ) : prospects.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-white/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum prospect encontrado</h3>
            <p className="text-white/70 mb-4">
              {filters.search || filters.source !== 'all' || filters.status || filters.temperature || filters.segment
                ? 'Tente ajustar os filtros ou limpar a busca.'
                : 'Comece adicionando seu primeiro prospect.'
              }
            </p>
            {filters.search || filters.source !== 'all' || filters.status || filters.temperature || filters.segment ? (
              <Button variant="outline" onClick={clearFilters} className="border-white/20 text-white/80">
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => setAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar prospect
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <GlassTable>
              <GlassTableHeader>
                <GlassTableRow>
                  <GlassTableHead className="text-left">Nome</GlassTableHead>
                  <GlassTableHead className="text-center">Empresa</GlassTableHead>
                  <GlassTableHead className="text-center">Source</GlassTableHead>
                  <GlassTableHead className="text-center">Status</GlassTableHead>
                  <GlassTableHead className="text-center">Temperatura</GlassTableHead>
                  <GlassTableHead className="text-center">Segmento</GlassTableHead>
                  <GlassTableHead className="text-center">Valor</GlassTableHead>
                  <GlassTableHead className="text-center">Prob.</GlassTableHead>
                  <GlassTableHead className="text-center">Próx. Follow-up</GlassTableHead>
                  <GlassTableHead className="text-center">Criado</GlassTableHead>
                  <GlassTableHead className="w-[50px] text-center">Ações</GlassTableHead>
                </GlassTableRow>
              </GlassTableHeader>
              <GlassTableBody>
                {prospects.map((prospect) => (
                  <GlassTableRow key={prospect.id}>
                    <GlassTableCell className="font-medium text-left">
                      {prospect.contact_name}
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      {prospect.company || '-'}
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      <Badge className={getSourceColor(prospect.source)}>
                        {translateSource(prospect.source)}
                      </Badge>
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      <Badge className={getStatusColor(prospect.status)}>
                        {translateStatus(prospect.status)}
                      </Badge>
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      <Badge className={getTemperatureColor(prospect.temperature)}>
                        {translateTemperature(prospect.temperature)}
                      </Badge>
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      {prospect.segment || '-'}
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      {prospect.deal_value ? formatCurrency(prospect.deal_value) : '-'}
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      {prospect.probability ? `${prospect.probability}%` : '-'}
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      {prospect.next_follow_up ? formatDateTime(prospect.next_follow_up) : '-'}
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      {formatDate(prospect.date_prospect)}
                    </GlassTableCell>
                    <GlassTableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(prospect)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(prospect)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(prospect)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </GlassTableCell>
                  </GlassTableRow>
                ))}
              </GlassTableBody>
            </GlassTable>

            {/* Informações e botão carregar mais */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-white/70">
                Mostrando {prospects.length} de {pagination.total} prospects
              </div>
              
              {hasMore && (
                <Button 
                  onClick={loadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="border-white/20 text-white/80 hover:bg-white/10"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/80 mr-2"></div>
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Carregar mais 10
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      <AddProspectDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
      
      {selectedProspect && (
        <EditProspectDialog 
          open={editDialogOpen} 
          onOpenChange={setEditDialogOpen}
          prospect={selectedProspect}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
