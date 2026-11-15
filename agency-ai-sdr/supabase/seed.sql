-- =============================================================================
-- DADOS DEMONSTRATIVOS — TOTALMENTE FICTÍCIOS
-- * Todos os registros têm source = 'demo' e is_demo = true.
-- * Nomes começam com "[DEMO]" e não correspondem a empresas reais.
-- * Telefones usam DDD inexistente (00) e NÃO possuem phone_e164: impossível contatar.
-- * O banco força contact_status = 'demo' para estes leads (constraint + trigger).
-- Para remover: delete from public.companies where is_demo;
-- =============================================================================

insert into public.companies
  (source, is_demo, name, primary_category, category_label, types, formatted_address, city, state,
   phone_national, website_uri, website_status, business_status, rating, user_rating_count, notes)
values
  ('demo', true, '[DEMO] Salão Fictício Bela Arte', 'beauty_salon', 'Salão de beleza', '{beauty_salon}',
   'Rua Fictícia, 100 — Centro (endereço fictício)', 'Sant''Ana do Livramento', 'RS',
   '(00) 90000-0001', null, 'not_identified', 'OPERATIONAL', 4.7, 86, 'Registro demonstrativo fictício.'),
  ('demo', true, '[DEMO] Oficina Exemplo Motores', 'car_repair', 'Oficina mecânica', '{car_repair}',
   'Av. Exemplo, 200 (endereço fictício)', 'Sant''Ana do Livramento', 'RS',
   '(00) 3000-0002', 'https://instagram.com/exemplo_demo', 'social_only', 'OPERATIONAL', 4.4, 31, 'Registro demonstrativo fictício.'),
  ('demo', true, '[DEMO] Padaria Modelo', 'bakery', 'Padaria', '{bakery}',
   'Rua Modelo, 300 (endereço fictício)', 'Sant''Ana do Livramento', 'RS',
   '(00) 90000-0003', 'https://padaria-modelo.example', 'identified', 'OPERATIONAL', 4.1, 12, 'Registro demonstrativo fictício.'),
  ('demo', true, '[DEMO] Clínica Sorriso Teste', 'dentist', 'Dentista', '{dentist}',
   'Rua Teste, 400 (endereço fictício)', 'Sant''Ana do Livramento', 'RS',
   null, null, 'not_identified', 'OPERATIONAL', null, 0, 'Registro demonstrativo fictício (sem telefone).'),
  ('demo', true, '[DEMO] Loja Amostra Moda', 'clothing_store', 'Loja de roupas', '{clothing_store}',
   'Rua Amostra, 500 (endereço fictício)', 'Sant''Ana do Livramento', 'RS',
   '(00) 90000-0005', null, 'verified_none', 'OPERATIONAL', 4.9, 140, 'Registro demonstrativo fictício.')
on conflict do nothing;
