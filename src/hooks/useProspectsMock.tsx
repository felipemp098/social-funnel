import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useProspects as useProspectsReal, type Prospect, type ProspectFilters, type CreateProspectData, type UpdateProspectData } from './useProspects';

// Dados mockados para desenvolvimento
const mockProspects: Prospect[] = [
  {
    id: 1,
    contact_name: "João Silva",
    company: "Empresa ABC",
    position: "CEO",
    contact_email: "joao@empresaabc.com",
    contact_phone: "(11) 99999-9999",
    source: "inbound",
    status: "new",
    temperature: "hot",
    segment: "Educação",
    budget: "R$ 10.000 - R$ 50.000",
    probability: 80,
    date_prospect: "2025-01-20T10:00:00Z",
    last_contact_date: null,
    next_follow_up: "2025-01-25T14:00:00Z",
    date_scheduling: null,
    date_call: null,
    deal_value: 25000,
    closer: "Maria Santos",
    link: "https://crm.empresa.com/lead/123",
    authority: "Tomador de decisão",
    need: "Automação de processos",
    time: "30 dias",
    notes: "Cliente muito interessado, próxima reunião agendada",
    status_scheduling: "Confirmado",
    reply: true,
    confirm_call: true,
    complete: false,
    selling: false,
    payment: false,
    negotiations: false,
    social_selling: false,
    client_id: null,
    id_sheets: "A1",
    time_frame: "Q1 2025",
    created_at: "2025-01-20T10:00:00Z",
    updated_at: "2025-01-20T10:00:00Z",
    owner_id: "446f867b-cd8c-480e-9d68-f1af89a4c8c4"
  },
  {
    id: 2,
    contact_name: "Ana Costa",
    company: "TechCorp",
    position: "CTO",
    contact_email: "ana@techcorp.com",
    contact_phone: "(21) 88888-8888",
    source: "outbound",
    status: "contacted",
    temperature: "warm",
    segment: "Tecnologia",
    budget: "R$ 50.000+",
    probability: 60,
    date_prospect: "2025-01-19T09:00:00Z",
    last_contact_date: "2025-01-21T15:30:00Z",
    next_follow_up: "2025-01-28T10:00:00Z",
    date_scheduling: null,
    date_call: null,
    deal_value: 75000,
    closer: "Pedro Oliveira",
    link: "https://crm.empresa.com/lead/124",
    authority: "Influenciador",
    need: "Escalabilidade",
    time: "60 dias",
    notes: "Necessita aprovação do board",
    status_scheduling: "Pendente",
    reply: false,
    confirm_call: false,
    complete: false,
    selling: false,
    payment: false,
    negotiations: true,
    social_selling: false,
    client_id: null,
    id_sheets: "A2",
    time_frame: "Q2 2025",
    created_at: "2025-01-19T09:00:00Z",
    updated_at: "2025-01-21T15:30:00Z",
    owner_id: "446f867b-cd8c-480e-9d68-f1af89a4c8c4"
  },
  {
    id: 3,
    contact_name: "Carlos Mendes",
    company: "StartupXYZ",
    position: "Founder",
    contact_email: "carlos@startupxyz.com",
    contact_phone: "(85) 77777-7777",
    source: "inbound",
    status: "meeting_scheduled",
    temperature: "cold",
    segment: "Startups",
    budget: "R$ 5.000 - R$ 15.000",
    probability: 40,
    date_prospect: "2025-01-18T14:00:00Z",
    last_contact_date: "2025-01-20T11:00:00Z",
    next_follow_up: "2025-01-24T16:00:00Z",
    date_scheduling: "2025-01-24T16:00:00Z",
    date_call: null,
    deal_value: 12000,
    closer: "Lucia Fernandes",
    link: "https://crm.empresa.com/lead/125",
    authority: "Tomador de decisão",
    need: "MVP",
    time: "90 dias",
    notes: "Reunião confirmada para próxima semana",
    status_scheduling: "Confirmado",
    reply: true,
    confirm_call: true,
    complete: false,
    selling: false,
    payment: false,
    negotiations: false,
    social_selling: true,
    client_id: null,
    id_sheets: "A3",
    time_frame: "Q1 2025",
    created_at: "2025-01-18T14:00:00Z",
    updated_at: "2025-01-20T11:00:00Z",
    owner_id: "446f867b-cd8c-480e-9d68-f1af89a4c8c4"
  }
];

