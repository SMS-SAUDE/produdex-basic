-- Criar enum para tipos de unidade
CREATE TYPE public.unit_type AS ENUM ('unidade', 'kg', 'litro', 'caixa', 'pacote');

-- Criar enum para status do produto
CREATE TYPE public.product_status AS ENUM ('disponivel', 'baixo_estoque', 'fora_de_estoque');

-- Criar enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Tabela de locais de armazenamento
CREATE TABLE public.storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de produtos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto TEXT NOT NULL,
  marca TEXT NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 0,
  unidade unit_type DEFAULT 'unidade',
  validade DATE,
  valor NUMERIC(10,2),
  local_id UUID REFERENCES public.storage_locations(id),
  status product_status DEFAULT 'disponivel',
  estoque_minimo NUMERIC(10,2) DEFAULT 10,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de notas fiscais
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  data DATE NOT NULL,
  local_id UUID REFERENCES public.storage_locations(id),
  valor_total NUMERIC(10,2),
  xml_file_path TEXT,
  pdf_file_path TEXT,
  qr_code TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de entradas de produtos
CREATE TABLE public.product_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia DATE NOT NULL DEFAULT CURRENT_DATE,
  produto_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id),
  quantidade NUMERIC(10,2) NOT NULL,
  local_id UUID REFERENCES public.storage_locations(id),
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de saídas de produtos
CREATE TABLE public.product_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia DATE NOT NULL DEFAULT CURRENT_DATE,
  produto_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantidade NUMERIC(10,2) NOT NULL,
  local_id UUID REFERENCES public.storage_locations(id),
  motivo TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de lista de compras
CREATE TABLE public.shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto TEXT NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL,
  unidade unit_type DEFAULT 'unidade',
  prioridade TEXT DEFAULT 'media',
  comprado BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id
    AND role = 'admin'
  );
$$;

-- RLS Policies para profiles
CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies para user_roles (apenas admins)
CREATE POLICY "Admins podem ver todos os roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies para storage_locations
CREATE POLICY "Usuários autenticados podem ver locais"
  ON public.storage_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem inserir locais"
  ON public.storage_locations FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar locais"
  ON public.storage_locations FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar locais"
  ON public.storage_locations FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies para products
CREATE POLICY "Usuários autenticados podem ver produtos"
  ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem inserir produtos"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar produtos"
  ON public.products FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar produtos"
  ON public.products FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies para invoices
CREATE POLICY "Usuários autenticados podem ver notas fiscais"
  ON public.invoices FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem inserir notas fiscais"
  ON public.invoices FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar notas fiscais"
  ON public.invoices FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar notas fiscais"
  ON public.invoices FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies para product_entries
CREATE POLICY "Usuários autenticados podem ver entradas"
  ON public.product_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem inserir entradas"
  ON public.product_entries FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar entradas"
  ON public.product_entries FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar entradas"
  ON public.product_entries FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies para product_exits
CREATE POLICY "Usuários autenticados podem ver saídas"
  ON public.product_exits FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem inserir saídas"
  ON public.product_exits FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar saídas"
  ON public.product_exits FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar saídas"
  ON public.product_exits FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies para shopping_list
CREATE POLICY "Usuários autenticados podem ver lista de compras"
  ON public.shopping_list FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir na lista"
  ON public.shopping_list FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar lista"
  ON public.shopping_list FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar da lista"
  ON public.shopping_list FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at em products
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para atualizar status do produto baseado na quantidade
CREATE OR REPLACE FUNCTION public.update_product_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quantidade <= 0 THEN
    NEW.status = 'fora_de_estoque';
  ELSIF NEW.quantidade <= NEW.estoque_minimo THEN
    NEW.status = 'baixo_estoque';
  ELSE
    NEW.status = 'disponivel';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_quantity_change
  BEFORE INSERT OR UPDATE OF quantidade ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_product_status();

-- Trigger para atualizar quantidade do produto após entrada
CREATE OR REPLACE FUNCTION public.handle_product_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products
  SET quantidade = quantidade + NEW.quantidade
  WHERE id = NEW.produto_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_entry_inserted
  AFTER INSERT ON public.product_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_product_entry();

-- Trigger para atualizar quantidade do produto após saída
CREATE OR REPLACE FUNCTION public.handle_product_exit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.products
  SET quantidade = quantidade - NEW.quantidade
  WHERE id = NEW.produto_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_exit_inserted
  AFTER INSERT ON public.product_exits
  FOR EACH ROW EXECUTE FUNCTION public.handle_product_exit();

-- Inserir locais padrão
INSERT INTO public.storage_locations (name, description) VALUES
  ('Almoxarifado', 'Local principal de armazenamento'),
  ('Cozinha', 'Área de cozinha'),
  ('Depósito', 'Depósito geral'),
  ('Supermercado', 'Recebimento de compras');

-- Criar bucket de storage para documentos
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- RLS para bucket de invoices
CREATE POLICY "Usuários autenticados podem ver arquivos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem fazer upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoices' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar arquivos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'invoices' AND public.is_admin(auth.uid()));