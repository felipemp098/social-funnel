import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useProspectMutations, type UpdateProspectData, type Prospect } from '@/hooks/useProspects';
import { useClientsList } from '@/hooks/useClients';
import { toast } from 'sonner';

// Schema de validação (mesmo do AddProspectDialog, mas sem campos obrigatórios para update)
const prospectSchema = z.object({
  // Dados do contato
  contact_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  contact_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  
  // Classificação
  source: z.enum(['inbound', 'outbound']).optional(),
  status: z.enum(['new', 'contacted', 'responded', 'meeting_scheduled', 'meeting_done', 'proposal_sent', 'won', 'lost', 'follow_up']).optional(),
  temperature: z.enum(['hot', 'warm', 'cold']).optional(),
  segment: z.string().optional(),
  budget: z.string().optional(),
  probability: z.number().min(0).max(100, 'Probabilidade deve ser entre 0 e 100').optional(),
  
  // Cronologia & agenda
  date_prospect: z.string().optional(),
  last_contact_date: z.string().optional(),
  next_follow_up: z.string().optional(),
  date_scheduling: z.string().optional(),
  date_call: z.string().optional(),
  
  // Negócio
  deal_value: z.number().min(0, 'Valor deve ser positivo').optional(),
  closer: z.string().optional(),
  link: z.string().url('URL inválida').optional().or(z.literal('')),
  
  // Campos avançados
  authority: z.string().optional(),
  need: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
  status_scheduling: z.string().optional(),
  reply: z.boolean().optional(),
  confirm_call: z.boolean().optional(),
  complete: z.boolean().optional(),
  selling: z.boolean().optional(),
  payment: z.boolean().optional(),
  negotiations: z.boolean().optional(),
  social_selling: z.boolean().optional(),
  client_id: z.string().optional(),
  id_sheets: z.string().optional(),
  time_frame: z.string().optional(),
});

type ProspectFormData = z.infer<typeof prospectSchema>;

interface EditProspectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect;
  onSuccess: () => void;
}

