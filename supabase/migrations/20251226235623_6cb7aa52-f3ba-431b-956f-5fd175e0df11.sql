-- Criar tabela para configurações da organização
CREATE TABLE public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  secretary_name TEXT,
  coordinator_name TEXT,
  developer_name TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - todos autenticados podem ver
CREATE POLICY "Usuários autenticados podem ver configurações"
ON public.organization_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Apenas admins podem modificar
CREATE POLICY "Admins podem inserir configurações"
ON public.organization_settings
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar configurações"
ON public.organization_settings
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar configurações"
ON public.organization_settings
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_organization_settings_updated_at
BEFORE UPDATE ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Criar bucket para logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Políticas de storage para logos
CREATE POLICY "Logos são públicos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Admins podem fazer upload de logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logos' AND is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logos' AND is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'logos' AND is_admin(auth.uid()));