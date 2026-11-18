# Loja: catálogo com compra pelo WhatsApp

Site de loja de streetwear em **HTML, CSS e JavaScript puro**. Não tem build, servidor nem dependências.
Abra `index.html` no navegador ou suba a pasta em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel).

## O que tem

- Faixa de avisos rolante, cabeçalho fixo, menu lateral no celular
- Banner, faixa de benefícios e atalhos de categorias
- Vitrines em carrossel (Novidades + categorias escolhidas)
- Página de categoria com filtro por marca e ordenação por preço/nome
- Busca (ignora acentos), favoritos e tema claro/escuro
- Página de produto: tamanhos com estoque, quantidade, parcelamento, preço no Pix, produtos relacionados
- Carrinho salvo no navegador, finalizado **pelo WhatsApp** com o pedido já escrito
- Perguntas frequentes, rodapé com contato e horário, botão flutuante do WhatsApp

## Como personalizar

| O quê | Onde |
|---|---|
| Nome da loja, WhatsApp, e-mail, Instagram, endereço, horário, Pix, parcelas, FAQ, banner | `js/config.js` |
| Categorias e produtos | `js/dados.js` |
| Cores e fontes | topo de `css/estilo.css` (`--marca`, etc.) |

**Fotos:** crie uma pasta `img/`, coloque as fotos e preencha `imagens: ["img/minha-foto.jpg"]` no produto.
Produto sem foto ganha uma ilustração automática com a marca.

**WhatsApp:** em `config.js`, `whatsapp` vai só com números, com DDI e DDD: `5511999999999`.
