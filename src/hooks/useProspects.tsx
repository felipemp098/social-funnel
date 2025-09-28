import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos baseados na especificação
export interface Prospect {
  id: number;
  contact_name: string;
  company: string | null;
  position: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: 'inbound' | 'outbound';
  status: 'new' | 'contacted' | 'responded' | 'meeting_scheduled' | 'meeting_done' | 'proposal_sent' | 'won' | 'lost' | 'follow_up';
  temperature: 'hot' | 'warm' | 'cold';
  segment: string | null;
  budget: string | null;
  probability: number | null; // 0-100
  date_prospect: string;
  last_contact_date: string | null;
  next_follow_up: string | null;
  date_scheduling: string | null;
  date_call: string | null;
  deal_value: number | null;
  closer: string | null;
  link: string | null;
  authority: string | null;
  need: string | null;
  time: string | null;
  notes: string | null;
  status_scheduling: string | null;
  reply: boolean | null;
  confirm_call: boolean | null;
  complete: boolean | null;
  selling: boolean | null;
  payment: boolean | null;
  negotiations: boolean | null;
  social_selling: boolean | null;
  client_id: string | null;
  id_sheets: string | null;
  time_frame: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface ProspectFilters {
  search?: string;
  source?: string;
  status?: string;
  temperature?: string;
  segment?: string;
  start_date?: string;
  end_date?: string;
}

export interface ProspectPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ProspectListResponse {
  items: Prospect[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface CreateProspectData {
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  company?: string;
  position?: string;
  source: 'inbound' | 'outbound';
  status?: 'new' | 'contacted' | 'responded' | 'meeting_scheduled' | 'meeting_done' | 'proposal_sent' | 'won' | 'lost' | 'follow_up';
  temperature?: 'hot' | 'warm' | 'cold';
  segment?: string;
  budget?: string;
  probability?: number;
  notes?: string;
  last_contact_date?: string;
  next_follow_up?: string;
  date_scheduling?: string;
  date_call?: string;
  deal_value?: number;
  closer?: string;
  link?: string;
  authority?: string;
  need?: string;
  time?: string;
  status_scheduling?: string;
  reply?: boolean;
  confirm_call?: boolean;
  complete?: boolean;
  selling?: boolean;
  payment?: boolean;
  negotiations?: boolean;
  social_selling?: boolean;
  client_id?: string;
  id_sheets?: string;
  time_frame?: string;
}

export interface UpdateProspectData extends Partial<CreateProspectData> {
  id: number;
}

export interface ProspectSegment {
  segment: string;
  count: number;
}

// Hook principal para listar prospects
export function useProspects(options: {
  filters?: ProspectFilters;
  page?: number;
  page_size?: number;
  order?: string;
  loadMore?: boolean; // Nova opção para carregar mais
} = {}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ProspectPagination>({
    page: 1,
    page_size: 10, // Mudado para 10
    total: 0,
    total_pages: 0
  });
  const [hasMore, setHasMore] = useState(true);

  const fetchProspects = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const currentPage = isLoadMore ? pagination.page + 1 : 1;
      const pageSize = options.page_size || 10;

      const { data, error: rpcError } = await supabase.rpc('list_prospects', {
        p_search: options.filters?.search || null,
        p_source: options.filters?.source || null,
        p_status: options.filters?.status || null,
        p_temperature: options.filters?.temperature || null,
        p_segment: options.filters?.segment || null,
        p_start_date: options.filters?.start_date || null,
        p_end_date: options.filters?.end_date || null,
        p_page: currentPage,
        p_page_size: pageSize,
        p_order: options.order || 'updated_at.desc'
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (data) {
        const response = data as ProspectListResponse;
        
        if (isLoadMore) {
          // Adicionar novos itens à lista existente
          setProspects(prev => [...prev, ...(response.items || [])]);
        } else {
          // Substituir lista (nova busca)
          setProspects(response.items || []);
        }
        
        setPagination({
          page: response.page,
          page_size: response.page_size,
          total: response.total,
          total_pages: response.total_pages
        });
        
        // Verificar se há mais itens para carregar
        setHasMore(response.page < response.total_pages);
      }
    } catch (err) {
      console.error('Erro ao buscar prospects:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro ao carregar prospects');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [options.filters, options.page_size, options.order, pagination.page]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const refetch = useCallback(() => {
    fetchProspects();
  }, [fetchProspects]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchProspects(true);
    }
  }, [hasMore, loadingMore, fetchProspects]);

  const setPage = useCallback((page: number) => {
    // A paginação será gerenciada pelo componente pai
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    // A paginação será gerenciada pelo componente pai
  }, []);

  return {
    prospects,
    loading,
    loadingMore,
    error,
    pagination,
    hasMore,
    refetch,
    loadMore,
    setPage,
    setPageSize,
  };
}

// Hook para obter um prospect específico
export function useProspect(id: number) {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProspect = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_prospect', {
        p_id: id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setProspect(data);
    } catch (err) {
      console.error('Erro ao buscar prospect:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro ao carregar prospect');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProspect();
  }, [fetchProspect]);

