import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  Copy, 
  Eye, 
  Search,
  Plus,
  Calendar,
  Hash,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Lock,
  Users,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { useScripts } from "@/hooks/useScripts";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { ScriptDialog } from "@/components/ScriptDialog";
import { ScriptDetailsDrawer } from "@/components/ScriptDetailsDrawer";
import { DeleteScriptDialog } from "@/components/DeleteScriptDialog";
import type { ScriptVisibility } from "@/integrations/supabase/types";

// Componente de loading skeleton
function ScriptCardSkeleton() {
  return (
    <GlassCard>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/4 mb-3" />
            <div className="flex gap-2 mb-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <Skeleton className="w-5 h-5" />
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// Componente do card do script
interface ScriptCardProps {
  script: any; // ScriptWithOwner
  onCopy: () => void;
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ScriptCard({ script, onCopy, onView, onEdit, onDelete }: ScriptCardProps) {
  const { user } = useAuth();
  const { canManage } = usePermissions();

  const getVisibilityInfo = (visibility: ScriptVisibility) => {
    switch (visibility) {
      case 'private':
        return { icon: Lock, color: 'bg-muted text-muted-foreground' };
      case 'public':
        return { icon: Globe, color: 'bg-success/20 text-success border-success/30' };
      default:
        return { icon: Lock, color: 'bg-muted text-muted-foreground' };
    }
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      "WhatsApp": "bg-social-whatsapp/20 text-green-400 border-green-400/30",
      "E-mail": "bg-blue-500/20 text-blue-400 border-blue-400/30",
      "LinkedIn": "bg-social-linkedin/20 text-blue-400 border-blue-400/30",
      "Cold Outreach": "bg-slate-500/20 text-slate-400 border-slate-400/30",
      "Follow-up": "bg-primary/20 text-primary border-primary/30",
      "Value Proposition": "bg-success/20 text-success border-success/30",
      "Reativação": "bg-orange-500/20 text-orange-400 border-orange-400/30",
      "Demo": "bg-purple-500/20 text-purple-400 border-purple-400/30",
    };
    return colors[tag] || "bg-muted text-muted-foreground";
  };

  const visibilityInfo = getVisibilityInfo(script.visibility);
  const canEdit = canManage(script.owner_id);
  const canDelete = canManage(script.owner_id);

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
              <Badge className={visibilityInfo?.color || 'bg-muted text-muted-foreground'}>
                {visibilityInfo?.icon ? <visibilityInfo.icon className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                {script.visibility === 'private' ? 'Privado' : 'Público'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                por {script.owner_name}
              </span>
            </div>
            
            {script.tags && script.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {script.tags.slice(0, 3).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className={`text-xs ${getTagColor(tag)}`}
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {script.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                    +{script.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Content Preview */}
        <div className="bg-background/30 rounded-lg p-3 border border-border/30">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {script.content ? script.content.substring(0, 120) + '...' : 'Nenhum conteúdo definido.'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Atualizado em {new Date(script.updated_at).toLocaleDateString('pt-BR')}</span>
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

function EmptyState({ onCreateScript }: { onCreateScript: () => void }) {
  return (
    <GlassCard className="col-span-full">
      <div className="text-center py-12">
        <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Nenhum script encontrado
        </h3>
        <p className="text-muted-foreground mb-6">
          Clique em "Novo Script" para começar a criar seus templates de social selling
        </p>
        <Button className="bg-gradient-primary" onClick={onCreateScript}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Primeiro Script
        </Button>
      </div>
    </GlassCard>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <GlassCard className="col-span-full">
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Erro ao carregar scripts
        </h3>
        <p className="text-muted-foreground mb-6">
          {error}
        </p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    </GlassCard>
  );
}

export default function Scripts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<ScriptVisibility | "all">("all");
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [editingScript, setEditingScript] = useState<any>(null);
  const [deletingScript, setDeletingScript] = useState<any>(null);
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { user } = useAuth();
  const { canManage } = usePermissions();
  
  const {
    scripts,
    stats,
    loading,
    error,
    fetchScripts,
    fetchScript,
    createScript,
    updateScript,
    deleteScript,
    clearError
  } = useScripts();

  // Buscar scripts com filtros
  const handleSearch = () => {
    const filters = {
      search: searchTerm.trim() || undefined,
      tag: tagFilter === "all" ? undefined : tagFilter,
      visibility: visibilityFilter === "all" ? undefined : visibilityFilter
    };
    fetchScripts(filters);
  };

  // Buscar automaticamente quando filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchTerm, tagFilter, visibilityFilter]);

  const handleCopyScript = (script: any) => {
    navigator.clipboard.writeText(script.content);
    toast.success("Script copiado!", {
      description: `${script.title} foi copiado para a área de transferência.`,
    });
  };

  const handleViewScript = async (script: any) => {
    await fetchScript(script.id);
    setSelectedScript(script);
  };

  const handleEditScript = (script: any) => {
    setEditingScript(script);
    setShowScriptDialog(true);
  };

  const handleDeleteScript = (script: any) => {
    setDeletingScript(script);
    setShowDeleteDialog(true);
  };

  const handleCreateScript = () => {
    setEditingScript(null);
    setShowScriptDialog(true);
  };

  const handleSubmitScript = async (data: any) => {
    let success = false;
    
    if (editingScript) {
      success = await updateScript(editingScript.id, data);
    } else {
      success = await createScript(data);
    }
    
    return success;
  };

  const handleConfirmDelete = async () => {
    if (deletingScript) {
      const success = await deleteScript(deletingScript.id);
      if (success) {
        setShowDeleteDialog(false);
        setDeletingScript(null);
        setSelectedScript(null);
      }
    }
  };

  const handleRetry = () => {
    clearError();
    handleSearch();
  };

  // Extrair tags únicas dos scripts para o filtro
  const availableTags = Array.from(
    new Set(scripts.flatMap(script => script.tags || []))
  ).sort();

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
        
        <Button 
          className="bg-gradient-primary hover:scale-105 transition-transform"
          onClick={handleCreateScript}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Script
        </Button>
      </div>

      {/* Search & Filters */}
      <GlassCard>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por título ou conteúdo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>{scripts.length} scripts encontrados</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {availableTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={visibilityFilter} onValueChange={(value) => setVisibilityFilter(value as ScriptVisibility | "all")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por visibilidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as visibilidades</SelectItem>
                <SelectItem value="private">Privado</SelectItem>
                <SelectItem value="public">Público</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScriptCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorState error={error} onRetry={handleRetry} />
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Scripts</p>
                <p className="text-2xl font-bold text-foreground">{stats.total_scripts}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
                <Users className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meus Scripts</p>
                <p className="text-2xl font-bold text-foreground">{stats.my_scripts}</p>
              </div>
            </div>
          </GlassCard>
          
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-success flex items-center justify-center">
                <Globe className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scripts Públicos</p>
                <p className="text-2xl font-bold text-foreground">{stats.public_scripts}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Hash className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tags Únicas</p>
                <p className="text-2xl font-bold text-foreground">{stats.total_tags}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && scripts.length === 0 && (
        <EmptyState onCreateScript={handleCreateScript} />
      )}

      {/* Scripts Grid */}
      {!loading && !error && scripts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scripts.map((script) => (
            <ScriptCard
              key={script.id}
              script={script}
              onCopy={() => handleCopyScript(script)}
              onView={() => handleViewScript(script)}
              onEdit={() => handleEditScript(script)}
              onDelete={() => handleDeleteScript(script)}
            />
          ))}
        </div>
      )}

      {/* Script Dialog */}
      <ScriptDialog
        open={showScriptDialog}
        onOpenChange={setShowScriptDialog}
        script={editingScript}
        onSubmit={handleSubmitScript}
        loading={loading}
      />

      {/* Script Details Drawer */}
      <ScriptDetailsDrawer
        script={selectedScript}
        open={!!selectedScript}
        onOpenChange={(open) => !open && setSelectedScript(null)}
        onEdit={() => {
          setEditingScript(selectedScript);
          setShowScriptDialog(true);
          setSelectedScript(null);
        }}
        onDelete={() => {
          setDeletingScript(selectedScript);
          setShowDeleteDialog(true);
          setSelectedScript(null);
        }}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteScriptDialog
        script={deletingScript}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        loading={loading}
      />
    </div>
  );
}