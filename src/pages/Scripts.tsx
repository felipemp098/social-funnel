import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Copy, 
  Eye, 
  Search,
  Plus,
  Calendar,
  Hash,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

// Mock data
const scriptsData = [
  {
    id: 1,
    title: "Primeira Abordagem WhatsApp",
    tags: ["WhatsApp", "Cold Outreach"],
    lastUpdated: "2024-01-15",
    content: `Olá [NOME],

Tudo bem? Sou [SEU_NOME] da [EMPRESA].

Vi que você trabalha com [ÁREA/NICHO] e fiquei interessado em entender melhor como funciona o processo de [PROCESSO_ESPECÍFICO] na sua empresa.

Será que você teria 15 minutos essa semana para uma conversa rápida? Posso te apresentar uma solução que tem ajudado empresas similares à sua a [BENEFÍCIO_ESPECÍFICO].

Quando seria um bom momento para você?

Abraços!`,
    category: "Outbound"
  },
  {
    id: 2,
    title: "Follow-up Pós Reunião",
    tags: ["E-mail", "Follow-up"],
    lastUpdated: "2024-01-14",
    content: `Assunto: Obrigado pela reunião - Próximos passos

Olá [NOME],

Obrigado pelo tempo dedicado hoje para nossa conversa sobre [TÓPICO_PRINCIPAL].

Conforme conversamos, vou preparar uma proposta personalizada considerando:
• [PONTO_1_DISCUTIDO]
• [PONTO_2_DISCUTIDO]  
• [PONTO_3_DISCUTIDO]

Pretendo enviar até [DATA] para sua análise.

Alguma informação adicional que preciso considerar?

Atenciosamente,
[SEU_NOME]`,
    category: "Follow-up"
  },
  {
    id: 3,
    title: "Proposta de Valor - SaaS",
    tags: ["LinkedIn", "Value Proposition"],
    lastUpdated: "2024-01-12",
    content: `Olá [NOME],

Parabéns pelo crescimento da [EMPRESA]! Vi que vocês expandiram [INFORMAÇÃO_ESPECÍFICA].

Trabalho com soluções de [SUA_ÁREA] e tenho ajudado empresas como [REFERÊNCIA] a:

✅ Reduzir em 40% o tempo gasto em [PROCESSO]
✅ Aumentar em 25% a eficiência de [ÁREA]
✅ Economizar R$ XX.XXX por mês em [CUSTO]

Vale uma conversa de 10 minutos para entender se faz sentido para vocês também?

Sucesso!`,
    category: "LinkedIn"
  },
  {
    id: 4,
    title: "Reativação de Lead Frio",
    tags: ["WhatsApp", "Reativação"],
    lastUpdated: "2024-01-10",
    content: `Oi [NOME], tudo bem?

Faz um tempo que conversamos sobre [TÓPICO_ANTERIOR].

Como andam as coisas por aí com [ÁREA_ESPECÍFICA]?

Aproveitando, temos algumas novidades que podem ser interessantes para [EMPRESA]:
• [NOVIDADE_1]
• [NOVIDADE_2]

Que tal retomarmos nossa conversa? 😊`,
    category: "Reativação"
  },
  {
    id: 5,
    title: "Agendamento de Demo",
    tags: ["E-mail", "Demo"],
    lastUpdated: "2024-01-08",
    content: `Assunto: Demo personalizada - [EMPRESA]

Olá [NOME],

Conforme conversamos, vou apresentar como nossa solução pode ajudar a [EMPRESA] a [OBJETIVO_ESPECÍFICO].

Sugiro os seguintes horários:
• [DATA_1] às [HORÁRIO_1]
• [DATA_2] às [HORÁRIO_2]
• [DATA_3] às [HORÁRIO_3]

A demo vai durar cerca de 20 minutos e vou focar nos pontos que mais fazem sentido para seu cenário.

Confirma qual horário funciona melhor?

Link da reunião: [LINK_ZOOM/MEET]

Abraços!`,
    category: "Demo"
  }
];

interface ScriptCardProps {
  script: typeof scriptsData[0];
  onCopy: () => void;
  onView: () => void;
}

