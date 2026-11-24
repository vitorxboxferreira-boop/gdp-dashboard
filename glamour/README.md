# Glamour — site oficial (demonstração)

Site estático (HTML + CSS + JS, sem dependências) da boutique Glamour.

```
glamour/
├── index.html        página única com todas as seções
├── css/style.css     estilos (mobile-first)
├── js/products.js    catálogo: nomes, preços, cores, tamanhos e guia de medidas
├── js/main.js        menu, filtro por valor, aba de detalhes, animações, contato
├── vendor/lenis.min.js  rolagem suave no desktop (MIT)
├── assets/img/       logo, fotos (WebP) e ícones
├── assets/fonts/     Cormorant Garamond e Jost (WOFF2, licença OFL)
├── tools/build-single.cjs  gera o arquivo único em dist/
├── dist/glamour-boutique.html  site completo em um só arquivo
└── preview/          capturas de tela de referência
```

## Arquivo único para enviar (recomendado)

`dist/glamour-boutique.html` é o site inteiro em **um só arquivo**: estilos,
scripts, imagens e fontes ficam embutidos. Não precisa descompactar nem manter
pastas: basta abrir no navegador (computador ou celular), enviar por
WhatsApp/e-mail ou publicar numa hospedagem (renomeie para `index.html`).
Funciona até sem internet.

Depois de alterar o site, gere o arquivo de novo:

```
cd glamour
node tools/build-single.cjs
```

(Com o Playwright instalado, os cartões da coleção já saem prontos no HTML e
aparecem mesmo em visualizadores que não executam JavaScript.)

## Rodar localmente

```
cd glamour
python3 -m http.server 8000
# abra http://localhost:8000
```

## Logo
`assets/img/logo-glamour.webp` foi extraída da imagem original da logo, com o
fundo rosa removido (transparência real), sem redesenhar a letra G nem o nome.
`logo-glamour-640.webp` é a versão leve para cabeçalho/rodapé e
`logo-g.png` é o símbolo, usado no favicon.

## WhatsApp
Número configurado: (55) 3621-3626 (`555536213626` = país 55 + DDD 55 + número).
Para trocar, edite `js/main.js` e os links `wa.me` do contato e do rodapé no `index.html`:

```js
var WHATSAPP_NUMBER = '55DDDNUMERO';
```

Enquanto estiver vazio, os botões de contato abrem o Direct do Instagram
(@glamourfronteira). Com o número preenchido, todos os botões
"Consultar disponibilidade" abrem o WhatsApp com a mensagem já
mencionando o modelo.

## Endereço
Há um espaço marcado na seção Contato (`<!-- Endereço -->`) para incluir
quando for informado.

## Imagens
Fotos da coleção e do banner são ilustrativas (Unsplash). A grade do Instagram
e o detalhe da seção "Sobre" usam fotos do perfil da loja. Substitua por fotos
próprias mantendo o mesmo nome de arquivo.

## Catálogo, preços, cores e tamanhos
Tudo fica em `js/products.js`. Cada vestido tem preço, cores (nome + código
da cor) e descrição; os tamanhos (36 a 46) e o guia de medidas valem para
todos. Os cartões, o filtro por valor e a aba de detalhes são gerados a partir
desse arquivo. Os preços atuais são valores de referência sugeridos.

Na aba de cada vestido a cliente escolhe cor e tamanho; o botão monta a
mensagem com modelo, cor, tamanho e valor. Com o WhatsApp configurado, a
mensagem já vai preenchida. Sem ele, o botão abre o Direct e copia a mensagem
para a cliente colar.

## Efeitos (js/effects.js)
Abertura com a logo (uma vez por sessão), brilho dourado na logo, palavras que
surgem nos títulos, faixa em movimento, cartões com abertura em arco, inclinação
3D e reflexo, cursor dourado e botões magnéticos (somente mouse), cabeçalho que
se esconde ao rolar para baixo, botão de voltar ao topo com progresso de leitura
e linha do "Como funciona" que acompanha a rolagem. Favoritos ficam salvos no
navegador da cliente. Tudo é desligado para quem ativa "reduzir movimento".
