import { AppUser, UserProfile } from '@/integrations/supabase/types';
import { User } from '@supabase/supabase-js';

// Função para obter o nome de exibição de um usuário (formato do header)
export function getDisplayNameFromAuth(
  user?: User | null, 
  appUser?: AppUser | null, 
  userProfile?: UserProfile | null
): string {
  // Prioridade: full_name > display_name > email > fallback
  return (
    userProfile?.full_name ||
    userProfile?.display_name ||
    user?.email ||
    appUser?.email ||
    'Usuário'
  );
}

// Função para obter iniciais do nome de exibição (formato do header)
export function getDisplayInitialsFromAuth(
  user?: User | null, 
  appUser?: AppUser | null, 
  userProfile?: UserProfile | null
): string {
  const displayName = getDisplayNameFromAuth(user, appUser, userProfile);
  
  // Se não houver nome de exibição, retornar fallback
  if (!displayName || displayName.trim() === '') {
    return 'U';
  }
  
  // Se for email, usar as primeiras letras antes do @
  if (displayName.includes('@')) {
    const emailPart = displayName.split('@')[0];
    return emailPart ? emailPart.slice(0, 2).toUpperCase() : 'U';
  }
  
  // Se for nome, usar iniciais das palavras
  return displayName
    .split(' ')
    .filter(word => word && word.trim() !== '') // Filtrar palavras vazias
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'; // Fallback se não houver letras
}

// Função para obter display name de qualquer objeto que tenha email
export function getDisplayNameFromEmail(email: string, profile?: { full_name?: string | null }): string {
  return profile?.full_name || email;
}

// Função para obter iniciais de qualquer email ou nome
export function getInitialsFromEmailOrName(emailOrName: string): string {
  // Se não houver nome ou email, retornar fallback
  if (!emailOrName || emailOrName.trim() === '') {
    return 'U';
  }
  
  // Se for email, usar as primeiras letras antes do @
  if (emailOrName.includes('@')) {
    const emailPart = emailOrName.split('@')[0];
    return emailPart ? emailPart.slice(0, 2).toUpperCase() : 'U';
  }
  
  // Se for nome, usar iniciais das palavras
  return emailOrName
    .split(' ')
    .filter(word => word && word.trim() !== '') // Filtrar palavras vazias
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'; // Fallback se não houver letras
}

// Função específica para objetos com full_name e email (formato da página de usuários)
export function getDisplayName(full_name: string | null, email: string): string {
  return full_name || email;
}

// Função específica para iniciais com full_name e email
export function getDisplayInitials(full_name: string | null, email: string): string {
  const displayName = full_name || email;
  
  // Se não houver nome de exibição, retornar fallback
  if (!displayName || displayName.trim() === '') {
    return 'U';
  }
  
  // Se for email, usar as primeiras letras antes do @
  if (displayName.includes('@')) {
    const emailPart = displayName.split('@')[0];
    return emailPart ? emailPart.slice(0, 2).toUpperCase() : 'U';
  }
  
  // Se for nome, usar iniciais das palavras
  return displayName
    .split(' ')
    .filter(word => word && word.trim() !== '') // Filtrar palavras vazias
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'; // Fallback se não houver letras
}