  return {
    prospect,
    loading,
    error,
    refetch: fetchProspect
  };
}

// Hook para mutações de prospects
export function useProspectMutations() {
  const createProspect = useCallback(async (data: CreateProspectData): Promise<Prospect> => {
    try {
      const { data: result, error: rpcError } = await supabase.rpc('create_prospect', {
        p_contact_name: data.contact_name,
        p_contact_email: data.contact_email || null,
        p_contact_phone: data.contact_phone || null,
        p_company: data.company || null,
        p_position: data.position || null,
        p_source: data.source,
        p_status: data.status || 'new',
        p_temperature: data.temperature || 'warm',
        p_segment: data.segment || null,
        p_budget: data.budget || null,
        p_probability: data.probability || null,
        p_notes: data.notes || null,
        p_last_contact_date: data.last_contact_date || null,
        p_next_follow_up: data.next_follow_up || null,
        p_date_scheduling: data.date_scheduling || null,
        p_date_call: data.date_call || null,
        p_deal_value: data.deal_value || null,
        p_closer: data.closer || null,
        p_link: data.link || null,
        p_authority: data.authority || null,
        p_need: data.need || null,
        p_time: data.time || null,
        p_status_scheduling: data.status_scheduling || null,
        p_reply: data.reply || null,
        p_confirm_call: data.confirm_call || null,
        p_complete: data.complete || null,
        p_selling: data.selling || null,
        p_payment: data.payment || null,
        p_negotiations: data.negotiations || null,
        p_social_selling: data.social_selling || null,
        p_client_id: data.client_id || null,
        p_id_sheets: data.id_sheets || null,
        p_time_frame: data.time_frame || null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      toast.success('Prospect criado com sucesso!');
      return result;
    } catch (err) {
      console.error('Erro ao criar prospect:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao criar prospect: ${message}`);
      throw err;
    }
  }, []);

  const updateProspect = useCallback(async (data: UpdateProspectData): Promise<Prospect> => {
    try {
      const { data: result, error: rpcError } = await supabase.rpc('update_prospect', {
        p_id: data.id,
        p_contact_name: data.contact_name || null,
        p_contact_email: data.contact_email || null,
        p_contact_phone: data.contact_phone || null,
        p_company: data.company || null,
        p_position: data.position || null,
        p_source: data.source || null,
        p_status: data.status || null,
        p_temperature: data.temperature || null,
        p_segment: data.segment || null,
        p_budget: data.budget || null,
        p_probability: data.probability || null,
        p_notes: data.notes || null,
        p_last_contact_date: data.last_contact_date || null,
        p_next_follow_up: data.next_follow_up || null,
        p_date_scheduling: data.date_scheduling || null,
        p_date_call: data.date_call || null,
        p_deal_value: data.deal_value || null,
        p_closer: data.closer || null,
        p_link: data.link || null,
        p_authority: data.authority || null,
        p_need: data.need || null,
        p_time: data.time || null,
        p_status_scheduling: data.status_scheduling || null,
        p_reply: data.reply || null,
        p_confirm_call: data.confirm_call || null,
        p_complete: data.complete || null,
        p_selling: data.selling || null,
        p_payment: data.payment || null,
        p_negotiations: data.negotiations || null,
        p_social_selling: data.social_selling || null,
        p_client_id: data.client_id || null,
        p_id_sheets: data.id_sheets || null,
        p_time_frame: data.time_frame || null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      toast.success('Prospect atualizado com sucesso!');
      return result;
    } catch (err) {
      console.error('Erro ao atualizar prospect:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao atualizar prospect: ${message}`);
      throw err;
    }
  }, []);

  const deleteProspect = useCallback(async (id: number): Promise<boolean> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_prospect', {
        p_id: id
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      toast.success('Prospect excluído com sucesso!');
      return data;
    } catch (err) {
      console.error('Erro ao excluir prospect:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao excluir prospect: ${message}`);
      throw err;
    }
  }, []);

  const duplicateProspect = useCallback(async (id: number): Promise<Prospect> => {
    try {
      // Primeiro buscar o prospect original
      const { data: originalProspect, error: fetchError } = await supabase.rpc('get_prospect', {
        p_id: id
      });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!originalProspect) {
        throw new Error('Prospect não encontrado');
      }

      // Criar novo prospect com os mesmos dados (exceto ID e datas)
      const duplicateData: CreateProspectData = {
        contact_name: `${originalProspect.contact_name} (Cópia)`,
        contact_email: originalProspect.contact_email,
        contact_phone: originalProspect.contact_phone,
        company: originalProspect.company,
        position: originalProspect.position,
        source: originalProspect.source,
        status: 'new', // Reset status para novo
        temperature: originalProspect.temperature,
        segment: originalProspect.segment,
        budget: originalProspect.budget,
        probability: originalProspect.probability,
        notes: originalProspect.notes,
        deal_value: originalProspect.deal_value,
        closer: originalProspect.closer,
        link: originalProspect.link,
        authority: originalProspect.authority,
        need: originalProspect.need,
        time: originalProspect.time,
        status_scheduling: originalProspect.status_scheduling,
        reply: originalProspect.reply,
        confirm_call: originalProspect.confirm_call,
        complete: originalProspect.complete,
        selling: originalProspect.selling,
        payment: originalProspect.payment,
        negotiations: originalProspect.negotiations,
        social_selling: originalProspect.social_selling,
        client_id: originalProspect.client_id,
        id_sheets: originalProspect.id_sheets,
        time_frame: originalProspect.time_frame
      };

      return await createProspect(duplicateData);
    } catch (err) {
      console.error('Erro ao duplicar prospect:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao duplicar prospect: ${message}`);
      throw err;
    }
  }, [createProspect]);

  return {
    createProspect,
    updateProspect,
    deleteProspect,
    duplicateProspect
  };
}

// Hook para obter segmentos disponíveis
export function useProspectSegments() {
  const [segments, setSegments] = useState<ProspectSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_prospect_segments');

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setSegments(data || []);
    } catch (err) {
      console.error('Erro ao buscar segmentos:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro ao carregar segmentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  return {
    segments,
    loading,
    error,
    refetch: fetchSegments
  };
}