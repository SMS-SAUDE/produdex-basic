-- Adicionar role de admin para o usuário atual
INSERT INTO public.user_roles (user_id, role)
VALUES ('96750d01-cc5b-49e3-92d1-aa1559d7caee', 'admin')
ON CONFLICT DO NOTHING;