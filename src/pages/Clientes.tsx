import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  Plus, 
  ExternalLink,
  Edit,
  RefreshCw,
  Search,
  Building,
  DollarSign,
  Thermometer,
  Target,
  Sheet,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Filter,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useClients, useClientMutations, useClientSegments, Client, ClientFilters } from "@/hooks/useClients";
import { ClientDialog } from "@/components/ClientDialog";
import { LinkSheetDialog } from "@/components/LinkSheetDialog";
import { DeleteClientDialog } from "@/components/DeleteClientDialog";

interface ClienteRowProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onLinkSheet: (client: Client) => void;
  onOpenSheet: (client: Client) => void;
}

function ClienteRow({ client, onEdit, onDelete, onLinkSheet, onOpenSheet }: ClienteRowProps) {
  const getTemperaturaColor = (temp: string | null) => {
    switch (temp) {
      case "quente": return "bg-red-500/20 text-red-400 border-red-400/30";
      case "morno": return "bg-orange-500/20 text-orange-400 border-orange-400/30";
      case "frio": return "bg-blue-500/20 text-blue-400 border-blue-400/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTemperaturaIcon = (temp: string | null) => {
    switch (temp) {
      case "quente": return "🔥";
      case "morno": return "🌡️";
      case "frio": return "❄️";
      default: return "🌡️";
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "linked_ok": return <CheckCircle className="w-4 h-4 text-success" />;
      case "linked_complete": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "linked_warn": return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case "linked_pending": return <Clock className="w-4 h-4 text-blue-400" />;
      case "not_linked":
      default: 
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case "linked_ok": return "Sincronizado";
      case "linked_complete": return "Completo";
      case "linked_warn": return "Com Alertas";
      case "linked_pending": return "Aguardando";
      case "not_linked":
      default: 
        return "Não Vinculada";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact'
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isSheetLinked = client.sheet_status !== 'not_linked' && client.sheet_url;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Cliente Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {client.segment && (
                  <Badge variant="outline" className="text-xs">
                    {client.segment}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Criado em {formatDateTime(client.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Proprietário */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
              {getInitials(client.owner.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-medium text-foreground truncate">
              {client.owner.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {client.owner.role}
            </p>
          </div>
        </div>

        {/* Budget */}
        {client.budget && (
          <div className="hidden md:block min-w-0">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {client.budget}
                </p>
                <p className="text-xs text-muted-foreground">
                  Faturamento
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Temperatura */}
        {client.temperature && (
          <div className="min-w-0">
            <Badge className={getTemperaturaColor(client.temperature)}>
              <span className="mr-1">{getTemperaturaIcon(client.temperature)}</span>
              {client.temperature === "quente" ? "Quente" : 
               client.temperature === "morno" ? "Morno" : "Frio"}
            </Badge>
          </div>
        )}

        {/* Metas (mini badges) */}
        {client.goals && (
          <div className="hidden lg:flex items-center gap-1">
            {client.goals.vendas && client.goals.vendas > 0 && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                <Target className="w-3 h-3 mr-1" />
                {client.goals.vendas}
              </Badge>
            )}
            {client.goals.faturamento && client.goals.faturamento > 0 && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                {formatCurrency(client.goals.faturamento)}
              </Badge>
            )}
          </div>
        )}

        {/* Planilha Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1">
            {getStatusIcon(client.sheet_status)}
            <span className="text-xs text-muted-foreground hidden xl:inline">
              {getStatusText(client.sheet_status)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isSheetLinked ? (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onLinkSheet(client)}
                title="Gerenciar planilha"
              >
                <Sheet className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onEdit(client)}
                title="Editar cliente"
              >
                <Edit className="w-4 h-4" />
              </Button>
              {client.sheet_url && (
                <Button 
                  size="sm" 
                  className="bg-gradient-primary"
                  onClick={() => onOpenSheet(client)}
                  title="Abrir planilha"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onEdit(client)}
                title="Editar cliente"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={() => onLinkSheet(client)} 
                className="bg-gradient-secondary"
                title="Vincular planilha"
              >
                <Sheet className="w-4 h-4 mr-1" />
                Vincular
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(client)}
            className="text-destructive hover:text-destructive"
            title="Deletar cliente"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

function EmptyState({ onAddClient }: { onAddClient: () => void }) {
  return (
    <GlassCard>
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum cliente encontrado
        </h3>
        <p className="text-muted-foreground mb-6">
          Adicione seu primeiro cliente para começar a organizar suas prospecções
        </p>
        <Button onClick={onAddClient} className="bg-gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Primeiro Cliente
        </Button>
      </div>
    </GlassCard>
  );
}

function LoadingState() {
  return (
    <GlassCard>
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Carregando clientes...
        </h3>
        <p className="text-muted-foreground">
          Aguarde enquanto buscamos seus dados
        </p>
      </div>
    </GlassCard>
  );
}

export default function Clientes() {
  const [filters, setFilters] = useState<ClientFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [linkSheetDialogOpen, setLinkSheetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Hooks
  const { clients, loading, error, refetch } = useClients(filters);
  const { segments } = useClientSegments();
  const { 
    createClient, 
    updateClient, 
    deleteClient, 
    linkSheet, 
    unlinkSheet, 
    loading: mutationLoading 
  } = useClientMutations();

  // Computed values
  const stats = useMemo(() => {
    const totalClientes = clients.length;
    const clientesConectados = clients.filter(c => c.sheet_status !== 'not_linked').length;
    const metaFaturamentoTotal = clients.reduce((sum, c) => {
      return sum + (c.goals?.faturamento || 0);
    }, 0);

    return {
      totalClientes,
      clientesConectados,
      metaFaturamentoTotal,
    };
  }, [clients]);

  // Event handlers
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setFilters(prev => ({ ...prev, search: term || undefined }));
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setClientDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setClientDialogOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;
    
    const success = await deleteClient(selectedClient.id);
    if (success) {
      refetch();
    }
  };

  const handleLinkSheet = (client: Client) => {
    setSelectedClient(client);
    setLinkSheetDialogOpen(true);
  };

  const handleOpenSheet = (client: Client) => {
    if (client.sheet_url) {
      window.open(client.sheet_url, '_blank');
    }
  };

  const handleSaveClient = async (data: any) => {
    let success = false;
    
    if (selectedClient) {
      // Update existing client
      const result = await updateClient(selectedClient.id, data);
      success = !!result;
    } else {
      // Create new client
      const result = await createClient(data);
      success = !!result;
    }

    if (success) {
      setClientDialogOpen(false);
      refetch();
    }
  };

  const handleSaveSheet = async (data: any) => {
    if (!selectedClient) return false;

    const success = await linkSheet(selectedClient.id, data);
    if (success) {
      refetch();
    }
    return success;
  };

  const handleUnlinkSheet = async () => {
    if (!selectedClient) return false;

    const success = await unlinkSheet(selectedClient.id);
    if (success) {
      refetch();
    }
    return success;
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <GlassCard>
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Erro ao carregar clientes
            </h3>
            <p className="text-muted-foreground mb-6">
              {error}
            </p>
            <Button onClick={refetch} className="bg-gradient-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Gestão de prospectos e funil de vendas
          </p>
        </div>
        
        <Button 
          onClick={handleAddClient}
          className="bg-gradient-primary hover:scale-105 transition-transform"
          disabled={mutationLoading}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalClientes}</p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-success flex items-center justify-center">
              <Sheet className="w-5 h-5 text-success-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Planilhas Conectadas</p>
              <p className="text-2xl font-bold text-foreground">
                {stats.clientesConectados}/{stats.totalClientes}
              </p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
              <Target className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meta de Faturamento</p>
              <p className="text-xl font-bold text-foreground">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact'
                }).format(stats.metaFaturamentoTotal)}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>

          <Select
            value={filters.segment || 'all'}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              segment: value === 'all' ? undefined : value 
            }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os segmentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              {segments.map((segment) => (
                <SelectItem key={segment.segment} value={segment.segment}>
                  {segment.segment} ({segment.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.temperature || 'all'}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              temperature: (value === 'all' ? undefined : value) as any
            }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Temperatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="quente">🔥 Quente</SelectItem>
              <SelectItem value="morno">🌡️ Morno</SelectItem>
              <SelectItem value="frio">❄️ Frio</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              status: (value === 'all' ? undefined : value) as any
            }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status da planilha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="not_linked">Não vinculada</SelectItem>
              <SelectItem value="linked_pending">Aguardando</SelectItem>
              <SelectItem value="linked_warn">Com alertas</SelectItem>
              <SelectItem value="linked_ok">Sincronizada</SelectItem>
              <SelectItem value="linked_complete">Completa</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-success" />
            <span>{clients.length} clientes encontrados</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </GlassCard>

      {/* Clientes List */}
      <div className="space-y-4">
        {loading ? (
          <LoadingState />
        ) : clients.length > 0 ? (
          clients.map((client) => (
            <ClienteRow
              key={client.id}
              client={client}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              onLinkSheet={handleLinkSheet}
              onOpenSheet={handleOpenSheet}
            />
          ))
        ) : (
          <EmptyState onAddClient={handleAddClient} />
        )}
      </div>

      {/* Dialogs */}
      <ClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        client={selectedClient}
        onSave={handleSaveClient}
        loading={mutationLoading}
      />

      <LinkSheetDialog
        open={linkSheetDialogOpen}
        onOpenChange={setLinkSheetDialogOpen}
        client={selectedClient}
        onSave={handleSaveSheet}
        onUnlink={handleUnlinkSheet}
        loading={mutationLoading}
      />

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        client={selectedClient}
        onConfirm={handleConfirmDelete}
        loading={mutationLoading}
      />
    </div>
  );
}