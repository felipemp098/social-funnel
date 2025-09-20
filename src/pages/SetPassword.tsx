import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  Key,
  Loader2
} from 'lucide-react';

interface PasswordForm {
  newPassword: string;
  confirmPassword: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  passwordsMatch: boolean;
}

export default function SetPassword() {
  const { user, refreshAppUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  const [formData, setFormData] = useState<PasswordForm>({
    newPassword: "",
    confirmPassword: ""
  });

  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
    passwordsMatch: false
  });

  // Validar senha em tempo real
  useEffect(() => {
    const newPassword = formData.newPassword;
    const confirmPassword = formData.confirmPassword;

    setValidation({
      minLength: newPassword.length >= 8,
      hasLetter: /[a-zA-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      passwordsMatch: newPassword === confirmPassword && newPassword.length > 0
    });
  }, [formData.newPassword, formData.confirmPassword]);

  const handleInputChange = (field: keyof PasswordForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const isFormValid = () => {
    return (
      validation.minLength &&
      validation.hasLetter &&
      validation.hasNumber &&
      validation.passwordsMatch
    );
  };

  const handleSetPassword = async () => {
    if (!isFormValid() || !user) return;

    setIsLoading(true);
    try {
      console.log('🔐 Definindo nova senha para primeiro acesso...');
      
      // Atualizar senha no Supabase Auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (passwordError) {
        throw passwordError;
      }

      // Marcar que não é mais primeiro login
      const { error: updateError } = await supabase
        .from('app_users')
        .update({ 
          first_login: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.warn('⚠️ Erro ao atualizar first_login:', updateError);
        // Não falhar por isso
      }

      console.log('✅ Senha definida com sucesso');
      
      // Atualizar dados do usuário
      await refreshAppUser();
      
      toast.success("Senha definida com sucesso! Redirecionando...");
      
      // Redirecionar para dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Erro ao definir senha:', error);
      toast.error(error.message || "Erro ao definir senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({ 
    isValid, 
    text 
  }: { 
    isValid: boolean; 
    text: string; 
  }) => (
    <div className="flex items-center gap-2 text-sm">
      {isValid ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={isValid ? "text-green-500" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <GlassCard className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-8 h-8 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Definir Senha
          </h1>
          
          <p className="text-muted-foreground">
            Por segurança, você deve definir uma senha para sua conta.
          </p>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>Importante:</strong> Esta senha será usada em todos os próximos logins.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            <p><strong>Usuário:</strong> {user?.email}</p>
          </div>

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Digite sua nova senha"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('new')}
              >
                {showPasswords.new ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Digite novamente sua senha"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Validações */}
          {formData.newPassword && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium text-foreground">Requisitos da senha:</p>
              <ValidationItem isValid={validation.minLength} text="Pelo menos 8 caracteres" />
              <ValidationItem isValid={validation.hasLetter} text="Pelo menos uma letra" />
              <ValidationItem isValid={validation.hasNumber} text="Pelo menos um número" />
              <ValidationItem isValid={validation.passwordsMatch} text="Senhas coincidem" />
            </div>
          )}

          {/* Botão */}
          <Button 
            onClick={handleSetPassword}
            disabled={!isFormValid() || isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Definindo Senha...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Definir Senha
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