export function EditProspectDialog({ open, onOpenChange, prospect, onSuccess }: EditProspectDialogProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { updateProspect, loading } = useProspectMutations();
  const { clients } = useClientsList();

  const form = useForm<ProspectFormData>({
    resolver: zodResolver(prospectSchema),
  });

  // Resetar formulário quando o modal abrir ou prospect mudar
  useEffect(() => {
    if (open && prospect) {
      // Converter datas para formato datetime-local
      const formatDateForInput = (dateString: string | null) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().slice(0, 16);
      };

      form.reset({
        contact_name: prospect.contact_name,
        company: prospect.company || '',
        position: prospect.position || '',
        contact_email: prospect.contact_email || '',
        contact_phone: prospect.contact_phone || '',
        source: prospect.source,
        status: prospect.status,
        temperature: prospect.temperature,
        segment: prospect.segment || '',
        budget: prospect.budget || '',
        probability: prospect.probability || undefined,
        date_prospect: formatDateForInput(prospect.date_prospect),
        last_contact_date: formatDateForInput(prospect.last_contact_date),
        next_follow_up: formatDateForInput(prospect.next_follow_up),
        date_scheduling: formatDateForInput(prospect.date_scheduling),
        date_call: formatDateForInput(prospect.date_call),
        deal_value: prospect.deal_value || undefined,
        closer: prospect.closer || '',
        link: prospect.link || '',
        authority: prospect.authority || '',
        need: prospect.need || '',
        time: prospect.time || '',
        notes: prospect.notes || '',
        status_scheduling: prospect.status_scheduling || '',
        reply: prospect.reply || undefined,
        confirm_call: prospect.confirm_call || undefined,
        complete: prospect.complete || undefined,
        selling: prospect.selling || undefined,
        payment: prospect.payment || undefined,
        negotiations: prospect.negotiations || undefined,
        social_selling: prospect.social_selling || undefined,
        client_id: prospect.client_id || 'none',
        id_sheets: prospect.id_sheets || '',
        time_frame: prospect.time_frame || '',
      });
      setAdvancedOpen(false);
    }
  }, [open, prospect, form]);

  const onSubmit = async (data: ProspectFormData) => {
    try {
      // Preparar dados para envio
      const prospectData: UpdateProspectData = {
        contact_name: data.contact_name || undefined,
        company: data.company || undefined,
        position: data.position || undefined,
        contact_email: data.contact_email || undefined,
        contact_phone: data.contact_phone || undefined,
        source: data.source || undefined,
        status: data.status || undefined,
        temperature: data.temperature || undefined,
        segment: data.segment || undefined,
        budget: data.budget || undefined,
        probability: data.probability || undefined,
        date_prospect: data.date_prospect ? new Date(data.date_prospect).toISOString() : undefined,
        last_contact_date: data.last_contact_date ? new Date(data.last_contact_date).toISOString() : undefined,
        next_follow_up: data.next_follow_up ? new Date(data.next_follow_up).toISOString() : undefined,
        date_scheduling: data.date_scheduling ? new Date(data.date_scheduling).toISOString() : undefined,
        date_call: data.date_call ? new Date(data.date_call).toISOString() : undefined,
        deal_value: data.deal_value || undefined,
        closer: data.closer || undefined,
        link: data.link || undefined,
        authority: data.authority || undefined,
        need: data.need || undefined,
        time: data.time || undefined,
        notes: data.notes || undefined,
        status_scheduling: data.status_scheduling || undefined,
        reply: data.reply || undefined,
        confirm_call: data.confirm_call || undefined,
        complete: data.complete || undefined,
        selling: data.selling || undefined,
        payment: data.payment || undefined,
        negotiations: data.negotiations || undefined,
        social_selling: data.social_selling || undefined,
        client_id: data.client_id === 'none' ? undefined : data.client_id || undefined,
        id_sheets: data.id_sheets || undefined,
        time_frame: data.time_frame || undefined,
      };

      const result = await updateProspect(prospect.id, prospectData);
      if (result) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao atualizar prospect:', error);
      toast.error('Erro inesperado ao atualizar prospect');
    }
  };

  const statusOptions = [
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

  const temperatureOptions = [
    { value: 'hot', label: 'Quente' },
    { value: 'warm', label: 'Morno' },
    { value: 'cold', label: 'Frio' },
  ];

  const sourceOptions = [
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' },
  ];

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-sm border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Editar Prospect</DialogTitle>
          <div className="text-sm text-white/60">
            <p>Criado em: {new Date(prospect.created_at).toLocaleString('pt-BR')}</p>
            <p>Atualizado em: {new Date(prospect.updated_at).toLocaleString('pt-BR')}</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* A. Dados do contato */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  A. Dados do Contato
                </h3>
                
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Nome do Contato</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: João Silva"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Empresa</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: Empresa X"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Cargo</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: CEO"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">E-mail</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: joao@empresa.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Telefone</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: (11) 99999-9999"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* B. Classificação */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  B. Classificação
                </h3>

                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue placeholder="Selecione o source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sourceOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Temperatura</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue placeholder="Selecione a temperatura" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {temperatureOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Segmento</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: Educação"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Budget</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: R$ 10.000 - R$ 50.000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Probabilidade (%)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          max="100"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: 70"
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* C. Cronologia & agenda */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  C. Cronologia & Agenda
                </h3>

                <FormField
                  control={form.control}
                  name="date_prospect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Data da Prospecção</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_contact_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Último Contato</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_follow_up"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Próximo Follow-up</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_scheduling"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Data de Agendamento</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_call"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Data da Chamada</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="datetime-local"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* D. Negócio */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">
                  D. Negócio
                </h3>

                <FormField
                  control={form.control}
                  name="deal_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Valor do Negócio (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          step="0.01"
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: 15000.00"
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="closer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Closer</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: João Silva"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Link (CRM/URL)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Ex: https://crm.empresa.com/lead/123"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Cliente Vinculado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white">
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum cliente</SelectItem>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* E. Campos avançados */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full border-white/20 text-white/80 hover:bg-white/10">
                  {advancedOpen ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                  Campos Avançados
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-white/80 border-b border-white/10 pb-2">
                      BANT/GPCT
                    </h4>

                    <FormField
                      control={form.control}
                      name="authority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Authority</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                              placeholder="Ex: Tomador de decisão"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="need"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Need</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                              placeholder="Ex: Automação de processos"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Time Frame</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                              placeholder="Ex: 30 dias"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-white/80 border-b border-white/10 pb-2">
                      Outros Campos
                    </h4>

                    <FormField
                      control={form.control}
                      name="id_sheets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">ID da Planilha</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                              placeholder="Ex: A1, B2, etc."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status_scheduling"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/80">Status de Agendamento</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                              placeholder="Ex: Confirmado"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/50"
                          placeholder="Observações adicionais sobre o prospect..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-white/20 text-white/80 hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
