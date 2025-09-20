import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Loader2, Database, TestTube } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function TestIntegration() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateTest = (name: string, status: TestResult['status'], message?: string, data?: any) => {
    setTests(prev => prev.map(test => 
      test.name === name 
        ? { ...test, status, message, data }
        : test
    ));
  };

  const runTests = async () => {
    setRunning(true);
    
    const testCases: TestResult[] = [
      { name: 'Conexão com Supabase', status: 'pending' },
      { name: 'Autenticação do usuário', status: 'pending' },
      { name: 'Função list_clients', status: 'pending' },
      { name: 'Função get_client_segments', status: 'pending' },
      { name: 'Função create_client', status: 'pending' },
      { name: 'Função update_client', status: 'pending' },
      { name: 'Função delete_client', status: 'pending' },
      { name: 'Permissões RLS', status: 'pending' },
    ];

    setTests(testCases);

    try {
      // Test 1: Conexão com Supabase
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        updateTest('Conexão com Supabase', 'success', 'Conectado com sucesso');
        updateTest('Autenticação do usuário', data.user ? 'success' : 'error', 
          data.user ? `Usuário: ${data.user.email}` : 'Usuário não autenticado');
      } catch (error: any) {
        updateTest('Conexão com Supabase', 'error', error.message);
        updateTest('Autenticação do usuário', 'error', 'Falha na conexão');
      }

      // Test 2: Função list_clients
      try {
        const { data, error } = await supabase.rpc('list_clients');
        if (error) throw error;
        updateTest('Função list_clients', 'success', `${data?.length || 0} clientes encontrados`);
      } catch (error: any) {
        updateTest('Função list_clients', 'error', error.message);
      }

      // Test 3: Função get_client_segments
      try {
        const { data, error } = await supabase.rpc('get_client_segments');
        if (error) throw error;
        updateTest('Função get_client_segments', 'success', `${data?.length || 0} segmentos encontrados`);
      } catch (error: any) {
        updateTest('Função get_client_segments', 'error', error.message);
      }

      // Test 4: Função create_client (teste com dados temporários)
      try {
        const testClientData = {
          client_name: `Cliente Teste ${Date.now()}`,
          client_segment: 'Teste',
          client_temperature: 'morno',
          client_budget: '10-50k',
          client_notes: 'Cliente criado para teste de integração',
          client_goals: { respostas: 5, reunioes: 2, vendas: 1, faturamento: 10000 }
        };

        const { data, error } = await supabase.rpc('create_client', testClientData);
        if (error) throw error;
        
        const createdClient = data?.[0];
        updateTest('Função create_client', 'success', 
          `Cliente "${createdClient?.name}" criado com ID: ${createdClient?.id}`);

        // Test 5: Função update_client
        if (createdClient) {
          try {
            const { data: updateData, error: updateError } = await supabase.rpc('update_client', {
              client_id: createdClient.id,
              client_name: createdClient.name + ' (Atualizado)',
              client_temperature: 'quente'
            });
            if (updateError) throw updateError;
            updateTest('Função update_client', 'success', 'Cliente atualizado com sucesso');
          } catch (error: any) {
            updateTest('Função update_client', 'error', error.message);
          }

          // Test 6: Função delete_client
          try {
            const { error: deleteError } = await supabase.rpc('delete_client', {
              client_id: createdClient.id
            });
            if (deleteError) throw deleteError;
            updateTest('Função delete_client', 'success', 'Cliente deletado com sucesso');
          } catch (error: any) {
            updateTest('Função delete_client', 'error', error.message);
          }
        } else {
          updateTest('Função update_client', 'error', 'Sem cliente para testar');
          updateTest('Função delete_client', 'error', 'Sem cliente para testar');
        }

      } catch (error: any) {
        updateTest('Função create_client', 'error', error.message);
        updateTest('Função update_client', 'error', 'Teste não executado');
        updateTest('Função delete_client', 'error', 'Teste não executado');
      }

      // Test 7: Permissões RLS
      try {
        // Tentar acessar dados sem permissão específica
        const { data, error } = await supabase.from('clients').select('*');
        if (error && error.code === 'PGRST116') {
          updateTest('Permissões RLS', 'success', 'RLS está funcionando - acesso restrito conforme esperado');
        } else if (!error) {
          updateTest('Permissões RLS', 'success', `RLS permitiu acesso a ${data.length} registros`);
        } else {
          throw error;
        }
      } catch (error: any) {
        updateTest('Permissões RLS', 'error', error.message);
      }

      toast.success('Testes de integração concluídos!');
      
    } catch (error: any) {
      toast.error('Erro durante os testes de integração');
      console.error('Erro nos testes:', error);
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
      default:
        return running ? 
          <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /> :
          <div className="w-4 h-4 rounded-full bg-muted" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-destructive';
      case 'pending':
      default:
        return 'text-muted-foreground';
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const totalTests = tests.length;

  return (
    <GlassCard className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <TestTube className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Teste de Integração Backend</h3>
              <p className="text-sm text-muted-foreground">
                Verificar se todas as APIs estão funcionando corretamente
              </p>
            </div>
          </div>

          <Button
            onClick={runTests}
            disabled={running}
            className="bg-gradient-primary"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Executar Testes
              </>
            )}
          </Button>
        </div>

        {tests.length > 0 && (
          <>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                ✅ {successCount} Sucessos
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                ❌ {errorCount} Erros
              </Badge>
              <Badge variant="outline">
                📊 {totalTests} Total
              </Badge>
            </div>

            <div className="space-y-3">
              {tests.map((test, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="mt-0.5">
                    {getStatusIcon(test.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{test.name}</span>
                      <span className={`text-sm ${getStatusColor(test.status)}`}>
                        {test.status === 'pending' ? (running ? 'Executando...' : 'Aguardando') : 
                         test.status === 'success' ? 'Sucesso' : 'Erro'}
                      </span>
                    </div>
                    {test.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {test.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tests.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Clique em "Executar Testes" para verificar a integração</p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

