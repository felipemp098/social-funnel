import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos baseados na API do backend
export interface ClientGoals {
  respostas?: number;
  reunioes?: number;
  vendas?: number;
  faturamento?: number;
}

export interface ClientOwner {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

export interface Client {
  id: string;
  name: string;
  segment: string | null;
  temperature: 'frio' | 'morno' | 'quente' | null;
  budget: string | null;
  notes: string | null;
  goals: ClientGoals | null;
  sheet_status: 'not_linked' | 'linked_pending' | 'linked_warn' | 'linked_ok' | 'linked_complete' | null;
  sheet_url: string | null;
  sheet_tab?: string | null;
  sheet_mapping?: Record<string, string> | null;
  owner: ClientOwner;
  created_at: string;
  updated_at?: string;
}

export interface CreateClientData {
  name: string;
  segment?: string;
  temperature?: 'frio' | 'morno' | 'quente';
  budget?: string;
  notes?: string;
  goals?: ClientGoals;
}

export interface UpdateClientData {
  name?: string;
  segment?: string;
  temperature?: 'frio' | 'morno' | 'quente';
  budget?: string;
  notes?: string;
  goals?: ClientGoals;
}

export interface LinkSheetData {
  sheet_url: string;
  sheet_tab?: string;
  sheet_mapping?: Record<string, string>;
}

export interface ClientFilters {
  search?: string;
  segment?: string;
  temperature?: 'frio' | 'morno' | 'quente';
  status?: 'not_linked' | 'linked_pending' | 'linked_warn' | 'linked_ok' | 'linked_complete';
}

export function useClients(filters?: ClientFilters) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('list_clients', {
        search_term: filters?.search || null,
        segment_filter: filters?.segment || null,
        temperature_filter: filters?.temperature || null,
        status_filter: filters?.status || null,
      });

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        setError(error.message);
        toast.error('Erro ao carregar clientes', {
          description: error.message
        });
        return;
      }

      setClients(data || []);
    } catch (err) {
      console.error('Erro inesperado:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro inesperado ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [filters?.search, filters?.segment, filters?.temperature, filters?.status]);

  const refetch = () => {
    fetchClients();
  };

  return {
    clients,
    loading,
    error,
    refetch,
  };
}

export function useClient(clientId: string | null) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('get_client', {
        client_id: clientId,
      });

      if (error) {
        console.error('Erro ao buscar cliente:', error);
        setError(error.message);
        toast.error('Erro ao carregar cliente', {
          description: error.message
        });
        return;
      }

      setClient(data?.[0] || null);
    } catch (err) {
      console.error('Erro inesperado:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro inesperado ao carregar cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  return {
    client,
    loading,
    error,
    refetch: fetchClient,
  };
}

export function useClientMutations() {
  const [loading, setLoading] = useState(false);

  const createClient = async (data: CreateClientData): Promise<Client | null> => {
    try {
      setLoading(true);

      const { data: result, error } = await supabase.rpc('create_client', {
        client_name: data.name,
        client_segment: data.segment || null,
        client_temperature: data.temperature || 'morno',
        client_budget: data.budget || null,
        client_notes: data.notes || null,
        client_goals: data.goals || {},
      });

      if (error) {
        console.error('Erro ao criar cliente:', error);
        toast.error('Erro ao criar cliente', {
          description: error.message
        });
        return null;
      }

      toast.success('Cliente criado com sucesso!');
      return result?.[0] || null;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao criar cliente');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (clientId: string, data: UpdateClientData): Promise<Client | null> => {
    try {
      setLoading(true);

      const { data: result, error } = await supabase.rpc('update_client', {
        client_id: clientId,
        client_name: data.name || null,
        client_segment: data.segment || null,
        client_temperature: data.temperature || null,
        client_budget: data.budget || null,
        client_notes: data.notes || null,
        client_goals: data.goals || null,
      });

      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        toast.error('Erro ao atualizar cliente', {
          description: error.message
        });
        return null;
      }

      toast.success('Cliente atualizado com sucesso!');
      return result?.[0] || null;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao atualizar cliente');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('delete_client', {
        client_id: clientId,
      });

      if (error) {
        console.error('Erro ao deletar cliente:', error);
        toast.error('Erro ao deletar cliente', {
          description: error.message
        });
        return false;
      }

      toast.success('Cliente deletado com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao deletar cliente');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const linkSheet = async (clientId: string, data: LinkSheetData): Promise<boolean> => {
    try {
      setLoading(true);

      const params = {
        client_id: clientId,
        sheet_url_param: data.sheet_url,
        sheet_tab_param: data.sheet_tab || null,
        sheet_mapping_param: data.sheet_mapping || null,
      };

      console.log('📡 Chamando link_client_sheet com parâmetros:', params);

      const { data: result, error } = await supabase.rpc('link_client_sheet', params);

      console.log('📊 Resultado do link_client_sheet:', { result, error });

      if (error) {
        console.error('Erro ao vincular planilha:', error);
        toast.error('Erro ao vincular planilha', {
          description: error.message
        });
        return false;
      }

      console.log('✅ Planilha vinculada com sucesso! Dados retornados:', result);
      toast.success('Planilha vinculada com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao vincular planilha');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unlinkSheet = async (clientId: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { error } = await supabase.rpc('unlink_client_sheet', {
        client_id: clientId,
      });

      if (error) {
        console.error('Erro ao desvincular planilha:', error);
        toast.error('Erro ao desvincular planilha', {
          description: error.message
        });
        return false;
      }

      toast.success('Planilha desvinculada com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao desvincular planilha');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createClient,
    updateClient,
    deleteClient,
    linkSheet,
    unlinkSheet,
    loading,
  };
}

export function useClientSegments() {
  const [segments, setSegments] = useState<Array<{ segment: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchSegments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_client_segments');

      if (error) {
        console.error('Erro ao buscar segmentos:', error);
        return;
      }

      setSegments(data || []);
    } catch (err) {
      console.error('Erro inesperado ao buscar segmentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  return {
    segments,
    loading,
    refetch: fetchSegments,
  };
}

export interface ClientOption {
  id: string;
  name: string;
}

export function useClientsList() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.rpc('list_clients', {
        search_term: null,
        segment_filter: null,
        temperature_filter: null,
        status_filter: null,
      });

      if (error) {
        console.error('Erro ao buscar lista de clientes:', error);
        setError(error.message);
        return;
      }

      // Mapear para formato simplificado
      const clientOptions: ClientOption[] = (data || []).map((client: any) => ({
        id: client.id,
        name: client.name
      }));

      setClients(clientOptions);
    } catch (err) {
      console.error('Erro inesperado ao buscar lista de clientes:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
  };
}