const mockSegments = [
  { segment: "Educação", count: 15 },
  { segment: "Tecnologia", count: 12 },
  { segment: "Startups", count: 8 },
  { segment: "Saúde", count: 6 },
  { segment: "Fintech", count: 4 }
];

// Hook mockado que simula as funções do backend
export function useProspects(options: any = {}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: options.page || 1,
    page_size: options.page_size || 20,
    total: mockProspects.length
  });
  
  // Ref para evitar loops infinitos
  const filtersRef = useRef(options.filters);
  const paginationRef = useRef(pagination);

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 500));

      // Usar refs para evitar loops
      const currentFilters = filtersRef.current;
      const currentPagination = paginationRef.current;

      // Aplicar filtros mockados
      let filteredProspects = [...mockProspects];

      if (currentFilters?.search) {
        const search = currentFilters.search.toLowerCase();
        filteredProspects = filteredProspects.filter(p => 
          p.contact_name.toLowerCase().includes(search) ||
          p.company?.toLowerCase().includes(search) ||
          p.contact_email?.toLowerCase().includes(search) ||
          p.contact_phone?.includes(search)
        );
      }

      if (currentFilters?.source && currentFilters.source !== 'all') {
        filteredProspects = filteredProspects.filter(p => p.source === currentFilters.source);
      }

      if (currentFilters?.status && currentFilters.status !== 'all') {
        filteredProspects = filteredProspects.filter(p => p.status === currentFilters.status);
      }

      if (currentFilters?.temperature && currentFilters.temperature !== 'all') {
        filteredProspects = filteredProspects.filter(p => p.temperature === currentFilters.temperature);
      }

      if (currentFilters?.segment && currentFilters.segment !== 'all') {
        filteredProspects = filteredProspects.filter(p => p.segment === currentFilters.segment);
      }

      // Aplicar paginação
      const start = (currentPagination.page - 1) * currentPagination.page_size;
      const end = start + currentPagination.page_size;
      const paginatedProspects = filteredProspects.slice(start, end);

      setProspects(paginatedProspects);
      setPagination(prev => ({
        ...prev,
        total: filteredProspects.length
      }));
    } catch (err) {
      console.error('Erro inesperado:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro inesperado ao carregar prospects');
    } finally {
      setLoading(false);
    }
  }, []); // Sem dependências para evitar loops

  // Atualizar refs quando os valores mudarem
  useEffect(() => {
    filtersRef.current = options.filters;
  }, [options.filters]);

  useEffect(() => {
    paginationRef.current = pagination;
  }, [pagination]);

  // Efeito para buscar quando filtros ou paginação mudarem
  useEffect(() => {
    fetchProspects();
  }, [options.filters, pagination.page, pagination.page_size]);

  const refetch = useCallback(() => {
    fetchProspects();
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({ ...prev, page_size: pageSize, page: 1 }));
  }, []);

  return {
    prospects,
    loading,
    error,
    pagination,
    refetch,
    setPage,
    setPageSize,
  };
}

export function useProspect(prospectId: number | null) {
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProspect = useCallback(async () => {
    if (!prospectId) return;

    try {
      setLoading(true);
      setError(null);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 300));

      const foundProspect = mockProspects.find(p => p.id === prospectId);
      setProspect(foundProspect || null);
    } catch (err) {
      console.error('Erro inesperado:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro inesperado ao carregar prospect');
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    fetchProspect();
  }, [fetchProspect]);

  return {
    prospect,
    loading,
    error,
    refetch: fetchProspect,
  };
}

