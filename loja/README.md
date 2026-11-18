# Volare: loja streetwear com compra pelo WhatsApp

Loja da Volare Streetwear com visual de rua (preto, roxo do logo e branco; fita zebrada, adesivos), feita em **HTML, CSS e JavaScript puro**. Não tem build, servidor nem dependências.
Abra `index.html` no navegador ou suba a pasta em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel).

## O que tem

- Faixa de avisos rolante, cabeçalho fixo, menu lateral no celular
- Banner, faixa de benefícios e atalhos de categorias
- Vitrines em carrossel (Novidades + categorias escolhidas)
- Página de categoria com filtro por marca e ordenação por preço/nome
- Catálogo com 358 produtos em 10 categorias, com rotas de Novidades e Promoções
- Busca (ignora acentos), favoritos, tema escuro (padrão) e claro
- Listas com "Carregar mais" (24 por vez), filtro por marca e ordenação
- Escolha de cor e tamanho; o pedido no WhatsApp leva os dois
- Página de produto: tamanhos com estoque, quantidade, parcelamento, preço no Pix, produtos relacionados
- Carrinho salvo no navegador, finalizado **pelo WhatsApp** com o pedido já escrito
- Perguntas frequentes, rodapé com contato e horário, botão flutuante do WhatsApp

## Efeitos e acabamento

- Abertura com o logo (só na primeira visita da sessão) e transição suave entre páginas
- Título do banner animado palavra por palavra, luz que segue o mouse, parallax e contadores
- Conteúdo que aparece ao rolar, topo que encolhe com barra de progresso e botão de voltar ao topo
- "Adicionar rápido" com os tamanhos ao passar o mouse no card
- Página de produto com zoom na foto, compartilhar, guia de medidas e barra de compra fixa
- Tudo respeita a opção "reduzir movimento" do sistema

## Como personalizar

| O quê | Onde |
|---|---|
| Nome da loja, WhatsApp, e-mail, Instagram, endereço, horário, Pix, parcelas, FAQ, banner | `js/config.js` |
| Categorias e produtos | `js/dados.js` |
| Cores e fontes | topo de `css/estilo.css` (`--marca`, `--marca-clara`, etc.) |
| Logo | `img/logo-volare-topo.png` (topo) e `img/logo-volare.png` (rodapé), caminhos em `js/config.js` |

**Fotos:** crie uma pasta `img/`, coloque as fotos e preencha `imagens: ["img/minha-foto.jpg"]` no produto.
Produto sem foto ganha uma ilustração automática com a marca.

**WhatsApp:** em `config.js`, `whatsapp` vai só com números, com DDI e DDD: `5511999999999`.
