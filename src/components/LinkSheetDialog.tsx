import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, Link, Save, X, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Client, LinkSheetData } from '@/hooks/useClients';

interface LinkSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSave: (data: LinkSheetData) => Promise<boolean>;
  onUnlink?: () => Promise<boolean>;
  loading?: boolean;
}

const commonMappings = [
  { label: 'Nome', value: 'nome' },
  { label: 'Email', value: 'email' },
  { label: 'Telefone', value: 'telefone' },
  { label: 'Empresa', value: 'empresa' },
  { label: 'Cargo', value: 'cargo' },
  { label: 'Status', value: 'status' },
  { label: 'Temperatura', value: 'temperatura' },
  { label: 'Data de Contato', value: 'dataContato' },
  { label: 'Próximo Follow-up', value: 'proximoFollowUp' },
  { label: 'Valor do Negócio', value: 'valorNegocio' },
  { label: 'Probabilidade', value: 'probabilidade' },
  { label: 'Observações', value: 'observacoes' },
];

export function LinkSheetDialog({ 
  open, 
  onOpenChange, 
  client, 
  onSave, 
  onUnlink, 
  loading = false 
}: LinkSheetDialogProps) {
  const [formData, setFormData] = useState({
    sheet_url: '',
    sheet_tab: '',
    sheet_mapping: {} as Record<string, string>,
  });

  const [mappingEntries, setMappingEntries] = useState<Array<{ column: string; field: string }>>([]);

  const isLinked = client?.sheet_status !== 'not_linked' && client?.sheet_url;

  useEffect(() => {
    if (client && isLinked) {
      setFormData({
        sheet_url: client.sheet_url || '',
        sheet_tab: client.sheet_tab || '',
        sheet_mapping: client.sheet_mapping || {},
      });

      // Convert mapping object to array for editing
      const entries = Object.entries(client.sheet_mapping || {}).map(([column, field]) => ({
        column,
        field,
      }));
      setMappingEntries(entries.length > 0 ? entries : [{ column: '', field: '' }]);
    } else {
      setFormData({
        sheet_url: '',
        sheet_tab: 'Prospecções',
        sheet_mapping: {},
      });
      setMappingEntries([{ column: '', field: '' }]);
    }
  }, [client, open, isLinked]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert mapping entries back to object
    const mapping = mappingEntries.reduce((acc, entry) => {
      if (entry.column.trim() && entry.field.trim()) {
        acc[entry.column.trim()] = entry.field.trim();
      }
      return acc;
    }, {} as Record<string, string>);

    const data: LinkSheetData = {
      sheet_url: formData.sheet_url,
      sheet_tab: formData.sheet_tab.trim() || undefined,
      sheet_mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
    };

    console.log('📤 Enviando dados para link_client_sheet:', data);

    const success = await onSave(data);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleUnlink = async () => {
    if (onUnlink) {
      const success = await onUnlink();
      if (success) {
        onOpenChange(false);
      }
    }
  };

  const addMappingEntry = () => {
    setMappingEntries(prev => [...prev, { column: '', field: '' }]);
  };

  const removeMappingEntry = (index: number) => {
    setMappingEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateMappingEntry = (index: number, field: 'column' | 'field', value: string) => {
    setMappingEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  const getStatusBadge = () => {
    if (!client?.sheet_status || client.sheet_status === 'not_linked') {
      return null;
    }

    const statusConfig = {
      'linked_pending': { 
        icon: AlertCircle, 
        label: 'Aguardando Sync', 
        color: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/30' 
      },
      'linked_warn': { 
        icon: AlertCircle, 
        label: 'Com Alertas', 
        color: 'bg-orange-500/10 text-orange-400 border-orange-400/30' 
      },
      'linked_ok': { 
        icon: CheckCircle, 
        label: 'Sincronizado', 
        color: 'bg-green-500/10 text-green-400 border-green-400/30' 
      },
    };

    const config = statusConfig[client.sheet_status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const isValidGoogleSheetsUrl = (url: string) => {
    return url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sheet className="w-5 h-5" />
            {isLinked ? 'Gerenciar Planilha' : 'Vincular Planilha Google Sheets'}
          </DialogTitle>
          <DialogDescription>
            {isLinked ? 'Gerencie a planilha vinculada ao cliente.' : 'Conecte uma planilha do Google Sheets para sincronizar dados automaticamente.'}
          </DialogDescription>
          {client && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Cliente: {client.name}</span>
              {getStatusBadge()}
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL da Planilha */}
          <div className="space-y-2">
            <Label htmlFor="sheet_url">
              URL da Planilha Google Sheets *
            </Label>
            <Input
              id="sheet_url"
              value={formData.sheet_url}
              onChange={(e) => setFormData(prev => ({ ...prev, sheet_url: e.target.value }))}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Cole aqui o link da sua planilha do Google Sheets
            </p>
            {formData.sheet_url && !isValidGoogleSheetsUrl(formData.sheet_url) && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                URL deve ser uma planilha válida do Google Sheets
              </p>
            )}
          </div>

          {/* Aba da Planilha */}
          <div className="space-y-2">
            <Label htmlFor="sheet_tab">
              Nome da Aba (opcional)
            </Label>
            <Input
              id="sheet_tab"
              value={formData.sheet_tab}
              onChange={(e) => setFormData(prev => ({ ...prev, sheet_tab: e.target.value }))}
              placeholder="Prospecções"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Se não especificado, usará a primeira aba da planilha
            </p>
          </div>

          <Separator />

          {/* Mapeamento de Colunas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Mapeamento de Colunas</h3>
                <p className="text-sm text-muted-foreground">
                  Configure como as colunas da planilha correspondem aos campos do sistema
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMappingEntry}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-3">
              {mappingEntries.map((entry, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Nome da coluna na planilha"
                      value={entry.column}
                      onChange={(e) => updateMappingEntry(index, 'column', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="flex items-center text-muted-foreground">
                    <Link className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      placeholder="Campo do sistema"
                      value={entry.field}
                      onChange={(e) => updateMappingEntry(index, 'field', e.target.value)}
                      disabled={loading}
                      list={`mapping-options-${index}`}
                    />
                    <datalist id={`mapping-options-${index}`}>
                      {commonMappings.map((mapping) => (
                        <option key={mapping.value} value={mapping.value}>
                          {mapping.label}
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {mappingEntries.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMappingEntry(index)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Campos Sugeridos:</h4>
              <div className="flex flex-wrap gap-2">
                {commonMappings.map((mapping) => (
                  <Badge key={mapping.value} variant="outline" className="text-xs">
                    {mapping.label} → {mapping.value}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div>
              {isLinked && onUnlink && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleUnlink}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Desvincular Planilha
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !formData.sheet_url.trim() || !isValidGoogleSheetsUrl(formData.sheet_url)}
                className="bg-gradient-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Salvando...' : isLinked ? 'Atualizar Vinculação' : 'Vincular Planilha'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
