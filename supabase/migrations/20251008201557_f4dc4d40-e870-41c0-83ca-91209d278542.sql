-- Função para reverter saída de produto ao deletar
CREATE OR REPLACE FUNCTION public.handle_product_exit_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.products
  SET quantidade = quantidade + OLD.quantidade
  WHERE id = OLD.produto_id;
  RETURN OLD;
END;
$function$;

-- Função para ajustar estoque ao editar saída
CREATE OR REPLACE FUNCTION public.handle_product_exit_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Reverte a quantidade antiga
  UPDATE public.products
  SET quantidade = quantidade + OLD.quantidade - NEW.quantidade
  WHERE id = NEW.produto_id;
  RETURN NEW;
END;
$function$;

-- Trigger para reverter estoque ao deletar saída
CREATE TRIGGER product_exit_delete_trigger
  AFTER DELETE ON public.product_exits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_exit_delete();

-- Trigger para ajustar estoque ao editar saída
CREATE TRIGGER product_exit_update_trigger
  AFTER UPDATE ON public.product_exits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_exit_update();