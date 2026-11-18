# Fronteira Veículos: showroom virtual

Site da Fronteira Veículos (Santana do Livramento, RS) com os carros reais (Fiat Mobi Trekking, Jeep Compass S e McLaren 720S Spider) dentro de um estúdio 3D em tempo real (Three.js + WebGL), com animações ligadas à rolagem (GSAP ScrollTrigger) e rolagem suave (Lenis).

## Como os carros são exibidos

- **Jeep Compass S e McLaren 720S Spider: modelos 3D reais** (`models/*.glb`). O visitante arrasta para girar 360°; parado, o carro gira sozinho devagar. Troca de cor com pintura e verniz, faróis com brilho, rodas girando no Modo Sport, reflexo no piso, sombra e materialização com scanner.
- **Fiat Mobi Trekking: foto real recortada** (`assets/mobi-cut.webp`), com troca de cor por máscara de pintura. Ele não gira, porque não existe modelo 3D do Mobi disponível para download. Para trocar por outro carro com 3D (por exemplo, o Fiat Argo), basta o arquivo do modelo.

### Créditos dos modelos 3D (CC BY 4.0, uso comercial permitido com crédito)

- "2019 McLaren 720S Spider" por Ddiaz Design: https://sketchfab.com/3d-models/2019-mclaren-720s-spider-d598b285dbc4408591c98aaf80648074
- "Jeep Compass 2022 Lowpoly" por Davidson: https://sketchfab.com/3d-models/jeep-compass-2022-lowpoly-e4087350c4d84d8391de09b405c96488

Os créditos também aparecem no rodapé do site. Os modelos foram otimizados para a web (de 16 MB para 3,4 MB cada): frente alinhada, tamanho real, 4 rodas separadas, texturas WebP e compressão Meshopt.

### Adicionar outro modelo 3D

1. Baixe o modelo em glTF/GLB com licença de uso comercial.
2. Coloque o `.glb` em `models/` e preencha `glb` no carro correspondente em `js/cars.js`. Ajuste `glbRotationY` se ele vier virado e `glbLength` com o comprimento em metros.
3. Opcional: `lights3d` (posição dos faróis) e `hotspots3d` (posição dos pontos de destaque), em metros, com a frente do carro apontando para +X.

## Desempenho

- **Qualidade adaptativa**: o site começa em qualidade alta (ou média em aparelhos mais fracos) e reduz resolução, reflexo e brilho sozinho se a taxa de quadros cair. Para forçar um nível, use `?q=0` (leve), `?q=1` (média) ou `?q=2` (alta) no endereço.
- A poeira é animada na placa de vídeo, os pontos de destaque só são calculados na seção Design e a sombra só é recalculada quando algo muda.
- No modo leve, o desfoque dos painéis de vidro e a granulação são desligados.

## Como rodar

O site é estático, sem etapa de build. Como usa módulos ES, ele precisa ser aberto por um servidor HTTP, não direto do arquivo:

```bash
cd concessionaria-3d
python3 -m http.server 8000
# abra http://localhost:8000
```

Ele pode ser publicado em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel). As bibliotecas estão em `vendor/`, sem dependência de CDN.

## Personalizar

- Carros, preços, especificações, cores e textos dos destaques: array `MODELS` em `js/cars.js`. **Os preços e as fichas técnicas são valores de referência: confira com a sua tabela.**
- Fotos dos cartões do estoque: `assets/*.webp`. Para novos carros, recorte o fundo da foto (PNG/WebP com transparência) e aponte `cutout` para o arquivo.
- Ângulos de câmera por seção: objeto `KEYS` em `js/main.js`.
- Cores e fontes do site: variáveis no topo de `css/style.css`.
- O formulário de contato só mostra uma mensagem de confirmação. Para receber os pedidos, ligue o `submit` (em `js/main.js`) a um backend, WhatsApp ou serviço de formulários.
