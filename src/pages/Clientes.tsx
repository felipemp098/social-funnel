import { useState } from "react";
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
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Mock data
const clientesData = [
  {
    id: 1,
    nome: "TechCorp Solutions",
    proprietario: {
      nome: "João Silva",
      avatar: "",
      iniciais: "JS"
    },
    nicho: "Tecnologia",
    faixaFaturamento: "R$ 1M - 5M",
    temperatura: "hot",
    metas: {
      respostas: 15,
      reunioes: 8,
      vendas: 3,
      faturamento: 45000
    },
    planilha: {
      conectada: true,
      ultimoSync: "2024-01-15T10:30:00",
      status: "sync"
    },
    prospeccoesAtivas: 23,
    taxaConversao: 18.5
  },
  {
    id: 2,
    nome: "MedHealth Clínicas",
    proprietario: {
      nome: "Maria Santos",
      avatar: "",
      iniciais: "MS"
    },
    nicho: "Saúde",
    faixaFaturamento: "R$ 500K - 1M",
    temperatura: "warm",
    metas: {
      respostas: 12,
      reunioes: 6,
      vendas: 2,
      faturamento: 28000
    },
    planilha: {
      conectada: true,
      ultimoSync: "2024-01-15T09:15:00",
      status: "warning"
    },
    prospeccoesAtivas: 18,
    taxaConversao: 14.2
  },
  {
    id: 3,
    nome: "Construtora Moderna",
    proprietario: {
      nome: "Pedro Oliveira",
      avatar: "",
      iniciais: "PO"
    },
    nicho: "Construção",
    faixaFaturamento: "R$ 2M - 10M",
    temperatura: "cold",
    metas: {
      respostas: 20,
      reunioes: 10,
      vendas: 4,
      faturamento: 85000
    },
    planilha: {
      conectada: false,
      ultimoSync: null,
      status: "disconnected"
    },
    prospeccoesAtivas: 5,
    taxaConversao: 8.1
  },
  {
    id: 4,
    nome: "FinanceFlow",
    proprietario: {
      nome: "Ana Costa",
      avatar: "",
      iniciais: "AC"
    },
    nicho: "Finanças",
    faixaFaturamento: "R$ 5M - 20M",
    temperatura: "hot",
    metas: {
      respostas: 25,
      reunioes: 12,
      vendas: 5,
      faturamento: 120000
    },
    planilha: {
      conectada: true,
      ultimoSync: "2024-01-15T11:45:00",
      status: "sync"
    },
    prospeccoesAtivas: 31,
    taxaConversao: 22.8
  }
];

interface ClienteRowProps {
  cliente: typeof clientesData[0];
  onEdit: () => void;
  onSync: () => void;
  onConnect: () => void;
}

