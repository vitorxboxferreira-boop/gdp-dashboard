# Aurum Motors: showroom virtual

Site de concessionária com os carros reais (Fiat Mobi Trekking, Jeep Compass S e McLaren 720S Spider) dentro de um estúdio 3D em tempo real (Three.js + WebGL), com animações ligadas à rolagem (GSAP ScrollTrigger) e rolagem suave (Lenis).

## Como os carros são exibidos

Hoje cada carro é a **foto real com o fundo recortado** (`assets/*-cut.webp`), colocada no estúdio 3D:

- Piso espelhado com reflexo do carro, sombra de contato, luzes, poeira flutuando e brilho (bloom).
- O carro surge de baixo para cima por um scanner dourado e um feixe de luz percorre a lataria de tempos em tempos.
- **Troca de cor** no Mobi e no McLaren: uma máscara da pintura (`assets/*-paint.webp`) separa reflexo e cor, então preto, branco e prata ficam realistas. O Compass, por ser cinza, mantém a cor da foto.
- **Faróis** acendem com brilho e reflexo de lente; o **Modo Sport** liga linhas de velocidade, grade do piso correndo e vibração.
- Pontos clicáveis com os destaques de cada carro na seção Design.

### Trocar por modelos 3D de verdade (giro 360°)

1. Consiga o modelo em `.glb` (Sketchfab, CGTrader, TurboSquid ou o material oficial da montadora, com licença de uso comercial).
2. Coloque o arquivo em `models/`, por exemplo `models/fiat-mobi.glb`.
3. Em `js/cars.js`, preencha `glb: 'models/fiat-mobi.glb'` no carro correspondente. Se o modelo vier virado, ajuste `glbRotationY` (em radianos); `glbLength` define o comprimento em metros.

O site detecta sozinho a pintura (para a troca de cor), as rodas (que giram no Modo Sport) e os faróis pelos nomes das peças no arquivo. Arquivos com compressão Draco ou Meshopt também funcionam.

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