export function useProspectMutations() {
  const [loading, setLoading] = useState(false);

  const createProspect = async (data: CreateProspectData): Promise<Prospect | null> => {
    try {
      setLoading(true);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 800));

      const newProspect: Prospect = {
        id: mockProspects.length + 1,
        contact_name: data.contact_name,
        company: data.company || null,
        position: data.position || null,
        contact_email: data.contact_email || null,
        contact_phone: data.contact_phone || null,
        source: data.source,
        status: data.status || 'new',
        temperature: data.temperature || 'warm',
        segment: data.segment || null,
        budget: data.budget || null,
        probability: data.probability || null,
        date_prospect: data.date_prospect || new Date().toISOString(),
        last_contact_date: data.last_contact_date || null,
        next_follow_up: data.next_follow_up || null,
        date_scheduling: data.date_scheduling || null,
        date_call: data.date_call || null,
        deal_value: data.deal_value || null,
        closer: data.closer || null,
        link: data.link || null,
        authority: data.authority || null,
        need: data.need || null,
        time: data.time || null,
        notes: data.notes || null,
        status_scheduling: data.status_scheduling || null,
        reply: data.reply || null,
        confirm_call: data.confirm_call || null,
        complete: data.complete || null,
        selling: data.selling || null,
        payment: data.payment || null,
        negotiations: data.negotiations || null,
        social_selling: data.social_selling || null,
        client_id: data.client_id || null,
        id_sheets: data.id_sheets || null,
        time_frame: data.time_frame || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner_id: "446f867b-cd8c-480e-9d68-f1af89a4c8c4"
      };

      mockProspects.unshift(newProspect);
      toast.success('Prospect criado com sucesso!');
      return newProspect;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao criar prospect');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProspect = async (prospectId: number, data: UpdateProspectData): Promise<Prospect | null> => {
    try {
      setLoading(true);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 800));

      const prospectIndex = mockProspects.findIndex(p => p.id === prospectId);
      if (prospectIndex === -1) {
        toast.error('Prospect não encontrado');
        return null;
      }

      const updatedProspect = {
        ...mockProspects[prospectIndex],
        ...data,
        updated_at: new Date().toISOString()
      };

      mockProspects[prospectIndex] = updatedProspect;
      toast.success('Prospect atualizado com sucesso!');
      return updatedProspect;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao atualizar prospect');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteProspect = async (prospectId: number): Promise<boolean> => {
    try {
      setLoading(true);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 500));

      const prospectIndex = mockProspects.findIndex(p => p.id === prospectId);
      if (prospectIndex === -1) {
        toast.error('Prospect não encontrado');
        return false;
      }

      mockProspects.splice(prospectIndex, 1);
      toast.success('Prospect deletado com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao deletar prospect');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const duplicateProspect = async (prospectId: number): Promise<Prospect | null> => {
    try {
      setLoading(true);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 600));

      const originalProspect = mockProspects.find(p => p.id === prospectId);
      if (!originalProspect) {
        toast.error('Prospect não encontrado');
        return null;
      }

      const duplicatedProspect: Prospect = {
        ...originalProspect,
        id: mockProspects.length + 1,
        contact_name: `${originalProspect.contact_name} (Cópia)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'new',
        last_contact_date: null,
        next_follow_up: null,
        date_scheduling: null,
        date_call: null
      };

      mockProspects.unshift(duplicatedProspect);
      toast.success('Prospect duplicado com sucesso!');
      return duplicatedProspect;
    } catch (err) {
      console.error('Erro inesperado:', err);
      toast.error('Erro inesperado ao duplicar prospect');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createProspect,
    updateProspect,
    deleteProspect,
    duplicateProspect,
    loading,
  };
}

export function useProspectSegments() {
  const [segments, setSegments] = useState<Array<{ segment: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 300));

      setSegments(mockSegments);
    } catch (err) {
      console.error('Erro inesperado ao buscar segmentos:', err);
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
    refetch: fetchSegments,
  };
}

// Re-exportar utilitários do hook real
export { prospectUtils } from './useProspects';
