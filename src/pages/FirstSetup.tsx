import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Crown, CheckCircle, AlertCircle } from 'lucide-react';

export default function FirstSetup() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user, refreshAppUser } = useAuth();
  const { toast } = useToast();

  const handlePromoteToAdmin = async () => {
    if (!user?.email) {
      toast({
        title: 'Erro',
        description: 'Usuário não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔧 Promovendo usuário a admin:', user.email, user.id);
      
      // Método direto: inserir/atualizar diretamente na tabela app_users
      const { data, error } = await supabase
        .from('app_users')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'admin',
          created_by: null, // Admin não tem criador
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Erro ao promover a admin:', error);
        throw error;
      }

      console.log('✅ Usuário promovido com sucesso');
      setSuccess(true);
      toast({
        title: 'Sucesso!',
        description: 'Você foi promovido a administrador.',
      });
      
      // Aguardar um pouco mais para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Atualizar dados do usuário
      console.log('🔄 Atualizando dados do usuário...');
      await refreshAppUser();
      
      // Aguardar mais um pouco para o refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirecionar após alguns segundos
      setTimeout(() => {
        console.log('🔄 Redirecionando para dashboard...');
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao promover usuário:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao promover usuário a administrador.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <GlassCard className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Configuração Concluída!
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Você foi promovido a administrador com sucesso. Redirecionando para o dashboard...
          </p>
          
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <GlassCard className="max-w-md w-full text-center p-8">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Crown className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Configuração Inicial
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Parece que você é o primeiro usuário do sistema. Clique no botão abaixo para se tornar o administrador principal.
        </p>
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                Importante
              </p>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                Esta ação só pode ser feita uma vez e dará a você acesso total ao sistema. 
                Certifique-se de que esta é a conta correta.
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground mb-6">
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>ID:</strong> {user?.id?.substring(0, 8)}...</p>
        </div>
        
        <Button 
          onClick={handlePromoteToAdmin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Configurando...
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 mr-2" />
              Tornar-se Administrador
            </>
          )}
        </Button>
      </GlassCard>
    </div>
  );
}
