import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building, Target, DollarSign, Thermometer, Save, X } from 'lucide-react';
import { Client, CreateClientData, UpdateClientData, ClientGoals } from '@/hooks/useClients';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (data: CreateClientData | UpdateClientData) => Promise<void>;
  loading?: boolean;
}

const temperatureOptions = [
  { value: 'frio', label: 'Frio ❄️', color: 'bg-blue-500/10 text-blue-400 border-blue-400/30' },
  { value: 'morno', label: 'Morno 🌡️', color: 'bg-orange-500/10 text-orange-400 border-orange-400/30' },
  { value: 'quente', label: 'Quente 🔥', color: 'bg-red-500/10 text-red-400 border-red-400/30' },
];

const segmentOptions = [
  'Tecnologia',
  'Saúde',
  'Educação',
  'Finanças',
  'Varejo',
  'Indústria',
  'Construção',
  'Serviços',
  'Consultoria',
  'E-commerce',
];

export function ClientDialog({ open, onOpenChange, client, onSave, loading = false }: ClientDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    segment: '',
    temperature: 'morno' as 'frio' | 'morno' | 'quente',
    budget: '',
    notes: '',
    goals: {
      respostas: 0,
      reunioes: 0,
      vendas: 0,
      faturamento: 0,
    } as ClientGoals,
  });

  const isEditing = !!client;

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        segment: client.segment || '',
        temperature: client.temperature || 'morno',
        budget: client.budget || '',
        notes: client.notes || '',
        goals: {
          respostas: client.goals?.respostas || 0,
          reunioes: client.goals?.reunioes || 0,
          vendas: client.goals?.vendas || 0,
          faturamento: client.goals?.faturamento || 0,
        },
      });
    } else {
      // Reset form for new client
      setFormData({
        name: '',
        segment: '',
        temperature: 'morno',
        budget: '',
        notes: '',
        goals: {
          respostas: 0,
          reunioes: 0,
          vendas: 0,
          faturamento: 0,
        },
      });
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      segment: formData.segment || undefined,
      temperature: formData.temperature,
      budget: formData.budget || undefined,
      notes: formData.notes || undefined,
      goals: formData.goals,
    };

    await onSave(data);
  };

  const handleGoalChange = (field: keyof ClientGoals, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      goals: {
        ...prev.goals,
        [field]: numValue,
      },
    }));
  };

  const selectedTemperature = temperatureOptions.find(t => t.value === formData.temperature);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do cliente.' : 'Preencha os dados para criar um novo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cliente *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da empresa ou cliente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="segment">Segmento</Label>
                <Select
                  value={formData.segment}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, segment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentOptions.map((segment) => (
                      <SelectItem key={segment} value={segment}>
                        {segment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura</Label>
                <Select
                  value={formData.temperature}
                  onValueChange={(value: 'frio' | 'morno' | 'quente') => 
                    setFormData(prev => ({ ...prev, temperature: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {selectedTemperature && (
                        <Badge className={selectedTemperature.color}>
                          {selectedTemperature.label}
                        </Badge>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {temperatureOptions.map((temp) => (
                      <SelectItem key={temp.value} value={temp.value}>
                        <Badge className={temp.color}>
                          {temp.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Faixa de Faturamento</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="Ex: 50-100k, 1-5M"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações sobre o cliente..."
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Metas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Metas</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="respostas" className="text-sm">
                  Respostas
                </Label>
                <Input
                  id="respostas"
                  type="number"
                  min="0"
                  value={formData.goals.respostas || ''}
                  onChange={(e) => handleGoalChange('respostas', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reunioes" className="text-sm">
                  Reuniões
                </Label>
                <Input
                  id="reunioes"
                  type="number"
                  min="0"
                  value={formData.goals.reunioes || ''}
                  onChange={(e) => handleGoalChange('reunioes', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendas" className="text-sm">
                  Vendas
                </Label>
                <Input
                  id="vendas"
                  type="number"
                  min="0"
                  value={formData.goals.vendas || ''}
                  onChange={(e) => handleGoalChange('vendas', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faturamento" className="text-sm">
                  Faturamento (R$)
                </Label>
                <Input
                  id="faturamento"
                  type="number"
                  min="0"
                  value={formData.goals.faturamento || ''}
                  onChange={(e) => handleGoalChange('faturamento', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="bg-gradient-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

