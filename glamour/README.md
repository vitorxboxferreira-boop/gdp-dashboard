# Glamour — site oficial (demonstração)

Site estático (HTML + CSS + JS, sem dependências) da boutique Glamour.

```
glamour/
├── index.html        página única com todas as seções
├── css/style.css     estilos (mobile-first)
├── js/main.js        menu mobile, animações, contato
├── assets/img/       logo, fotos (WebP) e ícones
└── preview/          capturas de tela de referência
```

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
Defina o número em `js/main.js`:

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