function ScriptCard({ script, onCopy, onView }: ScriptCardProps) {
  const getCategoryColor = (category: string) => {
    const colors = {
      "Outbound": "bg-secondary/20 text-secondary border-secondary/30",
      "Follow-up": "bg-primary/20 text-primary border-primary/30",
      "LinkedIn": "bg-social-linkedin/20 text-blue-400 border-blue-400/30",
      "Reativação": "bg-orange-500/20 text-orange-400 border-orange-400/30",
      "Demo": "bg-success/20 text-success border-success/30",
    };
    return colors[category as keyof typeof colors] || "bg-muted text-muted-foreground";
  };

  const getTagColor = (tag: string) => {
    const colors = {
      "WhatsApp": "bg-social-whatsapp/20 text-green-400 border-green-400/30",
      "E-mail": "bg-blue-500/20 text-blue-400 border-blue-400/30",
      "LinkedIn": "bg-social-linkedin/20 text-blue-400 border-blue-400/30",
      "Cold Outreach": "bg-slate-500/20 text-slate-400 border-slate-400/30",
      "Follow-up": "bg-primary/20 text-primary border-primary/30",
      "Value Proposition": "bg-success/20 text-success border-success/30",
      "Reativação": "bg-orange-500/20 text-orange-400 border-orange-400/30",
      "Demo": "bg-purple-500/20 text-purple-400 border-purple-400/30",
    };
    return colors[tag as keyof typeof colors] || "bg-muted text-muted-foreground";
  };

  return (
    <GlassCard hover glow="primary" className="group">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {script.title}
            </h3>
            
            <div className="flex items-center gap-2 mb-3">
              <Badge className={getCategoryColor(script.category)}>
                {script.category}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {script.tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className={`text-xs ${getTagColor(tag)}`}
                >
                  <Hash className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Content Preview */}
        <div className="bg-background/30 rounded-lg p-3 border border-border/30">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {script.content.substring(0, 120)}...
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Atualizado em {new Date(script.lastUpdated).toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onView}
              className="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver
            </Button>
            
            <Button 
              size="sm" 
              onClick={onCopy}
              className="bg-gradient-primary hover:scale-105 transition-transform"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copiar
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function EmptyState() {
  return (
    <GlassCard className="col-span-full">
      <div className="text-center py-12">
        <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum script encontrado
        </h3>
        <p className="text-muted-foreground mb-6">
          Adicione seu primeiro script para começar a padronizar suas abordagens
        </p>
        <Button className="bg-gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeiro Script
        </Button>
      </div>
    </GlassCard>
  );
}

export default function Scripts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredScripts, setFilteredScripts] = useState(scriptsData);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === "") {
      setFilteredScripts(scriptsData);
    } else {
      const filtered = scriptsData.filter(script =>
        script.title.toLowerCase().includes(term.toLowerCase()) ||
        script.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase())) ||
        script.category.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredScripts(filtered);
    }
  };

  const handleCopyScript = (script: typeof scriptsData[0]) => {
    navigator.clipboard.writeText(script.content);
    toast.success("Script copiado!", {
      description: `${script.title} foi copiado para a área de transferência.`,
    });
  };

  const handleViewScript = (script: typeof scriptsData[0]) => {
    // TODO: Implementar modal/drawer com o conteúdo completo
    toast.info("Visualização em breve", {
      description: "Modal de visualização será implementado na próxima versão.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scripts</h1>
          <p className="text-muted-foreground">
            Templates de mensagens para social selling
          </p>
        </div>
        
        <Button className="bg-gradient-primary hover:scale-105 transition-transform">
          <Plus className="w-4 h-4 mr-2" />
          Novo Script
        </Button>
      </div>

      {/* Search & Filters */}
      <GlassCard>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por título, categoria ou tag..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-success" />
            <span>{filteredScripts.length} scripts encontrados</span>
          </div>
        </div>
      </GlassCard>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredScripts.length > 0 ? (
          filteredScripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onCopy={() => handleCopyScript(script)}
              onView={() => handleViewScript(script)}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Statistics */}
      {scriptsData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Scripts</p>
                <p className="text-2xl font-bold text-foreground">{scriptsData.length}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
                <Hash className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(scriptsData.map(s => s.category)).size}
                </p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-success flex items-center justify-center">
                <Calendar className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Última Atualização</p>
                <p className="text-lg font-semibold text-foreground">Hoje</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}