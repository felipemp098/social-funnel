import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlassCard } from '@/components/ui/glass-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  X,
  User,
  Building,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { type ProspectDrilldown } from '@/integrations/supabase/client';
import { dashboardUtils } from '@/hooks/useDashboard';

interface DashboardDrilldownProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: ProspectDrilldown[];
  loading: boolean;
  error: string | null;
}

export function DashboardDrilldown({
  open,
  onClose,
  title,
  data,
  loading,
  error,
}: DashboardDrilldownProps) {
  const [selectedProspect, setSelectedProspect] = useState<ProspectDrilldown | null>(null);

  const handleProspectClick = (prospect: ProspectDrilldown) => {
    setSelectedProspect(prospect);
  };

  const handleCloseDetails = () => {
    setSelectedProspect(null);
  };

  return (
    <>
      {/* Dialog principal com lista */}
      <Dialog open={open && !selectedProspect} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Lista detalhada dos prospects que compõem esta métrica
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-6 w-[80px]" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={onClose} variant="outline">
                  Fechar
                </Button>
              </div>
            )}

            {!loading && !error && data.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum prospect encontrado para esta métrica
                </p>
                <Button onClick={onClose} variant="outline">
                  Fechar
                </Button>
              </div>
            )}

            {!loading && !error && data.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Temperatura</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((prospect) => (
                    <TableRow
                      key={prospect.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleProspectClick(prospect)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{prospect.contact_name}</p>
                          {prospect.closer && (
                            <p className="text-sm text-muted-foreground">
                              Closer: {prospect.closer}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {prospect.company || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prospect.segment || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prospect.temperature && (
                          <Badge
                            variant="outline"
                            className={dashboardUtils.getTemperatureColor(prospect.temperature)}
                          >
                            {dashboardUtils.getTemperatureEmoji(prospect.temperature)}{' '}
                            {prospect.temperature}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={dashboardUtils.getStatusColor(prospect.status)}
                        >
                          {dashboardUtils.translateStatus(prospect.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {prospect.deal_value ? (
                          <span className="font-medium">
                            {dashboardUtils.formatCurrency(prospect.deal_value)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(prospect.date_prospect).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProspectClick(prospect);
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes do prospect */}
      <Dialog open={!!selectedProspect} onOpenChange={handleCloseDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Detalhes do Prospect
            </DialogTitle>
            <DialogDescription>
              Informações completas do prospect selecionado
            </DialogDescription>
          </DialogHeader>

          {selectedProspect && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6">
                {/* Informações básicas */}
                <GlassCard>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Informações Básicas
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Nome do Contato
                        </label>
                        <p className="text-foreground">{selectedProspect.contact_name}</p>
                      </div>
                      
                      {selectedProspect.company && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Empresa
                          </label>
                          <p className="text-foreground flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {selectedProspect.company}
                          </p>
                        </div>
                      )}
                      
                      {selectedProspect.segment && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Segmento
                          </label>
                          <p className="text-foreground">{selectedProspect.segment}</p>
                        </div>
                      )}
                      
                      {selectedProspect.source && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Origem
                          </label>
                          <Badge variant="outline">
                            {selectedProspect.source === 'inbound' ? 'Inbound' : 'Outbound'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Status e classificação */}
                <GlassCard>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Status e Classificação</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Status Atual
                        </label>
                        <Badge
                          variant="outline"
                          className={dashboardUtils.getStatusColor(selectedProspect.status)}
                        >
                          {dashboardUtils.translateStatus(selectedProspect.status)}
                        </Badge>
                      </div>
                      
                      {selectedProspect.temperature && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Temperatura
                          </label>
                          <Badge
                            variant="outline"
                            className={dashboardUtils.getTemperatureColor(selectedProspect.temperature)}
                          >
                            {dashboardUtils.getTemperatureEmoji(selectedProspect.temperature)}{' '}
                            {selectedProspect.temperature}
                          </Badge>
                        </div>
                      )}
                      
                      {selectedProspect.deal_value && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Valor do Negócio
                          </label>
                          <p className="text-foreground font-semibold flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {dashboardUtils.formatCurrency(selectedProspect.deal_value)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Datas importantes */}
                <GlassCard>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Datas Importantes
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Data da Prospecção
                        </label>
                        <p className="text-foreground">
                          {new Date(selectedProspect.date_prospect).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      
                      {selectedProspect.last_contact_date && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Último Contato
                          </label>
                          <p className="text-foreground">
                            {new Date(selectedProspect.last_contact_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Responsável */}
                {selectedProspect.closer && (
                  <GlassCard>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Responsável</h3>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Closer
                        </label>
                        <p className="text-foreground">{selectedProspect.closer}</p>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end">
            <Button onClick={handleCloseDetails} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
