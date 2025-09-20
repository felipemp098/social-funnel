-- Execute este script no Supabase Dashboard para corrigir a validação de URL

-- Recriar a função com a expressão regular corrigida
CREATE OR REPLACE FUNCTION public.validate_google_sheets_url(url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Se URL é null, é válido (planilha não vinculada)
  IF url IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar se é uma URL do Google Sheets
  -- Corrigido: colocar o hífen no final para não ser interpretado como range
  RETURN url ~ '^https://docs\.google\.com/spreadsheets/d/[a-zA-Z0-9_-]+';
END;
$$;
