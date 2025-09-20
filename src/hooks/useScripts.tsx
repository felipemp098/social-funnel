import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Script, ScriptVisibility, CreateScriptForm } from '@/integrations/supabase/types';

// Tipos para o hook
export interface ScriptWithOwner extends Script {
  owner_name: string;
  owner_role: string;
}

export interface ScriptsFilters {
  search?: string;
  tag?: string;
  visibility?: ScriptVisibility;
}

export interface ScriptsStats {
  total_scripts: number;
  my_scripts: number;
  public_scripts: number;
  total_tags: number;
}

export interface UseScriptsReturn {
  // Estado
  scripts: ScriptWithOwner[];
  selectedScript: ScriptWithOwner | null;
  stats: ScriptsStats | null;
  loading: boolean;
  error: string | null;
  
  // Ações
  fetchScripts: (filters?: ScriptsFilters) => Promise<void>;
  fetchScript: (id: string) => Promise<void>;
  createScript: (data: CreateScriptForm) => Promise<boolean>;
  updateScript: (id: string, data: Partial<CreateScriptForm>) => Promise<boolean>;
  deleteScript: (id: string) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  
  // Utilitários
  clearError: () => void;
  clearSelectedScript: () => void;
}

export function useScripts(): UseScriptsReturn {
  const [scripts, setScripts] = useState<ScriptWithOwner[]>([]);
  const [selectedScript, setSelectedScript] = useState<ScriptWithOwner | null>(null);
  const [stats, setStats] = useState<ScriptsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para limpar erros
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Função para limpar script selecionado
  const clearSelectedScript = useCallback(() => {
    setSelectedScript(null);
  }, []);

  // Buscar scripts com filtros
  const fetchScripts = useCallback(async (filters: ScriptsFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('list_scripts', {
        search_term: filters.search || null,
        tag_filter: filters.tag || null,
        visibility_filter: filters.visibility || null,
        limit_count: 100,
        offset_count: 0
      });

      if (error) {
        console.error('Erro ao buscar scripts:', error);
        throw new Error(error.message);
      }

      // Transformar dados para incluir informações do owner
      const scriptsWithOwner: ScriptWithOwner[] = data.map((script: any) => ({
        id: script.id,
        owner_id: script.owner_id,
        title: script.title,
        tags: script.tags || [],
        content: script.content,
        visibility: script.visibility,
        created_at: script.created_at,
        updated_at: script.updated_at,
        owner_name: script.owner_name || 'Usuário',
        owner_role: script.owner_role || 'user'
      }));

      setScripts(scriptsWithOwner);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar scripts';
      setError(errorMessage);
      console.error('Erro ao buscar scripts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar script específico
  const fetchScript = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_script', {
        script_id: id
      });

      if (error) {
        console.error('Erro ao buscar script:', error);
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const scriptData = data[0];
        const scriptWithOwner: ScriptWithOwner = {
          id: scriptData.id,
          owner_id: scriptData.owner_id,
          title: scriptData.title,
          tags: scriptData.tags || [],
          content: scriptData.content,
          visibility: scriptData.visibility,
          created_at: scriptData.created_at,
          updated_at: scriptData.updated_at,
          owner_name: scriptData.owner_name || 'Usuário',
          owner_role: scriptData.owner_role || 'user'
        };
        setSelectedScript(scriptWithOwner);
      } else {
        throw new Error('Script não encontrado');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar script';
      setError(errorMessage);
      console.error('Erro ao buscar script:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Criar script
  const createScript = useCallback(async (data: CreateScriptForm): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase.rpc('create_script', {
        script_title: data.title,
        script_tags: data.tags || [],
        script_content: data.content || '',
        script_visibility: data.visibility || 'private'
      });

      if (error) {
        console.error('Erro ao criar script:', error);
        throw new Error(error.message);
      }

      if (result) {
        toast.success('Script criado com sucesso!');
        // Recarregar lista de scripts
        await fetchScripts();
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar script';
      setError(errorMessage);
      toast.error('Erro ao criar script', {
        description: errorMessage
      });
      console.error('Erro ao criar script:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchScripts]);

  // Atualizar script
  const updateScript = useCallback(async (id: string, data: Partial<CreateScriptForm>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase.rpc('update_script', {
        script_id: id,
        script_title: data.title || null,
        script_tags: data.tags || null,
        script_content: data.content || null,
        script_visibility: data.visibility || null
      });

      if (error) {
        console.error('Erro ao atualizar script:', error);
        throw new Error(error.message);
      }

      if (result) {
        toast.success('Script atualizado com sucesso!');
        // Recarregar lista de scripts
        await fetchScripts();
        // Atualizar script selecionado se for o mesmo
        if (selectedScript?.id === id) {
          await fetchScript(id);
        }
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar script';
      setError(errorMessage);
      toast.error('Erro ao atualizar script', {
        description: errorMessage
      });
      console.error('Erro ao atualizar script:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchScripts, fetchScript, selectedScript]);

  // Deletar script
  const deleteScript = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error } = await supabase.rpc('delete_script', {
        script_id: id
      });

      if (error) {
        console.error('Erro ao deletar script:', error);
        throw new Error(error.message);
      }

      if (result) {
        toast.success('Script removido com sucesso!');
        // Remover da lista local
        setScripts(prev => prev.filter(script => script.id !== id));
        // Limpar script selecionado se for o mesmo
        if (selectedScript?.id === id) {
          setSelectedScript(null);
        }
        return true;
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar script';
      setError(errorMessage);
      toast.error('Erro ao deletar script', {
        description: errorMessage
      });
      console.error('Erro ao deletar script:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedScript]);

  // Buscar estatísticas
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_scripts_stats');

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        const statsData = data[0];
        setStats({
          total_scripts: statsData.total_scripts || 0,
          my_scripts: statsData.my_scripts || 0,
          public_scripts: statsData.public_scripts || 0,
          total_tags: statsData.total_tags || 0
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
      setError(errorMessage);
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    fetchScripts();
    fetchStats();
  }, [fetchScripts, fetchStats]);

  return {
    // Estado
    scripts,
    selectedScript,
    stats,
    loading,
    error,
    
    // Ações
    fetchScripts,
    fetchScript,
    createScript,
    updateScript,
    deleteScript,
    fetchStats,
    
    // Utilitários
    clearError,
    clearSelectedScript
  };
}
