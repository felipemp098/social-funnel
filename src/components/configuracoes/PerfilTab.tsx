import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  Phone, 
  Camera,
  Save,
  X,
  Loader2
} from "lucide-react";

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
}

export default function PerfilTab() {
  const { user, appUser, refreshAppUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [formData, setFormData] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: ""
  });

  const [originalData, setOriginalData] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: ""
  });

  // Carregar dados do perfil
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Buscar dados do perfil do auth.users
        const { data: authUser, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Erro ao buscar dados do usuário:', authError);
          toast.error("Erro ao carregar dados do perfil");
          return;
        }

        // Buscar dados do profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();

        // Se não encontrou profile, criar um básico
        if (profileError && profileError.code === 'PGRST116') {
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: authUser.user?.user_metadata?.full_name || authUser.user?.email || ""
            });
        }

        const userData = {
          name: profileData?.full_name || authUser.user?.user_metadata?.full_name || "",
          email: authUser.user?.email || "",
          phone: profileData?.phone || authUser.user?.user_metadata?.phone || ""
        };

        setFormData(userData);
        setOriginalData(userData);
        
      } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        toast.error("Erro ao carregar dados do perfil");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Verificar se houve mudanças
  useEffect(() => {
    const changed = Object.keys(formData).some(
      key => formData[key as keyof ProfileForm] !== originalData[key as keyof ProfileForm]
    );
    setHasChanges(changed);
  }, [formData, originalData]);

  const handleInputChange = (field: keyof ProfileForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user || !hasChanges) return;

    // Validações
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (formData.name.trim().length < 2 || formData.name.trim().length > 80) {
      toast.error("Nome deve ter entre 2 e 80 caracteres");
      return;
    }

    setIsSaving(true);
    try {
      // Atualizar na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        throw profileError;
      }

      // REMOVIDO: Atualização do auth.users para evitar loops com triggers
      // A sincronização será feita apenas via tabela profiles
      // Se necessário, o trigger pode sincronizar de volta para auth.users

      // Atualizar dados locais
      setOriginalData(formData);
      setHasChanges(false);
      
      // Refresh user data
      await refreshAppUser();
      
      toast.success("Perfil atualizado com sucesso!");
      
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast.error("Erro ao salvar perfil. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setHasChanges(false);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara brasileira
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phone', formatted);
  };

  // Gerar iniciais para o avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-semibold">
                {getInitials(formData.name || "User")}
              </AvatarFallback>
            </Avatar>
            
            <Button
              size="icon"
              variant="outline"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border-border/50"
              disabled
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {formData.name || "Nome não definido"}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">{formData.email}</p>
            <p className="text-xs text-muted-foreground">
              Papel: <span className="capitalize font-medium">{appUser?.role || "user"}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2 opacity-60">
              Foto do perfil será implementada em versão futura
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Form Section */}
      <GlassCard className="p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Informações Pessoais</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Nome completo *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Digite seu nome completo"
                className="bg-background/50 border-border/50"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/80 caracteres
              </p>
            </div>

            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  value={formData.email}
                  readOnly
                  className="bg-muted/50 border-border/50 cursor-not-allowed"
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                E-mail não pode ser alterado
              </p>
            </div>

            {/* Telefone */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Telefone
              </Label>
              <div className="relative max-w-sm">
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="bg-background/50 border-border/50 pl-10"
                  maxLength={15}
                />
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Formato: (DD) 9XXXX-XXXX
              </p>
            </div>
          </div>

          {/* Actions */}
          {hasChanges && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="bg-background/50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-primary hover:scale-105 transition-transform"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
