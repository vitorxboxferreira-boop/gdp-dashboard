# Aurum Motors: showroom 3D

Site de uma concessionária com os carros em 3D renderizados em tempo real (Three.js + WebGL) e animações ligadas à rolagem (GSAP ScrollTrigger).

## Efeitos

- **Carros 3D gerados por código**: três modelos (superesportivo, sedã e SUV) com pintura metálica e verniz, vidros, rodas com raios, discos e pinças de freio.
- **Materialização holográfica**: o carro surge de baixo para cima por um scanner dourado, com uma malha em wireframe. O mesmo efeito acontece ao trocar de modelo.
- **Estúdio virtual**: piso espelhado com reflexo, sombras suaves, softboxes refletidas na lataria, bloom (brilho), poeira flutuando, vinheta e granulação de filme.
- **Câmera cinematográfica**: a câmera passa por um ângulo diferente em cada seção conforme você rola a página, com leve parallax do mouse.
- **Configurador**: troca de modelo, 5 cores por modelo com transição suave, faróis com feixe de luz e **Modo Sport** (rodas girando, grade do piso correndo, linhas de velocidade, vibração).
- **Hotspots 3D** na seção Design, presos a pontos do carro.
- **Estoque** com miniaturas renderizadas pelo próprio motor 3D, cartões com inclinação 3D e o botão "Ver em 3D".
- Simulador de financiamento, formulário de test-drive, cursor personalizado, botões magnéticos e layout responsivo (celular, tablet e desktop).

## Como rodar

O site é estático, sem etapa de build. Como usa módulos ES, ele precisa ser aberto por um servidor HTTP, não direto do arquivo:

```bash
cd concessionaria-3d
python3 -m http.server 8000
# abra http://localhost:8000
```

Ele pode ser publicado em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel). Three.js e GSAP já estão incluídos em `vendor/`, então não há dependência de CDN.

## Personalizar

- Modelos, preços, especificações e cores: array `MODELS` em `js/cars.js`.
- Formato da carroceria de cada modelo: objeto `BODIES` em `js/cars.js`.
- Ângulos de câmera por seção: objeto `KEYS` em `js/main.js`.
- Cores e fontes do site: variáveis no topo de `css/style.css`.
- O formulário de contato só mostra uma mensagem de confirmação. Para receber os pedidos, ligue o `submit` (em `js/main.js`) a um backend, WhatsApp ou serviço de formulários.

"Aurum Motors" é uma marca fictícia de demonstração.