function ClienteRow({ cliente, onEdit, onSync, onConnect }: ClienteRowProps) {
  const getTemperaturaColor = (temp: string) => {
    switch (temp) {
      case "hot": return "bg-temperature-hot/20 text-red-400 border-red-400/30";
      case "warm": return "bg-temperature-warm/20 text-orange-400 border-orange-400/30";
      case "cold": return "bg-temperature-cold/20 text-blue-400 border-blue-400/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTemperaturaIcon = (temp: string) => {
    switch (temp) {
      case "hot": return "🔥";
      case "warm": return "🌡️";
      case "cold": return "❄️";
      default: return "🌡️";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sync": return <CheckCircle className="w-4 h-4 text-success" />;
      case "warning": return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case "disconnected": return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "sync": return "Sincronizado";
      case "warning": return "Atenção";
      case "disconnected": return "Desconectado";
      default: return "Verificando...";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact'
    }).format(value);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Cliente Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{cliente.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {cliente.nicho}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {cliente.prospeccoesAtivas} prospecções ativas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Proprietário */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-8 h-8">
            <AvatarImage src={cliente.proprietario.avatar} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
              {cliente.proprietario.iniciais}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-medium text-foreground truncate">
              {cliente.proprietario.nome}
            </p>
            <p className="text-xs text-muted-foreground">Proprietário</p>
          </div>
        </div>

        {/* Faturamento */}
        <div className="hidden md:block min-w-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {cliente.faixaFaturamento}
              </p>
              <p className="text-xs text-muted-foreground">
                {cliente.taxaConversao}% conversão
              </p>
            </div>
          </div>
        </div>

        {/* Temperatura */}
        <div className="min-w-0">
          <Badge className={getTemperaturaColor(cliente.temperatura)}>
            <span className="mr-1">{getTemperaturaIcon(cliente.temperatura)}</span>
            {cliente.temperatura === "hot" ? "Quente" : 
             cliente.temperatura === "warm" ? "Morno" : "Frio"}
          </Badge>
        </div>

        {/* Metas (mini badges) */}
        <div className="hidden lg:flex items-center gap-1">
          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
            <Target className="w-3 h-3 mr-1" />
            {cliente.metas.vendas}
          </Badge>
          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
            {formatCurrency(cliente.metas.faturamento)}
          </Badge>
        </div>

        {/* Planilha Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1">
            {getStatusIcon(cliente.planilha.status)}
            <span className="text-xs text-muted-foreground hidden xl:inline">
              {getStatusText(cliente.planilha.status)}
            </span>
          </div>
          
          {cliente.planilha.conectada && (
            <div className="text-xs text-muted-foreground hidden xl:block">
              {formatDateTime(cliente.planilha.ultimoSync)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {cliente.planilha.conectada ? (
            <>
              <Button size="sm" variant="outline" onClick={onSync}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button size="sm" className="bg-gradient-primary">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onConnect} className="bg-gradient-secondary">
              <Sheet className="w-4 h-4 mr-1" />
              Conectar
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function EmptyState() {
  return (
    <GlassCard>
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum cliente cadastrado
        </h3>
        <p className="text-muted-foreground mb-6">
          Adicione seu primeiro cliente para começar a organizar suas prospecções
        </p>
        <Button className="bg-gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Primeiro Cliente
        </Button>
      </div>
    </GlassCard>
  );
}

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClientes, setFilteredClientes] = useState(clientesData);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === "") {
      setFilteredClientes(clientesData);
    } else {
      const filtered = clientesData.filter(cliente =>
        cliente.nome.toLowerCase().includes(term.toLowerCase()) ||
        cliente.proprietario.nome.toLowerCase().includes(term.toLowerCase()) ||
        cliente.nicho.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredClientes(filtered);
    }
  };

  const handleEdit = (cliente: typeof clientesData[0]) => {
    toast.info("Edição em breve", {
      description: `Edição de metas para ${cliente.nome} será implementada na próxima versão.`,
    });
  };

  const handleSync = (cliente: typeof clientesData[0]) => {
    toast.success("Sincronização iniciada", {
      description: `Sincronizando dados de ${cliente.nome}...`,
    });
  };

  const handleConnect = (cliente: typeof clientesData[0]) => {
    toast.info("Conexão em breve", {
      description: `Wizard de conexão para ${cliente.nome} será implementado na próxima versão.`,
    });
  };

  const totalClientes = clientesData.length;
  const clientesConectados = clientesData.filter(c => c.planilha.conectada).length;
  const metaFaturamentoTotal = clientesData.reduce((sum, c) => sum + c.metas.faturamento, 0);

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
        
        <Button className="bg-gradient-primary hover:scale-105 transition-transform">
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
              <p className="text-2xl font-bold text-foreground">{totalClientes}</p>
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
                {clientesConectados}/{totalClientes}
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
                }).format(metaFaturamentoTotal)}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search */}
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar cliente, proprietário ou nicho..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-success" />
            <span>{filteredClientes.length} clientes encontrados</span>
          </div>
        </div>
      </GlassCard>

      {/* Clientes List */}
      <div className="space-y-4">
        {filteredClientes.length > 0 ? (
          filteredClientes.map((cliente) => (
            <ClienteRow
              key={cliente.id}
              cliente={cliente}
              onEdit={() => handleEdit(cliente)}
              onSync={() => handleSync(cliente)}
              onConnect={() => handleConnect(cliente)}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}