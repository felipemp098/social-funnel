import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  Info,
  Loader2
} from "lucide-react";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  passwordsMatch: boolean;
}

export default function SegurancaTab() {
  const { user } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSocialLogin, setIsSocialLogin] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [formData, setFormData] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [validation, setValidation] = useState<PasswordValidation>({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
    passwordsMatch: false
  });

  // Verificar se é login social
  useEffect(() => {
    const checkLoginType = async () => {
      if (!user) return;
      
      // Verificar se o usuário tem senha definida (não é social login)
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Erro ao verificar tipo de login:', error);
        return;
      }

      // Se não tem identities ou só tem email, é login normal
      // Se tem providers como google, github, etc., é social
      const socialProviders = data.user?.identities?.filter(
        identity => identity.provider !== 'email'
      );
      
      setIsSocialLogin(socialProviders && socialProviders.length > 0);
    };

    checkLoginType();
  }, [user]);

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
      formData.currentPassword.length > 0 &&
      validation.minLength &&
      validation.hasLetter &&
      validation.hasNumber &&
      validation.passwordsMatch
    );
  };

  const handlePasswordChange = async () => {
    if (!isFormValid()) return;

    setIsChangingPassword(true);
    try {
      console.log('🔐 Iniciando alteração de senha...');
      
      // Adicionar timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na alteração de senha')), 10000)
      );
      
      const updatePromise = supabase.auth.updateUser({
        password: formData.newPassword
      });
      
      console.log('⏰ Atualizando senha com timeout...');
      
      // Race entre update e timeout
      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (error) {
        if (error.message.includes('Invalid login credentials') || 
            error.message.includes('current password')) {
          toast.error("Senha atual incorreta");
        } else if (error.message.includes('Timeout')) {
          toast.error("Timeout na alteração de senha. Tente novamente.");
        } else {
          throw error;
        }
        return;
      }

      console.log('✅ Senha alterada com sucesso');

      // Marcar que não é mais primeiro login (usando timeout para evitar conflitos)
      setTimeout(async () => {
        try {
          await supabase
            .from('app_users')
            .update({ 
              first_login: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', user?.id);
          console.log('✅ Status first_login atualizado');
        } catch (updateError) {
          console.warn('⚠️ Erro ao atualizar first_login:', updateError);
        }
      }, 2000);

      // Limpar formulário IMEDIATAMENTE
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      // Mostrar sucesso IMEDIATAMENTE
      toast.success("Senha alterada com sucesso!");
      
      // Forçar finalização do loading
      setIsChangingPassword(false);
      
    } catch (error) {
      console.error('❌ Erro ao alterar senha:', error);
      toast.error("Erro ao alterar senha. Tente novamente.");
      setIsChangingPassword(false);
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
        <CheckCircle className="w-4 h-4 text-success" />
      ) : (
        <XCircle className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={isValid ? "text-success" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );

  if (isSocialLogin) {
    return (
      <div className="space-y-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Segurança da Conta</h3>
          </div>

          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="w-4 h-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              Sua conta utiliza login social (Google, GitHub, etc.). 
              A alteração de senha deve ser feita através do provedor de autenticação.
            </AlertDescription>
          </Alert>

          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/30">
            <h4 className="font-medium text-foreground mb-2">Informações da Conta</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• E-mail: {user?.email}</p>
              <p>• Tipo de login: Social/OAuth</p>
              <p>• Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Alterar Senha</h3>
        </div>

        <div className="space-y-6">
          {/* Senha Atual */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
              Senha atual *
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                placeholder="Digite sua senha atual"
                className="bg-background/50 border-border/50 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                onClick={() => togglePasswordVisibility('current')}
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium text-foreground">
              Nova senha *
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                placeholder="Digite sua nova senha"
                className="bg-background/50 border-border/50 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
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

          {/* Confirmar Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              Confirmar nova senha *
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirme sua nova senha"
                className="bg-background/50 border-border/50 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
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
          {formData.newPassword.length > 0 && (
            <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Requisitos da senha:
              </h4>
              <div className="space-y-2">
                <ValidationItem 
                  isValid={validation.minLength}
                  text="Pelo menos 8 caracteres"
                />
                <ValidationItem 
                  isValid={validation.hasLetter}
                  text="Pelo menos 1 letra"
                />
                <ValidationItem 
                  isValid={validation.hasNumber}
                  text="Pelo menos 1 número"
                />
                <ValidationItem 
                  isValid={validation.passwordsMatch}
                  text="Senhas coincidem"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end pt-4 border-t border-border/50">
            <Button
              onClick={handlePasswordChange}
              disabled={!isFormValid() || isChangingPassword}
              className="bg-gradient-primary hover:scale-105 transition-transform"
            >
              {isChangingPassword ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Alterar Senha
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Informações de Segurança */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Informações de Segurança</h3>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>• Sua senha é criptografada e armazenada com segurança</p>
          <p>• Recomendamos usar uma senha forte e única</p>
          <p>• Altere sua senha regularmente para manter a segurança</p>
          <p>• Nunca compartilhe suas credenciais com terceiros</p>
        </div>
      </GlassCard>
    </div>
  );
}



