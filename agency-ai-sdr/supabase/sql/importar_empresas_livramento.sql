-- Agency AI SDR — importação de 391 empresas de Sant'Ana do Livramento (dados públicos do Guia Telefone).
-- Cole inteiro no SQL Editor do Supabase e clique em Run. Duplicadas são ignoradas.
-- Depois: painel → Visão geral → Reanalisar pontuações (gera as notas e os leads).
begin;
insert into public.companies (name, category_label, primary_category, types, formatted_address, city, state, phone_national, phone_e164, website_uri, website_status, notes, source, business_status) values
('Izolina do Carmo Rodrigues da Silva','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Vasco Alves, 1066, Centro','Sant''Ana do Livramento','RS','(55) 3242-5646','+555532425646',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2231155/izolina-do-carmo-rodrigues-da-silva
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Salão Martin4is Coiffeur','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Manduca Rodrigues, 502 - SALA 101, Centro','Sant''Ana do Livramento','RS','(55) 3244-3860','+555532443860',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2359405/salao-martin4is-coiffeur
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Raça Negra','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Vasco Alves, 769 - SL 8, Centro','Sant''Ana do Livramento','RS','(55) 9154-8421',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2339267/raca-negra
Telefone informado não validado: (55) 9154-8421
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maristela Cor & Corte','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Thomaz Albornoz, 728 - SL, Centro','Sant''Ana do Livramento','RS','(55) 3242-5662','+555532425662',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2277000/maristela-cor-corte
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sílvia Helena Ribeiro de Freitas','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Vasco Alves, 167, Centro','Sant''Ana do Livramento','RS','(55) 3242-4806','+555532424806',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2370322/silvia-helena-ribeiro-de-freitas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sílvia Brizolara Fervenza','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Brigadeiro David Canabarro, 759, Centro','Sant''Ana do Livramento','RS','(55) 3242-5537','+555532425537',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2370385/silvia-brizolara-fervenza
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lilian Roberta Vargas Gomes','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Andradas, 1702 - SALA 01, Centro','Sant''Ana do Livramento','RS','(55) 3244-4781','+555532444781',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2252920/lilian-roberta-vargas-gomes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fernanda de Lima Silva Cunha','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Achiles Gazapina Costa, 69 - CASA 1, Centro','Sant''Ana do Livramento','RS','(55) 9907-1718',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2199006/fernanda-de-lima-silva-cunha
Telefone informado não validado: (55) 9907-1718
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carla Beatriz de Pereira Retegue','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida Dom Pedro II, 721, Armour','Sant''Ana do Livramento','RS','(55) 8427-4428',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2112232/carla-beatriz-de-pereira-retegue
Telefone informado não validado: (55) 8427-4428
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Arminda Perreira Souza','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Tiradentes, 338, Centro','Sant''Ana do Livramento','RS','(55) 3242-6290','+555532426290',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2081422/arminda-perreira-souza
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Spazio Vitta - Estética e Saúde','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida João Belchior Goulart, 517 - AP 202, Centro','Sant''Ana do Livramento','RS','(55) 3241-4146','+555532414146',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2377193/spazio-vitta-estetica-e-saude
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Natália Meus Gonçalves','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida João Belchior Goulart, 2358, Centro','Sant''Ana do Livramento','RS','(55) 3243-1033','+555532431033',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2301489/natalia-meus-goncalves
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Joseane da Silva Gomes','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Irmão Rafael, 86, Batuva','Sant''Ana do Livramento','RS','(55) 9147-0019',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2239929/joseane-da-silva-gomes
Telefone informado não validado: (55) 9147-0019
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maira Roseli Silveira Pedroso','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Rivadavia Corrêa, 685, Centro','Sant''Ana do Livramento','RS','(55) 3242-5048','+555532425048',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2267625/maira-roseli-silveira-pedroso
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Gabriela Giovana Bustamante Del Valle','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua José Hernandes, 44, Armour','Sant''Ana do Livramento','RS','(55) 3241-5542','+555532415542',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2208780/gabriela-giovana-bustamante-del-valle
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maria de Fátima Friolin Ferreira','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua 13 de Maio, 1384 - s-2, Centro','Sant''Ana do Livramento','RS','(55) 3241-3179','+555532413179',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2273674/maria-de-fatima-friolin-ferreira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Jo Cabeleireira','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Pedro da Costa Vargas, 233, Fluminense','Sant''Ana do Livramento','RS','(55) 3243-3850','+555532433850',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2234973/jo-cabeleireira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cláudia Silvana Dutra Gomez Pinto','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Rivadavia Corrêa, 685, Centro','Sant''Ana do Livramento','RS','(55) 9923-3027',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2128852/claudia-silvana-dutra-gomez-pinto
Telefone informado não validado: (55) 9923-3027
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Salão de Beleza Vera','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Ângelo Del Fabro, 358 - CS 358, Prado','Sant''Ana do Livramento','RS','(55) 3241-2930','+555532412930',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2359111/salao-de-beleza-vera
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('João Iparraguirre Kovalick','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Cícero Fontoura da Silveira, 540, Centro','Sant''Ana do Livramento','RS','(55) 3242-2655','+555532422655',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2236191/joao-iparraguirre-kovalick
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Roberto Rocha Marinho','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Duque Caxias, 1554, Centro','Sant''Ana do Livramento','RS','(55) 3241-4856','+555532414856',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2351551/roberto-rocha-marinho
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maria de Fátima Ferreira Ferreira','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Thomaz Albornoz, 298 - SL 2 E 3, Centro','Sant''Ana do Livramento','RS','(55) 3244-3095','+555532443095',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2273672/maria-de-fatima-ferreira-ferreira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ana Cabeleireira','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida Doutor Hector Acosta, 432, Centro','Sant''Ana do Livramento','RS','(55) 3241-3885','+555532413885',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2073980/ana-cabeleireira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Solange Abreu Pereira','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Plínio da Costa Ávila, 276 - FDS, Tabatinga','Sant''Ana do Livramento','RS','(55) 9131-1982',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2375168/solange-abreu-pereira
Telefone informado não validado: (55) 9131-1982
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sandra Iara Honório','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida General Daltro Filho, 1455 - BL F AP 217, Armour','Sant''Ana do Livramento','RS','(55) 3244-5867','+555532445867',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2360209/sandra-iara-honorio
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Kortys Coifeur','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida General Daltro Filho, 1010 - SL 1, Armour','Sant''Ana do Livramento','RS','(55) 3242-6667','+555532426667',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2244210/kortys-coifeur
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('João Iparraguirre Kovalick','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida Tamandaré, 2076 - s-5, Centro','Sant''Ana do Livramento','RS','(55) 3241-4162','+555532414162',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2236192/joao-iparraguirre-kovalick
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Roselaine da Silva Costa','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua 7 de Setembro, 314, Centro','Sant''Ana do Livramento','RS','(55) 9721-2910',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2355034/roselaine-da-silva-costa
Telefone informado não validado: (55) 9721-2910
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maria Fabiana Rodrigues Fernandes','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Rua Doutor Pio M Salgado, 776 - CASA, Prado','Sant''Ana do Livramento','RS','(55) 8412-7053',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2274076/maria-fabiana-rodrigues-fernandes
Telefone informado não validado: (55) 8412-7053
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rosa Maria Moreira Osório','Salão de beleza','beauty_salon',array['beauty_salon']::text[],'Avenida João Belchior Goulart, 2416, Centro','Sant''Ana do Livramento','RS','(55) 3241-2557','+555532412557',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2353956/rosa-maria-moreira-osorio
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lilian F. Corrêa','Clínica de estética','beauty_salon',array['beauty_salon']::text[],'Rua Antônio Fernandes da Cunha, 758, Centro','Sant''Ana do Livramento','RS','(55) 3242-2741','+555532422741',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2252817/lilian-f-correa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mirian Braga Pereira','Esteticista',null,'{}'::text[],'Rua Andradas, 403 - s-11, Centro','Sant''Ana do Livramento','RS','(55) 3244-5646','+555532445646',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/institutos-de-beleza/2294208/mirian-braga-pereira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Clínica Dentária Puhl Ltda','Clínica odontológica','dentist',array['dentist']::text[],'Rua Rivadavia Corrêa, 202, Centro','Sant''Ana do Livramento','RS','(55) 3242-1242','+555532421242',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-medicos-e-terapias/2131120/clinica-dentaria-puhl-ltda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sorrifacil Clínica Dentária','Clínica odontológica','dentist',array['dentist']::text[],'Avenida João Pessoa, 1160, Centro','Sant''Ana do Livramento','RS','(55) 3242-1002','+555532421002',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-medicos-e-terapias/2376632/sorrifacil-clinica-dentaria
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maciel & Fonseca Serviços Odontológicos','Clínica odontológica','dentist',array['dentist']::text[],'Rua Silveira Martins, 510 - SL 202, Centro','Sant''Ana do Livramento','RS','(55) 3242-1763','+555532421763',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-medicos-e-terapias/2265606/maciel-fonseca-servicos-odontologicos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Clínica de Fisioterapia Livramento','Clínica de fisioterapia','physiotherapist',array['physiotherapist']::text[],'Rua Barão Triunfo, 572, Centro','Sant''Ana do Livramento','RS','(55) 3242-5188','+555532425188',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-medicos-e-terapias/2130852/clinica-de-fisioterapia-livramento
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rinaldo Pereira Rodrigues','Clínica de fisioterapia','physiotherapist',array['physiotherapist']::text[],'Rua Rivadavia Corrêa, 743, Centro','Sant''Ana do Livramento','RS','(55) 3241-1009','+555532411009',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-medicos-e-terapias/2349933/rinaldo-pereira-rodrigues
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Clínica de Fisioterapia e Este','Clínica de fisioterapia','physiotherapist',array['physiotherapist']::text[],'Rua Prefeito Hugolino Andrade, 883, Centro','Sant''Ana do Livramento','RS','(55) 3242-4493','+555532424493',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-medicos-e-terapias/2130886/clinica-de-fisioterapia-e-este
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Clínica de Fisioterapia e Reabilitação Física','Clínica de fisioterapia','physiotherapist',array['physiotherapist']::text[],'Rua 13 de Maio, 455, Centro','Sant''Ana do Livramento','RS','(55) 3244-1329','+555532441329',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-medicos-e-terapias/2130895/clinica-de-fisioterapia-e-reabilitacao-fisica
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Clinicão - Clínica Veterinária e Pet Shop','Clínica veterinária','veterinary_care',array['veterinary_care']::text[],'Rua Clemente T Guimarães, 107, Centro','Sant''Ana do Livramento','RS','(55) 3242-3573','+555532423573',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-e-hospitais-veterinarios/2132142/clinicao-clinica-veterinaria-e-pet-shop
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cliniger Veterinária','Clínica veterinária','veterinary_care',array['veterinary_care']::text[],'Rua Carlos Monserrat, 238, Jardim Europa','Sant''Ana do Livramento','RS','(55) 3242-4858','+555532424858',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-e-hospitais-veterinarios/2132242/cliniger-veterinaria
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Edu Campos Lago','Clínica veterinária','veterinary_care',array['veterinary_care']::text[],'Rua Senador Salgado Filho, 927, Centro','Sant''Ana do Livramento','RS','(55) 3242-1852','+555532421852',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-e-hospitais-veterinarios/2173835/edu-campos-lago
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ana Carolina da Cunha Albornoz','Clínica veterinária','veterinary_care',array['veterinary_care']::text[],'Rua Silveira Martins, 94, Centro','Sant''Ana do Livramento','RS','(55) 3243-6493','+555532436493',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-e-hospitais-veterinarios/2074151/ana-carolina-da-cunha-albornoz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Arca de Noe Produtos Veterinários Ltda','Clínica veterinária','veterinary_care',array['veterinary_care']::text[],'Rua Antônio Fernandes da Cunha, 258, Centro','Sant''Ana do Livramento','RS','(55) 3242-5008','+555532425008',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-e-hospitais-veterinarios/2079412/arca-de-noe-produtos-veterinarios-ltda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Bovitec Consultoria Serviços e Representações','Clínica veterinária','veterinary_care',array['veterinary_care']::text[],'Rua Vasco Alves, 502, Centro','Sant''Ana do Livramento','RS','(55) 3402-3566','+555534023566',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-e-hospitais-veterinarios/2103883/bovitec-consultoria-servicos-e-representacoes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luís Fernando Paiva Vieira','Clínica veterinária','veterinary_care',array['veterinary_care']::text[],'Rua José Martins, 371, Centro','Sant''Ana do Livramento','RS','(55) 3243-1946','+555532431946',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/clinicas-e-hospitais-veterinarios/2261453/luis-fernando-paiva-vieira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Clinicão','Pet shop','pet_store',array['pet_store']::text[],'Rua Rivadavia Corrêa, 1093, Centro','Sant''Ana do Livramento','RS','(55) 3242-1698','+555532421698',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2132140/clinicao
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Edenilson Gomes Bueno','Pet shop','pet_store',array['pet_store']::text[],'Avenida Almirante Saldanha da Gama, 2606 - C 1 FDS, Prado','Sant''Ana do Livramento','RS','(55) 3244-3022','+555532443022',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2172632/edenilson-gomes-bueno
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Palanque Agropecuária','Pet shop','pet_store',array['pet_store']::text[],'Avenida João Belchior Goulart, 291 - SL 101, Centro','Sant''Ana do Livramento','RS','(55) 3244-5059','+555532445059',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2316144/palanque-agropecuaria
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marilda Silva Machado','Pet shop','pet_store',array['pet_store']::text[],'Rua Antônio Augusto de Azevedo, 280, Centro','Sant''Ana do Livramento','RS','(55) 3243-3178','+555532433178',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2275485/marilda-silva-machado
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Escritório Rural Laçador','Pet shop','pet_store',array['pet_store']::text[],'Rua Vicente Ilha de Vargas, 887, Batuva','Sant''Ana do Livramento','RS','(55) 3241-5281','+555532415281',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2187304/escritorio-rural-lacador
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marcelo Camilo Vaqueiro','Pet shop','pet_store',array['pet_store']::text[],'Rua General Câmara, 2303 - SALA 01, Centro','Sant''Ana do Livramento','RS','(55) 9922-2447',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2270272/marcelo-camilo-vaqueiro
Telefone informado não validado: (55) 9922-2447
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rubinho Rações','Pet shop','pet_store',array['pet_store']::text[],'Rua Silveira Martins, 1142 - CJ 14, Centro','Sant''Ana do Livramento','RS','(55) 3241-5303','+555532415303',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2356497/rubinho-racoes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Comercial Orelhano','Pet shop','pet_store',array['pet_store']::text[],'Rua Pedro Alcântara Comas, 138 - 1001, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2136420/comercial-orelhano
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('L. Fuentes Comércio e Representações','Pet shop','pet_store',array['pet_store']::text[],'Rua Thomaz Albornoz, 226, Centro','Sant''Ana do Livramento','RS','(51) 9918-9577',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2245159/l-fuentes-comercio-e-representacoes
Telefone informado não validado: (51) 9918-9577
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Livramento Kennel Clube','Pet shop','pet_store',array['pet_store']::text[],'Rua Clemente T Guimarães, 107, Centro','Sant''Ana do Livramento','RS','(55) 3242-6250','+555532426250',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-para-animais/2254003/livramento-kennel-clube
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Academia Studio 88','Academia','gym',array['gym']::text[],'Rua Rivadavia Corrêa, 232, Centro','Sant''Ana do Livramento','RS','(55) 3242-4260','+555532424260',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/praticas-esportivas/2061015/academia-studio-88
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Academia Espaço','Academia','gym',array['gym']::text[],'Rua Conde de Porto Alegre, 727, Centro','Sant''Ana do Livramento','RS','(55) 3242-2973','+555532422973',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/praticas-esportivas/2060728/academia-espaco
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Academia Vida Ativa','Academia','gym',array['gym']::text[],'Rua Jarbas Pinheiro, 165, Centro','Sant''Ana do Livramento','RS','(55) 3242-5989','+555532425989',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/praticas-esportivas/2061147/academia-vida-ativa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marco Aurélio Cooper da Silva','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Irineu M da Silva, 333, Jardins','Sant''Ana do Livramento','RS','(55) 3243-3681','+555532433681',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2271785/marco-aurelio-cooper-da-silva
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mecânica Santanense Ltda','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida João Belchior Goulart, 989, Centro','Sant''Ana do Livramento','RS','(55) 3242-3861','+555532423861',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2282942/mecanica-santanense-ltda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Chapeação Viaduto','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida Francisco Reverbel de Araújo Góes, 1460, Centro','Sant''Ana do Livramento','RS','(55) 3243-1590','+555532431590',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2124557/chapeacao-viaduto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Antônio César Ledesma Irara','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua 15 de Novembro, 25, Centro','Sant''Ana do Livramento','RS','(55) 3241-4745','+555532414745',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2077735/antonio-cesar-ledesma-irara
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mecânica Muniz','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Prefeito Hugolino Andrade, 706, Centro','Sant''Ana do Livramento','RS','(55) 3242-3820','+555532423820',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2282766/mecanica-muniz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Oficina Mecânica Deniz','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Andradas, 1601, Centro','Sant''Ana do Livramento','RS','(55) 3242-5616','+555532425616',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2309540/oficina-mecanica-deniz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Denir Alves Martins','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida Júlio de Castilhos, 835, Centro','Sant''Ana do Livramento','RS','(55) 3242-3490','+555532423490',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2162342/denir-alves-martins
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('J D F Oficina Mecânica','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Castro Alves, 26, Prado','Sant''Ana do Livramento','RS','(55) 3242-1122','+555532421122',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2231462/j-d-f-oficina-mecanica
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Francisco Madeira Lacerda','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Salustiano Maciel, 200, Centro','Sant''Ana do Livramento','RS','(55) 3243-2271','+555532432271',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2205779/francisco-madeira-lacerda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Pereira dos Santos','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida Brasília, 2643, Armour','Sant''Ana do Livramento','RS','(55) 3243-6422','+555532436422',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2239635/jose-pereira-dos-santos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Jorge Guimarães Tinoco','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua General Câmara, 233, Centro','Sant''Ana do Livramento','RS','(55) 3241-5070','+555532415070',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2237604/jorge-guimaraes-tinoco
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Patrícia Fernandes Gonzales','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida Tamandaré, 2740, Centro','Sant''Ana do Livramento','RS','(55) 3242-6355','+555532426355',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2319486/patricia-fernandes-gonzales
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Gisa Teixeira Gisler','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida General Daltro Filho, 624 - ap-204, Centro','Sant''Ana do Livramento','RS','(55) 3243-5774','+555532435774',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2213530/gisa-teixeira-gisler
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Erealdo Nunes do Espírito Santo','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Senador Salgado Filho, 1296, Centro','Sant''Ana do Livramento','RS','(55) 3242-1638','+555532421638',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2184275/erealdo-nunes-do-espirito-santo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mecânica Chevrolet Car','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida Tamandaré, 1224, Centro','Sant''Ana do Livramento','RS','(55) 3242-2641','+555532422641',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2281745/mecanica-chevrolet-car
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Carlos Torres Bisso','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida Saudade, 261, Armour','Sant''Ana do Livramento','RS','(55) 3243-5046','+555532435046',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2238596/jose-carlos-torres-bisso
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Oficina Mecânica Real','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Ari Rodrigues, 109, Centro','Sant''Ana do Livramento','RS','(55) 3243-3477','+555532433477',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2309716/oficina-mecanica-real
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Oficina Katea','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua José do Patrocínio, 140, Prado','Sant''Ana do Livramento','RS','(55) 3242-3561','+555532423561',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2309426/oficina-katea
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Oficina Geral','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua João Paulo Ceccatto, 130, Armour','Sant''Ana do Livramento','RS','(55) 3243-5112','+555532435112',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2309259/oficina-geral
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mecânica Bueno','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Prefeito Hugolino Andrade, 1027, Centro','Sant''Ana do Livramento','RS','(55) 3242-6036','+555532426036',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2281650/mecanica-bueno
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luiz Carlos Corrêa Rodrigues','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida João Belchior Goulart, 1960, Centro','Sant''Ana do Livramento','RS','(55) 3243-3224','+555532433224',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2262235/luiz-carlos-correa-rodrigues
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mecânica São Marcos','Oficina mecânica','car_repair',array['car_repair']::text[],'Avenida Tamandaré, 778, Centro','Sant''Ana do Livramento','RS','(55) 3242-1273','+555532421273',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2282952/mecanica-sao-marcos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Adão Jorge Rodrigues Soares','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Eduardo V de Oliveira, 377, Batuva','Sant''Ana do Livramento','RS','(55) 3243-1352','+555532431352',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2062361/adao-jorge-rodrigues-soares
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Paulo Renato Pinto de Pinto','Oficina mecânica','car_repair',array['car_repair']::text[],'Travessa Diamanttino, 31, Centro','Sant''Ana do Livramento','RS','(55) 3244-5955','+555532445955',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2321116/paulo-renato-pinto-de-pinto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Paulo Renato Pinto de Pinto','Oficina mecânica','car_repair',array['car_repair']::text[],'Rua Pinheiro Machado, 356, Centro','Sant''Ana do Livramento','RS','(55) 3244-5906','+555532445906',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2321117/paulo-renato-pinto-de-pinto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Auto Elétrica Guimarães','Auto elétrica (oficina)','car_repair',array['car_repair']::text[],'Rua Marília Chaves Peixoto, 287, Prado','Sant''Ana do Livramento','RS','(55) 3241-3432','+555532413432',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/manutencao-veicular/2088364/auto-eletrica-guimaraes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Everdiesel','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida João Belchior Goulart, 1550 - 2, Centro','Sant''Ana do Livramento','RS','(55) 3241-2113','+555532412113',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2191602/everdiesel
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Oficina Paz','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Pedro Cruxen, 125 - 1, Armour','Sant''Ana do Livramento','RS','(55) 3241-5760','+555532415760',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2309302/oficina-paz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rimar Autopeças','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Prefeito Hugolino Andrade, 155, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2349867/rimar-autopecas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('J. a. Guarise - Rodopeças','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Antônio Guimarães, 184, Armour','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2232074/j-a-guarise-rodopecas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Livramento Auto Peças','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Tamandaré, 1236, Centro','Sant''Ana do Livramento','RS','(55) 3242-1228','+555532421228',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2254001/livramento-auto-pecas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pati - Comercio, Importação e Exportação','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Lido Mazzini, 806, Armour','Sant''Ana do Livramento','RS','(55) 3242-3231','+555532423231',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2319350/pati-comercio-importacao-e-exportacao
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Casa dos Parafusos','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Conde de Porto Alegre, 257, Centro','Sant''Ana do Livramento','RS','(55) 3241-1800','+555532411800',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2116835/casa-dos-parafusos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('D. L. G. - Autocor','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Doutor Hector Acosta, 1059 - GALPAO, Centro','Sant''Ana do Livramento','RS','(55) 3242-1983','+555532421983',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2157234/d-l-g-autocor
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Retificadora Bidu','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Vivaldino Maciel, 251, Centro','Sant''Ana do Livramento','RS','(55) 3241-5760','+555532415760',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2348673/retificadora-bidu
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Delca Auto Peças','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Prefeito Hugolino Andrade, 474, Centro','Sant''Ana do Livramento','RS','(55) 3242-3281','+555532423281',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2161591/delca-auto-pecas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Casa dos Escapamentos','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida João Belchior Goulart, 743 - LJ, Centro','Sant''Ana do Livramento','RS','(55) 9623-5614',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2116895/casa-dos-escapamentos
Telefone informado não validado: (55) 9623-5614
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Auto Peças En','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Conde de Porto Alegre, 382, Centro','Sant''Ana do Livramento','RS','(55) 3242-3867','+555532423867',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2089169/auto-pecas-en
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Júlio Cezar Vargas Vaz','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Prefeito Hugolino Andrade, 126, Centro','Sant''Ana do Livramento','RS','(55) 3242-1320','+555532421320',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2241277/julio-cezar-vargas-vaz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Chaimy Representações','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Barão Ibirapuitã, 573 - SL 1, Armour','Sant''Ana do Livramento','RS','(55) 3243-1325','+555532431325',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2124443/chaimy-representacoes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Auto Peças Pereira','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Manduca Rodrigues, 1006, Centro','Sant''Ana do Livramento','RS','(55) 3243-2095','+555532432095',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2089236/auto-pecas-pereira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luís Gustavo Barros Nunes','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua General João Manoel, 575, Prado','Sant''Ana do Livramento','RS','(55) 9996-6293',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2261695/luis-gustavo-barros-nunes
Telefone informado não validado: (55) 9996-6293
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Amenna Comércio de Peças','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Lido Mazzini, 122 - SL 1, Armour','Sant''Ana do Livramento','RS','(55) 8131-9733',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2073530/amenna-comercio-de-pecas
Telefone informado não validado: (55) 8131-9733
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Oficina Lacerda','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Antônio Pinto Guerra, 875, Armour','Sant''Ana do Livramento','RS','(55) 3241-2113','+555532412113',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2309429/oficina-lacerda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Crd Peças e Serviços','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Doutor Antônio da Veiga Cabral, 219 - FDS, Jardins','Sant''Ana do Livramento','RS','(55) 3243-3475','+555532433475',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2153831/crd-pecas-e-servicos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Baterias La Regina','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Tamandaré, 1629 - AP 301, Centro','Sant''Ana do Livramento','RS','(55) 3242-4330','+555532424330',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2096634/baterias-la-regina
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rm Veículos','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua General João Manoel, 591, Prado','Sant''Ana do Livramento','RS','(55) 3241-2364','+555532412364',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2351110/rm-veiculos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Danilo Menezes de Gusmão','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Vitalino Moreira D''''Avila, 192, Vila Rui Ramos','Sant''Ana do Livramento','RS','(55) 3242-4461','+555532424461',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2159215/danilo-menezes-de-gusmao
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('João Pedro Gonçalves','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida General Daltro Filho, 180, Centro','Sant''Ana do Livramento','RS','(55) 3242-3750','+555532423750',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2236480/joao-pedro-goncalves
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Nei Antônio Cooper da Silva','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua José Ferrão, 150 - 138, Jardins','Sant''Ana do Livramento','RS','(55) 3242-2175','+555532422175',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2302628/nei-antonio-cooper-da-silva
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('André Mota Longhi','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua General Severiano da Fonseca, 67, Centro','Sant''Ana do Livramento','RS','(55) 3242-5438','+555532425438',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2075615/andre-mota-longhi
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Discap','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Conde de Porto Alegre, 390 - LJ, Centro','Sant''Ana do Livramento','RS','(55) 9968-4554',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2166240/discap
Telefone informado não validado: (55) 9968-4554
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marcos Luiz da Silva Fernandes','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Visconde de São Gabriel, 25, Parque Águas','Sant''Ana do Livramento','RS','(55) 3243-6777','+555532436777',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2272313/marcos-luiz-da-silva-fernandes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Divisa Auto Peças','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida João Pessoa, 218, Centro','Sant''Ana do Livramento','RS','(55) 3242-5714','+555532425714',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2167449/divisa-auto-pecas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('M J M de Los Santos','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Tamandaré, 202, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2264376/m-j-m-de-los-santos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rodrigues & Saldanha','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida João Belchior Goulart, 2164, Centro','Sant''Ana do Livramento','RS','(55) 9995-9108',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2352419/rodrigues-saldanha
Telefone informado não validado: (55) 9995-9108
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Retificadora Santana','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida João Belchior Goulart, 1550 - 1, Centro','Sant''Ana do Livramento','RS','(55) 3241-2113','+555532412113',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2348745/retificadora-santana
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pedro do Espírito Santo','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Almirante Saldanha da Gama, 629 - AP 1, Prado','Sant''Ana do Livramento','RS','(55) 9608-0348',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2322435/pedro-do-espirito-santo
Telefone informado não validado: (55) 9608-0348
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Norte Sul Pneusom','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida João Pessoa, 126, Centro','Sant''Ana do Livramento','RS','(55) 3243-6033','+555532436033',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2305928/norte-sul-pneusom
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Comércio de Peças Santangelo','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Jarbas Pinheiro, 200, Centro','Sant''Ana do Livramento','RS','(55) 3241-4695','+555532414695',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2137710/comercio-de-pecas-santangelo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pablo D.U. Perez','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Luís Alberto Serralta, 64, Jardins','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2313825/pablo-d-u-perez
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Antônio Carlos Cavalheiro Cabreira','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida General Daltro Filho, 180 - FDS, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2077329/antonio-carlos-cavalheiro-cabreira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Milton de Vargas Dutra','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida João Belchior Goulart, 468 - SL, Centro','Sant''Ana do Livramento','RS','(55) 3241-3362','+555532413362',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2291015/milton-de-vargas-dutra
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Renovadora de Baterias Caurio Ii','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Tamandaré, 610, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2345327/renovadora-de-baterias-caurio-ii
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Edson Tortelli','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Avenida Tamandaré, 1621, Centro','Sant''Ana do Livramento','RS','(55) 8139-6200',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2173851/edson-tortelli
Telefone informado não validado: (55) 8139-6200
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos Ildemar Del Castillo Penni','Auto peças','auto_parts_store',array['auto_parts_store']::text[],'Rua Conde de Porto Alegre, 380, Centro','Sant''Ana do Livramento','RS','(55) 3243-4400','+555532434400',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/equipamentos-pecas-e-acessorios/2113364/carlos-ildemar-del-castillo-penni
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pamela Letícia Santana','Padaria','bakery',array['bakery']::text[],'Rua Vicente Ilha de Vargas, 1751 - SALA 01, Batuva','Sant''Ana do Livramento','RS','(55) 8409-3886',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2316458/pamela-leticia-santana
Telefone informado não validado: (55) 8409-3886
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Panificadora Lito','Padaria','bakery',array['bakery']::text[],'Rua Doutor Fialho, 760, Centro','Sant''Ana do Livramento','RS','(55) 3025-1949','+555530251949',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2316675/panificadora-lito
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Real','Padaria','bakery',array['bakery']::text[],'Rua Vasco Alves, 350, Centro','Sant''Ana do Livramento','RS','(55) 3242-2515','+555532422515',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315274/padaria-real
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Bocatto Confeitaria','Padaria','bakery',array['bakery']::text[],'Avenida João Belchior Goulart, 291 - s-101, Centro','Sant''Ana do Livramento','RS','(55) 3242-1628','+555532421628',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2102033/bocatto-confeitaria
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Pampa','Padaria','bakery',array['bakery']::text[],'Rua 7 de Setembro, 868, Centro','Sant''Ana do Livramento','RS','(55) 3242-4868','+555532424868',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315506/padaria-pampa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marcos Alberto Silva Madaleno','Padaria','bakery',array['bakery']::text[],'Rua Manoel Fervenza, 410, Armour','Sant''Ana do Livramento','RS','(55) 3244-5740','+555532445740',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2272531/marcos-alberto-silva-madaleno
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria e Mercado Paz','Padaria','bakery',array['bakery']::text[],'Avenida Dom Pedro II, 2148, Armour','Sant''Ana do Livramento','RS','(55) 3243-1441','+555532431441',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315144/padaria-e-mercado-paz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Trigo de Ouro','Padaria','bakery',array['bakery']::text[],'Avenida General Daltro Filho, 997, Armour','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315586/padaria-trigo-de-ouro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Panificadora Trigopan','Padaria','bakery',array['bakery']::text[],'Rua Prefeito Sérgio Fuentes, 415, Prado','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2316827/panificadora-trigopan
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Itamar Oliveira Antunes','Padaria','bakery',array['bakery']::text[],'Avenida Tamandaré, 2531, Centro','Sant''Ana do Livramento','RS','(55) 3241-4516','+555532414516',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2230210/itamar-oliveira-antunes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Artigas','Padaria','bakery',array['bakery']::text[],'Avenida Almirante Saldanha da Gama, 565, Prado','Sant''Ana do Livramento','RS','(55) 3241-5579','+555532415579',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2313989/padaria-artigas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Moderna','Padaria','bakery',array['bakery']::text[],'Rua Andradas, 1472, Centro','Sant''Ana do Livramento','RS','(55) 3242-1081','+555532421081',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315386/padaria-moderna
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Abílio Delmar Macedo Pereira','Padaria','bakery',array['bakery']::text[],'Rua 13 de Maio, 394, Centro','Sant''Ana do Livramento','RS','(55) 3241-1727','+555532411727',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2060087/abilio-delmar-macedo-pereira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marise Cristina Acosta Garcia','Padaria','bakery',array['bakery']::text[],'Avenida Dom Pedro II, 1508, Armour','Sant''Ana do Livramento','RS','(55) 3244-5943','+555532445943',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2276627/marise-cristina-acosta-garcia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria São Luís','Padaria','bakery',array['bakery']::text[],'Rua 7 de Setembro, 868, Centro','Sant''Ana do Livramento','RS','(55) 8132-4293',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315743/padaria-sao-luis
Telefone informado não validado: (55) 8132-4293
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('M Soares Paz','Padaria','bakery',array['bakery']::text[],'Avenida Francisco Reverbel de Araújo Góes, 3082, Armour','Sant''Ana do Livramento','RS','(55) 3241-5205','+555532415205',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2264673/m-soares-paz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cátia Gonçalves Bragança & Cia. Ltda.','Padaria','bakery',array['bakery']::text[],'Rua Conde de Porto Alegre, 364 - SL 1, Centro','Sant''Ana do Livramento','RS','(55) 3241-2253','+555532412253',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2118404/catia-goncalves-braganca-cia-ltda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('M L Xavier Silveira Mercado','Padaria','bakery',array['bakery']::text[],'Avenida Almirante Saldanha da Gama, 2304, Prado','Sant''Ana do Livramento','RS','(55) 3244-2056','+555532442056',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2264463/m-l-xavier-silveira-mercado
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Adão Cunha Paz','Padaria','bakery',array['bakery']::text[],'Avenida Francisco Reverbel de Araújo Góes, 1647, Armour','Sant''Ana do Livramento','RS','(55) 3242-5752','+555532425752',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2062507/adao-cunha-paz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fadas','Padaria','bakery',array['bakery']::text[],'Avenida João Belchior Goulart, 479, Centro','Sant''Ana do Livramento','RS','(55) 3621-8094','+555536218094',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2194536/fadas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ravena Indústria e Comércio de Alimentos Ltda.','Padaria','bakery',array['bakery']::text[],'Rua Rivadavia Corrêa, 1178, Centro','Sant''Ana do Livramento','RS','(55) 3242-5187','+555532425187',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2341401/ravena-industria-e-comercio-de-alimentos-ltda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria e Confeitaria Nova Real','Padaria','bakery',array['bakery']::text[],'Rua Silveira Martins, 275, Centro','Sant''Ana do Livramento','RS','(55) 9148-7321',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2314975/padaria-e-confeitaria-nova-real
Telefone informado não validado: (55) 9148-7321
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sandra Michele de Moraes Flores','Padaria','bakery',array['bakery']::text[],'Rua Vasco Alves, 962, Centro','Sant''Ana do Livramento','RS','(55) 3244-5588','+555532445588',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2360589/sandra-michele-de-moraes-flores
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Mil Delícias','Padaria','bakery',array['bakery']::text[],'Rua Vasco Alves, 962 - AP 11, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315106/padaria-mil-delicias
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria e Confeitaria Gaúcha','Padaria','bakery',array['bakery']::text[],'Rua Venâncio Aires, 147, Centro','Sant''Ana do Livramento','RS','(55) 8127-6045',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2314868/padaria-e-confeitaria-gaucha
Telefone informado não validado: (55) 8127-6045
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sabores do Trigo','Padaria','bakery',array['bakery']::text[],'Rua Carlos Giudice, 30, Batuva','Sant''Ana do Livramento','RS','(55) 3244-4221','+555532444221',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2358079/sabores-do-trigo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('A F Navarro Morales','Padaria','bakery',array['bakery']::text[],'Avenida Almirante Saldanha da Gama, 809 - AP 1, Prado','Sant''Ana do Livramento','RS','(55) 3242-5895','+555532425895',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2058510/a-f-navarro-morales
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Novapan','Padaria','bakery',array['bakery']::text[],'Avenida Doutor Hector Acosta, 830 - CS 830, Centro','Sant''Ana do Livramento','RS','(55) 3243-7207','+555532437207',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315490/padaria-novapan
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Panificadora Ideal','Padaria','bakery',array['bakery']::text[],'Rua Prefeito Sérgio Fuentes, 415, Prado','Sant''Ana do Livramento','RS','(55) 3241-2745','+555532412745',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2316749/panificadora-ideal
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pereira & Garcia','Padaria','bakery',array['bakery']::text[],'Avenida Francisco Reverbel de Araújo Góes, 2130 - LJ, Armour','Sant''Ana do Livramento','RS','(55) 3243-6068','+555532436068',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2323445/pereira-garcia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('C Navarro Morales','Padaria','bakery',array['bakery']::text[],'Avenida Francisco Reverbel de Araújo Góes, 3134, Armour','Sant''Ana do Livramento','RS','(55) 9622-9437',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2107267/c-navarro-morales
Telefone informado não validado: (55) 9622-9437
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos Roberto Correia de Oliveira','Padaria','bakery',array['bakery']::text[],'Rua Andradas, 1812, Centro','Sant''Ana do Livramento','RS','(55) 3241-4136','+555532414136',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2113261/carlos-roberto-correia-de-oliveira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Norberto Olivera Borges','Padaria','bakery',array['bakery']::text[],'Rua Almirante Barroso, 321 - CASA, Centro','Sant''Ana do Livramento','RS','(55) 3242-2175','+555532422175',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2305873/norberto-olivera-borges
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('C Navarro Morales','Padaria','bakery',array['bakery']::text[],'Avenida Francisco Reverbel de Araújo Góes, 560, Centro','Sant''Ana do Livramento','RS','(55) 3244-2809','+555532442809',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2107265/c-navarro-morales
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luís Eduardo da S. Mendes','Padaria','bakery',array['bakery']::text[],'Rua Vieira da Cunha, 98 - PRADO, Rivera','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2261535/luis-eduardo-da-s-mendes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria Pacheco','Padaria','bakery',array['bakery']::text[],'Rua Gabriel M da Cunha, 132, Centro','Sant''Ana do Livramento','RS','(55) 3243-1443','+555532431443',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315192/padaria-pacheco
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria São Luiz','Padaria','bakery',array['bakery']::text[],'Rua 7 de Setembro, 868, Centro','Sant''Ana do Livramento','RS','(55) 3243-4622','+555532434622',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2315744/padaria-sao-luiz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Padaria do Caio','Padaria','bakery',array['bakery']::text[],'Rua Andradas, 1812 - SALAO, Centro','Sant''Ana do Livramento','RS','(55) 8115-0033',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2314486/padaria-do-caio
Telefone informado não validado: (55) 8115-0033
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lancheria e Pizzaria Braz','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 720 - LJ, Centro','Sant''Ana do Livramento','RS','(55) 3241-5075','+555532415075',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2247266/lancheria-e-pizzaria-braz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Boné Lanches','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 1663, Centro','Sant''Ana do Livramento','RS','(55) 3241-4213','+555532414213',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2103032/bone-lanches
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Alves Inda & Cia','Lanchonete','restaurant',array['restaurant']::text[],'Rua General Câmara, 2098, Centro','Sant''Ana do Livramento','RS','(55) 3243-3155','+555532433155',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2072723/alves-inda-cia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('J.M. Bebidas e Lanches','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Almirante Saldanha da Gama, 1321, Prado','Sant''Ana do Livramento','RS','(55) 3241-1606','+555532411606',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2232399/j-m-bebidas-e-lanches
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ana Amélia Veiga Pinto','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 1001, Centro','Sant''Ana do Livramento','RS','(55) 3242-6006','+555532426006',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2074029/ana-amelia-veiga-pinto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Daniel Dutra','Lanchonete','restaurant',array['restaurant']::text[],'Rua Andradas, 558, Centro','Sant''Ana do Livramento','RS','(55) 3241-3201','+555532413201',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2159224/daniel-dutra
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lancheria Oliveira','Lanchonete','restaurant',array['restaurant']::text[],'Rua Silveira Martins, 530, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2247422/lancheria-oliveira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Elias Pires da Luz','Lanchonete','restaurant',array['restaurant']::text[],'Rua Bento Gonçalves, 145, Centro','Sant''Ana do Livramento','RS','(55) 3241-1454','+555532411454',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2178423/elias-pires-da-luz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Caren Luciana F. Moreira','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Almirante Saldanha da Gama, 829, Prado','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2112003/caren-luciana-f-moreira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Alfredo Martins Neto','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 952, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2071027/alfredo-martins-neto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Gizelda Pedroso Couto','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 899, Centro','Sant''Ana do Livramento','RS','(55) 8135-2223',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2213749/gizelda-pedroso-couto
Telefone informado não validado: (55) 8135-2223
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Clea Marisa Lemes Machado','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Almirante Saldanha da Gama, 2431, Prado','Sant''Ana do Livramento','RS','(55) 3244-2754','+555532442754',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2130056/clea-marisa-lemes-machado
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Airton Martins Lutz','Lanchonete','restaurant',array['restaurant']::text[],'Avenida General Daltro Filho, 255, Centro','Sant''Ana do Livramento','RS','(55) 3244-1901','+555532441901',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2238441/jose-airton-martins-lutz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lanche Mania','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 288 - SL 1, Centro','Sant''Ana do Livramento','RS','(55) 3243-4810','+555532434810',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2246784/lanche-mania
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Gerardo P Monfort','Lanchonete','restaurant',array['restaurant']::text[],'Rua Rivadavia Corrêa, 392, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2211413/gerardo-p-monfort
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Destaque Lancheria e Sorveteria Ltda M e','Lanchonete','restaurant',array['restaurant']::text[],'Rua Manduca Rodrigues, 879, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2163788/destaque-lancheria-e-sorveteria-ltda-m-e
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sandra Magali Arruda Rodrigues','Lanchonete','restaurant',array['restaurant']::text[],'Rua Argemiro Simões Moreira, 772, Prado','Sant''Ana do Livramento','RS','(55) 9604-2043',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2360292/sandra-magali-arruda-rodrigues
Telefone informado não validado: (55) 9604-2043
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Elsa Marlei de Pinto Souza','Lanchonete','restaurant',array['restaurant']::text[],'Travessa Diamanttino, 31, Centro','Sant''Ana do Livramento','RS','(55) 3242-3668','+555532423668',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2179711/elsa-marlei-de-pinto-souza
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rosangela S Rodrigues Pereira','Lanchonete','restaurant',array['restaurant']::text[],'Avenida General Daltro Filho, 2554, Armour','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2354782/rosangela-s-rodrigues-pereira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Centenário','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Pessoa, 130, Centro','Sant''Ana do Livramento','RS','(55) 3242-5516','+555532425516',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2120192/centenario
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Seila Mari Melo de Mello','Lanchonete','restaurant',array['restaurant']::text[],'Rua Tiradentes, 125, Centro','Sant''Ana do Livramento','RS','(55) 3241-4319','+555532414319',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2364516/seila-mari-melo-de-mello
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Delicious Potato','Lanchonete','restaurant',array['restaurant']::text[],'Rua Vasco Alves, 1100 - SALA 14, Centro','Sant''Ana do Livramento','RS','(55) 3242-4461','+555532424461',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2162020/delicious-potato
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lopes Comércio de Rações','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Almirante Saldanha da Gama, 133, Prado','Sant''Ana do Livramento','RS','(55) 3242-1763','+555532421763',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2258556/lopes-comercio-de-racoes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fernanda Moraes da Silveira Lancheria','Lanchonete','restaurant',array['restaurant']::text[],'Rua Andradas, 180 - LJ 1, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2198976/fernanda-moraes-da-silveira-lancheria
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sevilha Cafeteria','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2076 - SALAO TERREO, Centro','Sant''Ana do Livramento','RS','(55) 3242-4705','+555532424705',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2368394/sevilha-cafeteria
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Leda Maria Pereira Holtv Silva','Lanchonete','restaurant',array['restaurant']::text[],'Avenida General Daltro Filho, 768, Armour','Sant''Ana do Livramento','RS','(55) 3243-4672','+555532434672',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2250183/leda-maria-pereira-holtv-silva
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Destaque Lancheria e Sorveteri','Lanchonete','restaurant',array['restaurant']::text[],'Rua Manoel Fervenza, 868, Armour','Sant''Ana do Livramento','RS','(55) 3243-3442','+555532433442',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2163799/destaque-lancheria-e-sorveteri
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fátima Regina Arruda Ageitos','Lanchonete','restaurant',array['restaurant']::text[],'Rua Carlos Monserrat, 390, Jardim Europa','Sant''Ana do Livramento','RS','(55) 3241-3265','+555532413265',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2197872/fatima-regina-arruda-ageitos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Hot Dog Express Braz','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 468 - SL, Centro','Sant''Ana do Livramento','RS','(55) 9693-6862',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2220744/hot-dog-express-braz
Telefone informado não validado: (55) 9693-6862
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Carlos Pereira Batista','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Pessoa, 1100 - SL 1, Centro','Sant''Ana do Livramento','RS','(55) 3241-1501','+555532411501',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2238536/jose-carlos-pereira-batista
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maria Helena Pina Gomes','Lanchonete','restaurant',array['restaurant']::text[],'Rua Senador Salgado Filho, 1440, Centro','Sant''Ana do Livramento','RS','(55) 3244-1726','+555532441726',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2274390/maria-helena-pina-gomes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rosangela Rodrigues Maciel','Lanchonete','restaurant',array['restaurant']::text[],'Rua Carlos Roberto Bertelli, 164, Jardins','Sant''Ana do Livramento','RS','(55) 9967-1879',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2354777/rosangela-rodrigues-maciel
Telefone informado não validado: (55) 9967-1879
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Point Shoping','Lanchonete','restaurant',array['restaurant']::text[],'Rua 15 de Novembro, 265 - SL 1, Centro','Sant''Ana do Livramento','RS','(55) 3621-8094','+555536218094',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2327537/point-shoping
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maria Helena Machado','Lanchonete','restaurant',array['restaurant']::text[],'Rua Manoel Novais dos Santos, 632, Armour','Sant''Ana do Livramento','RS','(55) 8116-4482',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2274375/maria-helena-machado
Telefone informado não validado: (55) 8116-4482
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rubem Lima Braz','Lanchonete','restaurant',array['restaurant']::text[],'Avenida 24 de Maio, 1169 - SL, Centro','Sant''Ana do Livramento','RS','(55) 3241-2693','+555532412693',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2356352/rubem-lima-braz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sérgio Luís Alves Almeida','Lanchonete','restaurant',array['restaurant']::text[],'Rua Conde de Porto Alegre, 1027, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2365748/sergio-luis-alves-almeida
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Special Gourmett','Lanchonete','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 1533, Centro','Sant''Ana do Livramento','RS','(55) 3241-5555','+555532415555',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2377243/special-gourmett
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Planeta Hambúrguer','Lanchonete','restaurant',array['restaurant']::text[],'Rua General Câmara, 2412, Centro','Sant''Ana do Livramento','RS','(55) 3242-4368','+555532424368',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2326770/planeta-hamburguer
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pizzaria Recanto','Lanchonete','restaurant',array['restaurant']::text[],'Rua 7 de Setembro, 1241 - CS 1241, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2326103/pizzaria-recanto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marta Marília Brochi Rodriguez','Lanchonete','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2541, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/lanches-e-salgados/2278283/marta-marilia-brochi-rodriguez
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Bar e Restaurante Tropicana','Restaurante','restaurant',array['restaurant']::text[],'Rua Rivadavia Corrêa, 106, Centro','Sant''Ana do Livramento','RS','(55) 3242-4966','+555532424966',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2095177/bar-e-restaurante-tropicana
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Bar e Pizzaria Ragazzi','Restaurante','restaurant',array['restaurant']::text[],'Rua Prefeito Hugolino Andrade, 196, Centro','Sant''Ana do Livramento','RS','(55) 9615-6049',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2095123/bar-e-pizzaria-ragazzi
Telefone informado não validado: (55) 9615-6049
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante a Bruxa','Restaurante','restaurant',array['restaurant']::text[],'Rua Brigadeiro David Canabarro, 800, Centro','Sant''Ana do Livramento','RS','(55) 3241-1059','+555532411059',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2346356/restaurante-a-bruxa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Churrascaria Carga Pesada','Restaurante','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 3241, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2125416/churrascaria-carga-pesada
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carioca Tche Bar e Restaurante','Restaurante','restaurant',array['restaurant']::text[],'Rua Uruguai, 1325, Centro','Sant''Ana do Livramento','RS','(55) 3242-4680','+555532424680',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2112250/carioca-tche-bar-e-restaurante
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Galeteria Serrana','Restaurante','restaurant',array['restaurant']::text[],'Rua Rivadavia Corrêa, 743, Centro','Sant''Ana do Livramento','RS','(51) 9357-1946',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2209109/galeteria-serrana
Telefone informado não validado: (51) 9357-1946
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('S & M Restaurante Central','Restaurante','restaurant',array['restaurant']::text[],'Rua Rivadavia Corrêa, 1176, Centro','Sant''Ana do Livramento','RS','(55) 3242-1042','+555532421042',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2357177/s-m-restaurante-central
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Elisandra Alves Costa','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 1796, Centro','Sant''Ana do Livramento','RS','(55) 9932-9975',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2179066/elisandra-alves-costa
Telefone informado não validado: (55) 9932-9975
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante e Lancheria Tia Gena','Restaurante','restaurant',array['restaurant']::text[],'Rua Andradas, 725 - CASA, Centro','Sant''Ana do Livramento','RS','(55) 3242-4243','+555532424243',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2347348/restaurante-e-lancheria-tia-gena
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante Nutrisan','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2880 - ANDAR PRIMEIRO SALA, Centro','Sant''Ana do Livramento','RS','(55) 3242-3766','+555532423766',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2347883/restaurante-nutrisan
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sandra Cristina Telles Salmentao','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2270, Centro','Sant''Ana do Livramento','RS','(55) 3241-4199','+555532414199',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2360228/sandra-cristina-telles-salmentao
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fogão Gaúcho','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 1804 - SALA 02, Centro','Sant''Ana do Livramento','RS','(55) 3244-1672','+555532441672',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2203641/fogao-gaucho
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante e Lancheria Azteca','Restaurante','restaurant',array['restaurant']::text[],'Rua Rivadavia Corrêa, 304, Centro','Sant''Ana do Livramento','RS','(55) 3242-4223','+555532424223',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2347300/restaurante-e-lancheria-azteca
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pizzaria e Galeteria '' o Fornão da Pizza''','Restaurante','restaurant',array['restaurant']::text[],'Rua Barão Triunfo, 553, Centro','Sant''Ana do Livramento','RS','(55) 8111-5873',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2325949/pizzaria-e-galeteria-o-fornao-da-pizza
Telefone informado não validado: (55) 8111-5873
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante Ditaly','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2424 - SL 2, Centro','Sant''Ana do Livramento','RS','(55) 3243-3061','+555532433061',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2346988/restaurante-ditaly
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('A C Cacapietra','Restaurante','restaurant',array['restaurant']::text[],'Avenida João Pessoa, 1100 - SL 3 SS, Centro','Sant''Ana do Livramento','RS','(55) 3242-1699','+555532421699',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2058547/a-c-cacapietra
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Remedi','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2101, Centro','Sant''Ana do Livramento','RS','(55) 3242-1721','+555532421721',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2344421/remedi
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante Sem Nome','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2597 - CS 40, Centro','Sant''Ana do Livramento','RS','(55) 3243-1591','+555532431591',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2348253/restaurante-sem-nome
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Oscar Fabrizzio Conti Mattio','Restaurante','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 55, Centro','Sant''Ana do Livramento','RS','(55) 9126-7702',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2311972/oscar-fabrizzio-conti-mattio
Telefone informado não validado: (55) 9126-7702
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rosa Oliveira Machado','Restaurante','restaurant',array['restaurant']::text[],'Rua José Fernandes Mendes, Armour','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2354203/rosa-oliveira-machado
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Da Nona','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2392 - 2396 E 2404, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2157402/da-nona
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Jg Mendes Iracet','Restaurante','restaurant',array['restaurant']::text[],'Rodovia BR-158, 27423 - KM 35, Armour','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2234581/jg-mendes-iracet
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante e Churrascaria Paz','Restaurante','restaurant',array['restaurant']::text[],'Rua Silveira Martins, 840, Centro','Sant''Ana do Livramento','RS','(55) 3242-3555','+555532423555',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2347216/restaurante-e-churrascaria-paz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Laurelise Dubal de Lima','Restaurante','restaurant',array['restaurant']::text[],'Rua Presidente Epitácio Pessoa, 107, Armour','Sant''Ana do Livramento','RS','(55) 3243-4365','+555532434365',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2248582/laurelise-dubal-de-lima
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Coisa Nossa Restaurante','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 1758 - PADRAO, Centro','Sant''Ana do Livramento','RS','(55) 3242-4680','+555532424680',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2133675/coisa-nossa-restaurante
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lancheria e Restaurante Sibonei','Restaurante','restaurant',array['restaurant']::text[],'Rua Andradas, 558 - SALAO, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2247178/lancheria-e-restaurante-sibonei
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Valmor Bortolin','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2424, Centro','Sant''Ana do Livramento','RS','(55) 3244-5674','+555532445674',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2239888/jose-valmor-bortolin
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Restaurante Augustus','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 2597, Centro','Sant''Ana do Livramento','RS','(55) 3242-1288','+555532421288',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2346479/restaurante-augustus
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Carlos Gonçalves Leivas','Restaurante','restaurant',array['restaurant']::text[],'Avenida 24 de Maio, 749, Centro','Sant''Ana do Livramento','RS','(55) 3241-4742','+555532414742',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2238559/jose-carlos-goncalves-leivas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('La Tasca','Restaurante','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 995, Centro','Sant''Ana do Livramento','RS','(55) 8416-3145',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2245537/la-tasca
Telefone informado não validado: (55) 8416-3145
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pinho & Athayde','Restaurante','restaurant',array['restaurant']::text[],'Rua Andradas, 651, Centro','Sant''Ana do Livramento','RS','(55) 3241-4784','+555532414784',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2325404/pinho-athayde
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luismar Barbosa Cardoso','Restaurante','restaurant',array['restaurant']::text[],'Rua Uruguai, 1771, Centro','Sant''Ana do Livramento','RS','(55) 3242-1130','+555532421130',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2261602/luismar-barbosa-cardoso
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luci Ribeiro do Couto','Restaurante','restaurant',array['restaurant']::text[],'Avenida General Daltro Filho, 591 - SL 1, Centro','Sant''Ana do Livramento','RS','(55) 3241-4382','+555532414382',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2260099/luci-ribeiro-do-couto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mestre Cuca Gastronomia','Restaurante','restaurant',array['restaurant']::text[],'Rua Achiles Gazapina Costa, 205 - CASA, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2288160/mestre-cuca-gastronomia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luciana Soares Durães','Restaurante','restaurant',array['restaurant']::text[],'Rua 7 de Setembro, 626, Centro','Sant''Ana do Livramento','RS','(55) 3242-5240','+555532425240',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2260544/luciana-soares-duraes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ivanio Ribeiro','Restaurante','restaurant',array['restaurant']::text[],'Rua Prefeito Hugolino Andrade, 110 - S LOJA, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2230554/ivanio-ribeiro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pizzaria Coisa Nossa','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 1758, Centro','Sant''Ana do Livramento','RS','(55) 3242-1160','+555532421160',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2326076/pizzaria-coisa-nossa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Nicolini - Alimentos','Restaurante','restaurant',array['restaurant']::text[],'Avenida Tamandaré, 1804, Centro','Sant''Ana do Livramento','RS','(55) 3241-4142','+555532414142',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2304835/nicolini-alimentos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Petisqueria Black White','Restaurante','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 688 - LJ, Centro','Sant''Ana do Livramento','RS','(55) 8131-1076',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2324258/petisqueria-black-white
Telefone informado não validado: (55) 8131-1076
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lucimar Gomes Motta','Pizzaria','restaurant',array['restaurant']::text[],'Avenida João Belchior Goulart, 172, Centro','Sant''Ana do Livramento','RS','(55) 3241-2772','+555532412772',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/restaurantes/2260799/lucimar-gomes-motta
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Bromelia Flores','Floricultura','florist',array['florist']::text[],'Rua Rivadavia Corrêa, 822, Centro','Sant''Ana do Livramento','RS','(55) 3241-1849','+555532411849',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2105803/bromelia-flores
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Maristela da Fonseca Soarez & Cia','Floricultura','florist',array['florist']::text[],'Avenida Tamandaré, 1499, Centro','Sant''Ana do Livramento','RS','(55) 3241-5581','+555532415581',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2277002/maristela-da-fonseca-soarez-cia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Floricultura Multiplantas','Floricultura','florist',array['florist']::text[],'Rua Silveira Martins, 527, Centro','Sant''Ana do Livramento','RS','(55) 3242-1963','+555532421963',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2203009/floricultura-multiplantas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Floricultura a Bicharada','Floricultura','florist',array['florist']::text[],'Rua Rivadavia Corrêa, 518, Centro','Sant''Ana do Livramento','RS','(55) 3242-2652','+555532422652',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2202594/floricultura-a-bicharada
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Orquídeas Floricultura','Floricultura','florist',array['florist']::text[],'Rua 7 de Setembro, 37, Centro','Sant''Ana do Livramento','RS','(55) 8407-8504',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2312067/orquideas-floricultura
Telefone informado não validado: (55) 8407-8504
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cabelo & Cor','Floricultura','florist',array['florist']::text[],'Avenida João Belchior Goulart, 1457, Centro','Sant''Ana do Livramento','RS','(55) 3244-5868','+555532445868',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2107754/cabelo-cor
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lírio da Paz','Floricultura','florist',array['florist']::text[],'Rua Silveira Martins, 380, Centro','Sant''Ana do Livramento','RS','(55) 3241-2133','+555532412133',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2253496/lirio-da-paz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Córdoba Flores','Floricultura','florist',array['florist']::text[],'Rua Silveira Martins, 1372, Centro','Sant''Ana do Livramento','RS','(55) 3242-2860','+555532422860',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2152197/cordoba-flores
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Floricultura Floboyan','Floricultura','florist',array['florist']::text[],'Rua Manduca Rodrigues, 940, Centro','Sant''Ana do Livramento','RS','(55) 3242-3261','+555532423261',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2202780/floricultura-floboyan
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Córdoba','Floricultura','florist',array['florist']::text[],'Rua Conde de Porto Alegre, 141, Centro','Sant''Ana do Livramento','RS','(55) 3241-3595','+555532413595',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2152195/cordoba
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Gilma Teixeira de Teixeira','Floricultura','florist',array['florist']::text[],'Avenida Tamandaré, 1838, Centro','Sant''Ana do Livramento','RS','(55) 3242-3933','+555532423933',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/flores-presentes-e-datas-especiais/2213230/gilma-teixeira-de-teixeira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Baby Confecções','Loja de roupas','clothing_store',array['clothing_store']::text[],'Rua Conde de Porto Alegre, 824, Centro','Sant''Ana do Livramento','RS','(55) 3242-4461','+555532424461',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2091587/baby-confeccoes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Imobiliária Falcão','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Rivadavia Corrêa, 699, Centro','Sant''Ana do Livramento','RS','(55) 3242-4614','+555532424614',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2224951/imobiliaria-falcao
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Imobiliária Rumo Novo','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Duque Caxias, 1864, Centro','Sant''Ana do Livramento','RS','(55) 3242-3115','+555532423115',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2225236/imobiliaria-rumo-novo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Imobiliária Makrolar','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Avenida João Belchior Goulart, 520, Centro','Sant''Ana do Livramento','RS','(55) 3242-3434','+555532423434',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2225059/imobiliaria-makrolar
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Múltipla Imobiliária Corretagem Administração Ltda','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Duque Caxias, 1389, Centro','Sant''Ana do Livramento','RS','(55) 3242-2391','+555532422391',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2299606/multipla-imobiliaria-corretagem-administracao-ltda
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Paula Severo Negócios Imobiliários','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua General Câmara, 1768, Centro','Sant''Ana do Livramento','RS','(55) 3241-4087','+555532414087',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2319658/paula-severo-negocios-imobiliarios
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Henry Imóveis','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Rivadavia Corrêa, 814, Centro','Sant''Ana do Livramento','RS','(55) 3242-3075','+555532423075',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2219543/henry-imoveis
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Solar Imóveis','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Duque Caxias, 1691, Centro','Sant''Ana do Livramento','RS','(55) 3241-1515','+555532411515',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2375629/solar-imoveis
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Serralta Empreendimentos e Participações','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Conde de Porto Alegre, 815 - SL 1, Centro','Sant''Ana do Livramento','RS','(55) 9975-6649',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2366978/serralta-empreendimentos-e-participacoes
Telefone informado não validado: (55) 9975-6649
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Malipar Participações','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Silveira Martins, 1253, Centro','Sant''Ana do Livramento','RS','(55) 9907-2574',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2268632/malipar-participacoes
Telefone informado não validado: (55) 9907-2574
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marco Aurélio Azevedo de Castro','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Rivadavia Corrêa, 802, Centro','Sant''Ana do Livramento','RS','(55) 3241-4144','+555532414144',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2271780/marco-aurelio-azevedo-de-castro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Imobiliária','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Andradas, 663, Centro','Sant''Ana do Livramento','RS','(55) 3242-5250','+555532425250',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2224620/imobiliaria
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Codema Negócios Imobiliários','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Vasco Alves, 663, Centro','Sant''Ana do Livramento','RS','(55) 3242-1007','+555532421007',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2133461/codema-negocios-imobiliarios
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Representações Figueira Ltda S/C','Imobiliária','real_estate_agency',array['real_estate_agency']::text[],'Rua Duque Caxias, 1691, Centro','Sant''Ana do Livramento','RS','(55) 3241-1520','+555532411520',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/compra-venda-e-locacao/2345583/representacoes-figueira-ltda-s-c
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Emir da Silva Nunes','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Thomaz Albornoz, 504, Centro','Sant''Ana do Livramento','RS','(55) 3242-5714','+555532425714',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2181495/emir-da-silva-nunes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Assessoria Contábil Aliança','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Vasco Alves, 1183, Centro','Sant''Ana do Livramento','RS','(55) 3242-3078','+555532423078',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2083779/assessoria-contabil-alianca
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Contabilidade Santana','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua General Câmara, 2050 - SL 11 E 12, Centro','Sant''Ana do Livramento','RS','(55) 8127-6763',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2150096/contabilidade-santana
Telefone informado não validado: (55) 8127-6763
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Rodrigues Pereira Contabilidade','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Silveira Martins, 1004, Centro','Sant''Ana do Livramento','RS','(55) 3242-2291','+555532422291',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2352502/rodrigues-pereira-contabilidade
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Contabilidade Farrapos','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Rivadavia Corrêa, 1172, Centro','Sant''Ana do Livramento','RS','(55) 3242-1144','+555532421144',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2149998/contabilidade-farrapos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos Alves Veber','Escritório de contabilidade','accounting',array['accounting']::text[],'Avenida Tamandaré, 2515 - s-15, Centro','Sant''Ana do Livramento','RS','(55) 3242-4898','+555532424898',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2112746/carlos-alves-veber
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Contabilidade Carrion','Escritório de contabilidade','accounting',array['accounting']::text[],'Avenida Doutor Hector Acosta, 134 - s-B, Centro','Sant''Ana do Livramento','RS','(55) 3244-3121','+555532443121',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2149988/contabilidade-carrion
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Contabilidade Servicont','Escritório de contabilidade','accounting',array['accounting']::text[],'Avenida Tamandaré, 1750, Centro','Sant''Ana do Livramento','RS','(55) 3242-1265','+555532421265',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2150220/contabilidade-servicont
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Contabilidade Almeida','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Conde de Porto Alegre, 676, Centro','Sant''Ana do Livramento','RS','(55) 3242-3822','+555532423822',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2149983/contabilidade-almeida
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Contabilidade e Administração Shekinah','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Senador Salgado Filho, 1194 - SALA 209 1, Centro','Sant''Ana do Livramento','RS','(55) 3242-5697','+555532425697',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2149992/contabilidade-e-administracao-shekinah
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sérgio Nunes Moreira','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua 7 de Setembro, 534, Centro','Sant''Ana do Livramento','RS','(55) 3242-3364','+555532423364',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2366220/sergio-nunes-moreira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Assessoria Contábil Noguera','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Rivadavia Corrêa, 296 - SL 1 SL 1, Centro','Sant''Ana do Livramento','RS','(55) 3241-1763','+555532411763',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2083788/assessoria-contabil-noguera
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Escritório Contábil Noguera','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Rivadavia Corrêa, 296 - s-01, Centro','Sant''Ana do Livramento','RS','(55) 3242-3000','+555532423000',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2186520/escritorio-contabil-noguera
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Giovani Vieira Guedes','Escritório de contabilidade','accounting',array['accounting']::text[],'Avenida Dom Pedro II, 648, Armour','Sant''Ana do Livramento','RS','(55) 3243-1170','+555532431170',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2213411/giovani-vieira-guedes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luiz Humberto Morel Paulo','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Manduca Rodrigues, 540, Centro','Sant''Ana do Livramento','RS','(55) 3241-5075','+555532415075',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2263047/luiz-humberto-morel-paulo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Bopp Editora','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Vasco Alves, 1100 - SL 7, Centro','Sant''Ana do Livramento','RS','(55) 3241-3229','+555532413229',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2103136/bopp-editora
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luís Antônio Corrêa Pizarro','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Brigadeiro David Canabarro, 700 - s-1, Centro','Sant''Ana do Livramento','RS','(55) 3241-2012','+555532412012',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2261156/luis-antonio-correa-pizarro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Escritório Cont Rural Pampeiro','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Duque Caxias, 1299, Centro','Sant''Ana do Livramento','RS','(55) 3242-2844','+555532422844',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2186413/escritorio-cont-rural-pampeiro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Escritório Rural Pampeiro','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Thomaz Albornoz, 413, Centro','Sant''Ana do Livramento','RS','(55) 3241-1338','+555532411338',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2187327/escritorio-rural-pampeiro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ana Gisela Mirailh Alvarez','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Doutor Fialho, 620 - ap-202, Centro','Sant''Ana do Livramento','RS','(55) 3244-3803','+555532443803',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2074177/ana-gisela-mirailh-alvarez
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Gislaine Vieira de Macedo','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Vasco Alves, 1100 - s-7, Centro','Sant''Ana do Livramento','RS','(55) 3242-4682','+555532424682',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2213722/gislaine-vieira-de-macedo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Andréa Fernandes Chaves','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua General Câmara, 1560 - s-106, Centro','Sant''Ana do Livramento','RS','(55) 3241-1892','+555532411892',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2075575/andrea-fernandes-chaves
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Escritório Contábil Quevedo','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua 7 de Setembro, 583 - s-9, Centro','Sant''Ana do Livramento','RS','(55) 3242-5752','+555532425752',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2186395/escritorio-contabil-quevedo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Itamauyr Teixeira dos Anjos','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Delvira Leal Pacheco, 938, Wilson','Sant''Ana do Livramento','RS','(55) 9973-6737',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2230116/itamauyr-teixeira-dos-anjos
Telefone informado não validado: (55) 9973-6737
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Conimec Organização Contábil','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Vasco Alves, 735 - s-204, Centro','Sant''Ana do Livramento','RS','(55) 3242-1976','+555532421976',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2147664/conimec-organizacao-contabil
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lair Menezes dos Santos','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Rivadavia Corrêa, 1140, Centro','Sant''Ana do Livramento','RS','(55) 3241-1970','+555532411970',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2246756/lair-menezes-dos-santos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Orlando Peres Alves','Escritório de contabilidade','accounting',array['accounting']::text[],'Avenida Tamandaré, 1857, Centro','Sant''Ana do Livramento','RS','(55) 3241-3256','+555532413256',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2311767/orlando-peres-alves
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Organizações Contábeis Quines','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Duque Caxias, 930 - CASA, Centro','Sant''Ana do Livramento','RS','(55) 3242-1042','+555532421042',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2311560/organizacoes-contabeis-quines
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Raul Alberto Schenkel Ibarra','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Prefeito Hugolino Andrade, 280 - s-3, Centro','Sant''Ana do Livramento','RS','(55) 3242-2815','+555532422815',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2341038/raul-alberto-schenkel-ibarra
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Próspero de Souza Leal','Escritório de contabilidade','accounting',array['accounting']::text[],'Rua Silveira Martins, 927, Centro','Sant''Ana do Livramento','RS','(55) 3242-2143','+555532422143',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/contabilidade-e-assessoria-contabil/2336815/prospero-de-souza-leal
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('A Vivenda Móveis e Decorações','Móveis planejados','furniture_store',array['furniture_store']::text[],'Rua Conde de Porto Alegre, 647, Centro','Sant''Ana do Livramento','RS','(55) 3244-5547','+555532445547',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/comercio-e-fabricacao-de-moveis/2059060/a-vivenda-moveis-e-decoracoes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mafer','Vidraçaria',null,'{}'::text[],'Avenida Tamandaré, 2418, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-de-reforma-e-construcao/2267213/mafer
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Leandro Roberto Machado de Machado','Vidraçaria',null,'{}'::text[],'Avenida General Daltro Filho, 70, Centro','Sant''Ana do Livramento','RS','(55) 3242-4561','+555532424561',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-de-reforma-e-construcao/2250228/leandro-roberto-machado-de-machado
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Kathia Synthia de Mello Bueno','Vidraçaria',null,'{}'::text[],'Rua Doutor Antônio da Veiga Cabral, 21 - s-1, Jardins','Sant''Ana do Livramento','RS','(55) 3243-5104','+555532435104',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/servicos-de-reforma-e-construcao/2242865/kathia-synthia-de-mello-bueno
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos Roberto Gonçalves Selau','Dentista','dentist',array['dentist']::text[],'Avenida Tamandaré, 2101 - s-211, Centro','Sant''Ana do Livramento','RS','(55) 3242-3821','+555532423821',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2113459/carlos-roberto-goncalves-selau
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ivan Abreu Gomes','Dentista','dentist',array['dentist']::text[],'Rua Manduca Rodrigues, 500 - s-403, Centro','Sant''Ana do Livramento','RS','(55) 3242-3694','+555532423694',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2230429/ivan-abreu-gomes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pedro Dilelio Maracci','Dentista','dentist',array['dentist']::text[],'Avenida Tamandaré, 2101 - s-304, Centro','Sant''Ana do Livramento','RS','(55) 3241-3427','+555532413427',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2322431/pedro-dilelio-maracci
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ricardo Mega Mannoci','Dentista','dentist',array['dentist']::text[],'Avenida Tamandaré, 2101 - s-311, Centro','Sant''Ana do Livramento','RS','(55) 3241-2011','+555532412011',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2349857/ricardo-mega-mannoci
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Pronto Socorro Dentário S/C','Dentista','dentist',array['dentist']::text[],'Rua Manduca Rodrigues, 1146, Centro','Sant''Ana do Livramento','RS','(55) 3242-4585','+555532424585',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2336456/pronto-socorro-dentario-s-c
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Suzana Barros','Dentista','dentist',array['dentist']::text[],'Rua Senador Salgado Filho, 222, Centro','Sant''Ana do Livramento','RS','(55) 3242-3175','+555532423175',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2383502/suzana-barros
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sérgio Leo Farias Alves','Dentista','dentist',array['dentist']::text[],'Rua Rivadavia Corrêa, 730, Centro','Sant''Ana do Livramento','RS','(55) 3242-2879','+555532422879',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2365733/sergio-leo-farias-alves
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cilon Vitorino da Rosa','Dentista','dentist',array['dentist']::text[],'Rua Manduca Rodrigues, 500, Centro','Sant''Ana do Livramento','RS','(55) 3242-3840','+555532423840',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2126994/cilon-vitorino-da-rosa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Roberto Amaral Simões Pires','Dentista','dentist',array['dentist']::text[],'Rua Manduca Rodrigues, 500 - s-303, Centro','Sant''Ana do Livramento','RS','(55) 3242-3961','+555532423961',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2351324/roberto-amaral-simoes-pires
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cecília Nelvi Henker Pires','Dentista','dentist',array['dentist']::text[],'Avenida Tamandaré, 2515 - s-13, Centro','Sant''Ana do Livramento','RS','(55) 3242-1676','+555532421676',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2119171/cecilia-nelvi-henker-pires
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Elio Álvaro Piffero Arteche','Dentista','dentist',array['dentist']::text[],'Rua Rivadavia Corrêa, 890 - s-204, Centro','Sant''Ana do Livramento','RS','(55) 3242-1140','+555532421140',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2178897/elio-alvaro-piffero-arteche
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Adriana Martignome Yanez','Dentista','dentist',array['dentist']::text[],'Rua Uruguai, 1692, Centro','Sant''Ana do Livramento','RS','(55) 3242-4700','+555532424700',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2063960/adriana-martignome-yanez
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Nury Grisel Betancourt','Dentista','dentist',array['dentist']::text[],'Avenida Tamandaré, 2101 - s-204, Centro','Sant''Ana do Livramento','RS','(55) 3242-1295','+555532421295',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2307153/nury-grisel-betancourt
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Delmar S Gonçalves','Dentista','dentist',array['dentist']::text[],'Rua General Câmara, 1928, Centro','Sant''Ana do Livramento','RS','(55) 3242-1491','+555532421491',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2161920/delmar-s-goncalves
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Paulo Júlio Hilal de Castro','Dentista','dentist',array['dentist']::text[],'Rua Andradas, 160, Centro','Sant''Ana do Livramento','RS','(55) 3242-1880','+555532421880',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2320632/paulo-julio-hilal-de-castro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lia Ucha Feippe','Dentista','dentist',array['dentist']::text[],'Rua Manduca Rodrigues, 211, Centro','Sant''Ana do Livramento','RS','(55) 3241-2518','+555532412518',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2252166/lia-ucha-feippe
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Hugo Mário Pereira Barbosa','Dentista','dentist',array['dentist']::text[],'Rua Andradas, 129 - s-15, Centro','Sant''Ana do Livramento','RS','(55) 3242-5705','+555532425705',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2221841/hugo-mario-pereira-barbosa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Afonso Pozzobom Zampieri','Dentista','dentist',array['dentist']::text[],'Rua Duque Caxias, 1749 - s-111, Centro','Sant''Ana do Livramento','RS','(55) 3242-2380','+555532422380',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2064846/afonso-pozzobom-zampieri
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Jaime Peres de Oliveira','Dentista','dentist',array['dentist']::text[],'Avenida Tamandaré, 2101 - s-301, Centro','Sant''Ana do Livramento','RS','(55) 3242-1145','+555532421145',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2232699/jaime-peres-de-oliveira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Milton Iruleguy Araújo','Dentista','dentist',array['dentist']::text[],'Avenida Tamandaré, 2181 - s-202, Centro','Sant''Ana do Livramento','RS','(55) 3242-2218','+555532422218',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2290991/milton-iruleguy-araujo
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sérgio Luiz Pereira de Andrade','Dentista','dentist',array['dentist']::text[],'Rua Andradas, 240 - s-11, Centro','Sant''Ana do Livramento','RS','(55) 3242-3183','+555532423183',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/dentistas-e-especialistas/2365913/sergio-luiz-pereira-de-andrade
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Jacqueline B Zamberlan','Loja de roupas','clothing_store',array['clothing_store']::text[],'Rua Andradas, 319, Centro','Sant''Ana do Livramento','RS','(55) 3242-2868','+555532422868',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2232529/jacqueline-b-zamberlan
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Augusto Leonel Fernandez & Cia','Loja de roupas','clothing_store',array['clothing_store']::text[],'Rua Andradas, 163, Centro','Sant''Ana do Livramento','RS','(55) 3242-2629','+555532422629',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2087951/augusto-leonel-fernandez-cia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mohad Khalil Salameh Ahmad','Loja de roupas','clothing_store',array['clothing_store']::text[],'Rua Rivadavia Corrêa, 99, Centro','Sant''Ana do Livramento','RS','(55) 3242-1563','+555532421563',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2295468/mohad-khalil-salameh-ahmad
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Adbel Raudf Saleh Yuasuf','Loja de roupas','clothing_store',array['clothing_store']::text[],'Rua Andradas, 90, Centro','Sant''Ana do Livramento','RS','(55) 3242-1806','+555532421806',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2062678/adbel-raudf-saleh-yuasuf
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('R H a Comércio de Confecções','Loja de roupas','clothing_store',array['clothing_store']::text[],'Rua Rivadavia Corrêa, 516, Centro','Sant''Ana do Livramento','RS','(55) 3243-2109','+555532432109',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2338469/r-h-a-comercio-de-confeccoes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Livraria Evangélica Shalon','Ótica',null,'{}'::text[],'Rua Vasco Alves, 918, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2254080/livraria-evangelica-shalon
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Optilent','Ótica',null,'{}'::text[],'Rua Andradas, 594, Centro','Sant''Ana do Livramento','RS','(55) 3242-4461','+555532424461',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2311155/optilent
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marley Paz Bidart','Ótica',null,'{}'::text[],'Avenida Tamandaré, 1722, Centro','Sant''Ana do Livramento','RS','(55) 3243-3967','+555532433967',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2277295/marley-paz-bidart
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ótica Ernesto Lopes','Ótica',null,'{}'::text[],'Rua Andradas, 600, Centro','Sant''Ana do Livramento','RS','(55) 3242-1655','+555532421655',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2312781/otica-ernesto-lopes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fronteira Administradora de Imóveis','Ótica',null,'{}'::text[],'Rua Andradas, 375 - AND 1 SL 2, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2206297/fronteira-administradora-de-imoveis
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Óptica Ponto de Vista','Ótica',null,'{}'::text[],'Rua Andradas, 411, Centro','Sant''Ana do Livramento','RS','(55) 8409-1936',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2311218/optica-ponto-de-vista
Telefone informado não validado: (55) 8409-1936
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ótica e Joalheria Gaiger','Ótica',null,'{}'::text[],'Rua Andradas, 547, Centro','Sant''Ana do Livramento','RS','(55) 3242-3304','+555532423304',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2312684/otica-e-joalheria-gaiger
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cezar Automóveis','Ótica',null,'{}'::text[],'Avenida Júlio de Castilhos, 72, Centro','Sant''Ana do Livramento','RS','(55) 3244-2360','+555532442360',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2124012/cezar-automoveis
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Bazar Gliter','Ótica',null,'{}'::text[],'Avenida General Daltro Filho, 767, Armour','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2097005/bazar-gliter
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Milas Produtos Óticos Importaco e Exportação','Ótica',null,'{}'::text[],'Rua Silveira Martins, 371, Centro','Sant''Ana do Livramento','RS','(55) 3241-4640','+555532414640',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2290711/milas-produtos-oticos-importaco-e-exportacao
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Juan Carlos G. de Acevedo da Silva','Ótica',null,'{}'::text[],'Rua Moisés Viana, 455, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2240683/juan-carlos-g-de-acevedo-da-silva
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sul Óptica','Ótica',null,'{}'::text[],'Avenida Tamandaré, 1722, Centro','Sant''Ana do Livramento','RS','(55) 3241-5562','+555532415562',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2380284/sul-optica
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Joalheria e Óptica Suiza','Ótica',null,'{}'::text[],'Rua Andradas, 564 - SL 3, Centro','Sant''Ana do Livramento','RS','(55) 3241-5309','+555532415309',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2235266/joalheria-e-optica-suiza
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('R. L. Hoferlin Corrêa','Ótica',null,'{}'::text[],'Rua Duque Caxias, 1654, Centro','Sant''Ana do Livramento','RS','(55) 8444-3028',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2339226/r-l-hoferlin-correa
Telefone informado não validado: (55) 8444-3028
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marli Pires Ferreira Bijuterias','Ótica',null,'{}'::text[],'Avenida João Pessoa, 686, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2277504/marli-pires-ferreira-bijuterias
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Agro Razer Comércio e Representações','Ótica',null,'{}'::text[],'Rua Rubens Estela, 221, Armour','Sant''Ana do Livramento','RS','(55) 9907-3349',null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2066327/agro-razer-comercio-e-representacoes
Telefone informado não validado: (55) 9907-3349
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Colette Abdallah Tarabay','Ótica',null,'{}'::text[],'Rua Uruguai, 1600 - SL N 301, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2134114/colette-abdallah-tarabay
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Escritório Rural de Remates Índio Charrua','Ótica',null,'{}'::text[],'Rua Duque Caxias, 1553 - SL 1, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2187299/escritorio-rural-de-remates-indio-charrua
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('H F da Rosa','Ótica',null,'{}'::text[],'Rua Zelinda A Rodrigues, 71, Wilson','Sant''Ana do Livramento','RS','(55) 3242-3810','+555532423810',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2217804/h-f-da-rosa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Guido Gustavo Barrios Diaz','Ótica',null,'{}'::text[],'Rua Manduca Rodrigues, 747 - cj-2, Centro','Sant''Ana do Livramento','RS','(55) 3241-5309','+555532415309',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2217068/guido-gustavo-barrios-diaz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Óptica France','Ótica',null,'{}'::text[],'Rua Andradas, 564 - s-03, Centro','Sant''Ana do Livramento','RS','(55) 3242-1984','+555532421984',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2311170/optica-france
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sandro Machado','Ótica',null,'{}'::text[],'Rua General Câmara, 1832, Centro','Sant''Ana do Livramento','RS','(55) 3242-1608','+555532421608',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2360470/sandro-machado
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Representações Leão','Ótica',null,'{}'::text[],'Avenida João Belchior Goulart, 1745, Centro','Sant''Ana do Livramento','RS',null,null,null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/vestuario-calcados-e-acessorios/2345845/representacoes-leao
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Renato Amaja Corbette','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Andradas, 129 - s-11, Centro','Sant''Ana do Livramento','RS','(55) 3241-1184','+555532411184',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2344723/renato-amaja-corbette
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mauro Alves Simões Pires','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Ari Rodrigues, 36, Mor Colina','Sant''Ana do Livramento','RS','(55) 3242-3695','+555532423695',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2279924/mauro-alves-simoes-pires
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Nasser Judeh','Escritório de advocacia','lawyer',array['lawyer']::text[],'Avenida João Pessoa, 818 - ap-502, Centro','Sant''Ana do Livramento','RS','(55) 3241-5019','+555532415019',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2301701/nasser-judeh
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Olímpio Simões Pires','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Rivadavia Corrêa, 940 - cj-21, Centro','Sant''Ana do Livramento','RS','(55) 3242-4470','+555532424470',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2310098/olimpio-simoes-pires
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Hugo Corrêa Madrid','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Duque Caxias, 1679, Centro','Sant''Ana do Livramento','RS','(55) 3242-1408','+555532421408',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2221863/hugo-correa-madrid
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos Thomaz Ávila Albornoz','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Thomaz Albornoz, 434 - s-41, Centro','Sant''Ana do Livramento','RS','(55) 3242-3996','+555532423996',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2113516/carlos-thomaz-avila-albornoz
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cláudio Antônio Antonello Carn','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Brigadeiro David Canabarro, 252, Centro','Sant''Ana do Livramento','RS','(55) 3241-2751','+555532412751',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2129133/claudio-antonio-antonello-carn
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos de Oliveira Simas','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Manduca Rodrigues, 593, Centro','Sant''Ana do Livramento','RS','(55) 3242-1526','+555532421526',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2113065/carlos-de-oliveira-simas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('João Antônio Soares Apoitia','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Brigadeiro David Canabarro, 252, Centro','Sant''Ana do Livramento','RS','(55) 3241-2612','+555532412612',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2235355/joao-antonio-soares-apoitia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marcirio Edson Silva da Silva','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Coronel Ângelo de Mello, 558, Centro','Sant''Ana do Livramento','RS','(55) 3241-1940','+555532411940',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2271541/marcirio-edson-silva-da-silva
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Norberto Araújo Filho','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Senador Salgado Filho, 1194 - s-202, Centro','Sant''Ana do Livramento','RS','(55) 3242-1564','+555532421564',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2305766/norberto-araujo-filho
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('André Curbeti da Rosa','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Antônio Fernandes da Cunha, 645, Centro','Sant''Ana do Livramento','RS','(55) 3242-6146','+555532426146',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2075254/andre-curbeti-da-rosa
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Luís Martins Bragança','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua General Câmara, 2115, Centro','Sant''Ana do Livramento','RS','(55) 3242-1599','+555532421599',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2239322/jose-luis-martins-braganca
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Antônio Apoitia Netto','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua General Câmara, 2185, Centro','Sant''Ana do Livramento','RS','(55) 3242-3944','+555532423944',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2077237/antonio-apoitia-netto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Jorge Augusto Ferreira Gisler','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Conde de Porto Alegre, 1444, Centro','Sant''Ana do Livramento','RS','(55) 3242-2279','+555532422279',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2237500/jorge-augusto-ferreira-gisler
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Aníbal Serralta Acauan','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua 7 de Setembro, 820, Centro','Sant''Ana do Livramento','RS','(55) 3242-5366','+555532425366',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2076696/anibal-serralta-acauan
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Escritório de Advocacia','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Conde de Porto Alegre, 1099, Centro','Sant''Ana do Livramento','RS','(55) 3242-5503','+555532425503',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2186508/escritorio-de-advocacia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Gerson Rodrigues Soares','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Vasco Alves, 587, Centro','Sant''Ana do Livramento','RS','(55) 3242-2099','+555532422099',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2211622/gerson-rodrigues-soares
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('João Carlos Louzada Garcia','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Uruguai, 1543, Centro','Sant''Ana do Livramento','RS','(55) 3242-4640','+555532424640',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2235657/joao-carlos-louzada-garcia
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Cláudio Antônio Antonello Carneiro','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Concesso Cassales, 416, Jardins','Sant''Ana do Livramento','RS','(55) 3243-1279','+555532431279',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2129134/claudio-antonio-antonello-carneiro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Lucy Pereira Lemos','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Barão Triunfo, 510, Centro','Sant''Ana do Livramento','RS','(55) 3242-2890','+555532422890',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2261044/lucy-pereira-lemos
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ceci R Rosso','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Rivadavia Corrêa, 1378, Centro','Sant''Ana do Livramento','RS','(55) 3242-2853','+555532422853',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2119196/ceci-r-rosso
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Sílvio Vares Neto','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Andradas, 561, Centro','Sant''Ana do Livramento','RS','(55) 3242-2813','+555532422813',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2370531/silvio-vares-neto
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos Fabrício de Oliveira Silveira','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Silveira Martins, 326 - s-1, Centro','Sant''Ana do Livramento','RS','(55) 3242-3041','+555532423041',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2113021/carlos-fabricio-de-oliveira-silveira
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Nilson Auri Costa de Freitas','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua General Câmara, 1944, Centro','Sant''Ana do Livramento','RS','(55) 3242-1246','+555532421246',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2304889/nilson-auri-costa-de-freitas
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Ordem dos Advogados do Brasil Secção Rgs-Siv','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua General Câmara, 1571, Centro','Sant''Ana do Livramento','RS','(55) 3242-1332','+555532421332',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2311339/ordem-dos-advogados-do-brasil-seccao-rgs-siv
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Marileia de Lima Miranda do Amaral Advogada','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Rivadavia Corrêa, 1181 - s-05, Centro','Sant''Ana do Livramento','RS','(55) 3244-1673','+555532441673',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2275805/marileia-de-lima-miranda-do-amaral-advogada
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('José Horaides Rodrigues Martins','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua General Neto, 202, Centro','Sant''Ana do Livramento','RS','(55) 3242-2729','+555532422729',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2239230/jose-horaides-rodrigues-martins
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Antônio Félix Padilha Damilano','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Almirante Barroso, 297 - ap-31, Centro','Sant''Ana do Livramento','RS','(55) 3241-4313','+555532414313',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2077801/antonio-felix-padilha-damilano
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Moisés dos Santos Rodrigues','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Moisés Viana, 507, Centro','Sant''Ana do Livramento','RS','(55) 3242-2058','+555532422058',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2295784/moises-dos-santos-rodrigues
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Idemar Iglesias','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Uruguai, 898, Centro','Sant''Ana do Livramento','RS','(55) 3242-2891','+555532422891',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2222818/idemar-iglesias
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luís Eduardo de La Rosa D Ávila','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Ney Savi, 64, Centro','Sant''Ana do Livramento','RS','(55) 3242-6083','+555532426083',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2261536/luis-eduardo-de-la-rosa-d-avila
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Araújo Filho Advogados Associados','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Senador Salgado Filho, 1194 - CJ 202, Centro','Sant''Ana do Livramento','RS','(55) 3242-4680','+555532424680',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2079307/araujo-filho-advogados-associados
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Luiz Mário de Vargas Dias Lopes','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua General Câmara, 2215, Centro','Sant''Ana do Livramento','RS','(55) 3242-1789','+555532421789',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2262889/luiz-mario-de-vargas-dias-lopes
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Delza Azambuja Cavalheiro','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Amaro da Silveira, 103, Prado','Sant''Ana do Livramento','RS','(55) 3241-1117','+555532411117',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2162399/delza-azambuja-cavalheiro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fernando Melo Amarelle','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Uruguai, 1585, Centro','Sant''Ana do Livramento','RS','(55) 3241-4100','+555532414100',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2199245/fernando-melo-amarelle
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Carlos Eduardo Grisolila da Ro','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Duque Caxias, 1615, Centro','Sant''Ana do Livramento','RS','(55) 3241-3083','+555532413083',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2113111/carlos-eduardo-grisolila-da-ro
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Loja de Fato','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Duque Caxias, 1687, Centro','Sant''Ana do Livramento','RS','(55) 3241-1422','+555532411422',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2255688/loja-de-fato
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Fernando Rodrigues Machado','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Rivadavia Corrêa, 297 - ap-202, Centro','Sant''Ana do Livramento','RS','(55) 3242-4784','+555532424784',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2199451/fernando-rodrigues-machado
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL'),
('Mônica Duarte da Silva Guerra','Escritório de advocacia','lawyer',array['lawyer']::text[],'Rua Duque Caxias, 1463, Centro','Sant''Ana do Livramento','RS','(55) 3242-3966','+555532423966',null,'not_identified','Fonte: https://www.guiatelefone.com/santana-do-livramento-rs/escritorios-de-advocacia-e-advogados/2295842/monica-duarte-da-silva-guerra
Importado por lista — conferir os dados antes de qualquer contato.','manual','OPERATIONAL')
on conflict do nothing;
commit;
