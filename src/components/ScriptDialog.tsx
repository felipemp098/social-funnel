import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { X, Plus, Hash } from 'lucide-react';
import { toast } from 'sonner';
import type { CreateScriptForm, ScriptVisibility } from '@/integrations/supabase/types';
import type { ScriptWithOwner } from '@/hooks/useScripts';

interface ScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script?: ScriptWithOwner | null;
  onSubmit: (data: CreateScriptForm) => Promise<boolean>;
  loading?: boolean;
}

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Privado', description: 'Apenas você pode ver' },
  { value: 'public', label: 'Público', description: 'Você e sua hierarquia podem ver' }
] as const;

export function ScriptDialog({ open, onOpenChange, script, onSubmit, loading = false }: ScriptDialogProps) {
  const [formData, setFormData] = useState<CreateScriptForm>({
    title: '',
    tags: [],
    content: '',
    visibility: 'private'
  });
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Resetar formulário quando o dialog abrir/fechar ou script mudar
  useEffect(() => {
    if (open) {
      if (script) {
        setFormData({
          title: script.title,
          tags: script.tags || [],
          content: script.content,
          visibility: script.visibility
        });
      } else {
        setFormData({
          title: '',
          tags: [],
          content: '',
          visibility: 'private'
        });
      }
      setNewTag('');
      setErrors({});
    }
  }, [open, script]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (formData.title.length > 200) {
      newErrors.title = 'Título deve ter no máximo 200 caracteres';
    }

    if (formData.content.length > 5000) {
      newErrors.content = 'Conteúdo deve ter no máximo 5000 caracteres';
    }

    if (formData.tags.length > 10) {
      newErrors.tags = 'Máximo de 10 tags permitidas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const success = await onSubmit(formData);
    if (success) {
      onOpenChange(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      if (formData.tags.length >= 10) {
        toast.error('Máximo de 10 tags permitidas');
        return;
      }
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      addTag();
    }
  };

  const getVisibilityColor = (visibility: ScriptVisibility) => {
    switch (visibility) {
      case 'private':
        return 'bg-muted text-muted-foreground';
      case 'public':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {script ? 'Editar Script' : 'Criar Novo Script'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Script de Prospecção LinkedIn"
              className={errors.title ? 'border-destructive' : ''}
              maxLength={200}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/200 caracteres
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Adicionar tag..."
                onKeyPress={handleKeyPress}
                maxLength={20}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                disabled={!newTag.trim() || formData.tags.includes(newTag.trim())}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="flex items-center gap-1 bg-secondary/20 text-secondary border-secondary/30"
                  >
                    <Hash className="w-3 h-3" />
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            
            {errors.tags && (
              <p className="text-sm text-destructive">{errors.tags}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.tags.length}/10 tags • Use tags para categorizar seus scripts
            </p>
          </div>

          {/* Visibilidade */}
          <div className="space-y-2">
            <Label>Visibilidade</Label>
            <Select
              value={formData.visibility}
              onValueChange={(value: ScriptVisibility) => 
                setFormData(prev => ({ ...prev, visibility: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={getVisibilityColor(option.value as ScriptVisibility)}>
                        {option.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conteúdo */}
          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo do Script</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Digite o conteúdo do seu script aqui...

Dica: Use variáveis como {{nome}}, {{empresa}}, {{produto}} para personalizar suas mensagens."
              className={`min-h-[200px] ${errors.content ? 'border-destructive' : ''}`}
              maxLength={5000}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.content.length}/5000 caracteres
            </p>
          </div>

          {/* Dicas */}
          <div className="bg-muted/30 rounded-lg p-4 border border-border/30">
            <h4 className="font-medium text-sm mb-2">💡 Dicas para criar scripts eficazes:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Use variáveis como {`{{nome}}`} e {`{{empresa}}`} para personalização</li>
              <li>• Seja claro e objetivo no seu objetivo</li>
              <li>• Inclua uma call-to-action clara</li>
              <li>• Mantenha o tom profissional mas amigável</li>
            </ul>
          </div>

          <DialogFooter>
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
              className="bg-gradient-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : (script ? 'Atualizar Script' : 'Criar Script')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
