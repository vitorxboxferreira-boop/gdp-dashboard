// =====================================================================
//  CONFIGURAÇÃO DA LOJA: troque aqui o nome, contatos e textos.
//  Tudo no site lê deste arquivo.
// =====================================================================
window.LOJA = {
  nome: "Volare",
  subtitulo: "Streetwear",
  logo: "img/logo-volare-topo.png",     // logo do topo
  logoGrande: "img/logo-volare.png",    // logo grande do rodapé
  slogan: "Streetwear e skate. Direto da rua.",
  descricao:
    "Tênis, roupas, bonés, skate e acessórios das melhores marcas. Só produtos originais, com atendimento direto no WhatsApp.",

  // WhatsApp só com números: DDI + DDD + número (ex.: 5511999999999)
  whatsapp: "5555996467948",
  whatsappExibicao: "(55) 99646-7948",
  email: "",       // deixe vazio para não aparecer no site
  instagram: "volare.streetwear",
  endereco: "",    // ex.: "Rua X, 123 - Centro, Cidade / UF" (vazio = não aparece)
  horario: { dias: "Segunda a sábado", horas: "09:30 – 19:00" },

  // Regras de preço
  descontoPix: 5,       // % de desconto no Pix
  parcelasSemJuros: 7,  // em quantas vezes parcela sem juros

  // Fita rolante do topo
  avisos: ["Só original", "5% OFF no Pix", "7x sem juros", "Envio pra todo o Brasil", "Compra direto no WhatsApp"],

  // Faixa de confiança logo abaixo do banner
  beneficios: [
    { icone: "shield", titulo: "100% original", texto: "Só marcas oficiais" },
    { icone: "truck", titulo: "Envio pra todo o Brasil", texto: "Postagem imediata" },
    { icone: "pix", titulo: "5% OFF no Pix", texto: "Desconto direto no Whats" },
    { icone: "card", titulo: "7x sem juros", texto: "No cartão de crédito" },
  ],

  // Banner principal
  banner: {
    chamada: "Drop novo na área",
    titulo: ["Da rua", "pra rua."],
    texto: "Streetwear, skate e tênis originais. Escolhe, chama no Whats e é teu.",
    botao: "Ver o drop",
    link: "#/novidades",
    adesivo: "100% original",
  },

  // Frase grande entre as vitrines
  manifesto: "Feito por quem anda de skate, cola no pico e vive a rua.",

  // Vitrines da página inicial (na ordem). "novidades" e "promocoes" são especiais.
  vitrines: ["novidades", "tenis", "camisetas", "promocoes", "moletons", "bones", "skate"],

  faq: [
    {
      p: "Como faço pra comprar?",
      r: "Escolhe o produto, o tamanho (e a cor, se tiver) e clica em Comprar. Você cai no nosso WhatsApp com o pedido já escrito, aí é só confirmar.",
    },
    {
      p: "Quais formas de pagamento vocês aceitam?",
      r: "Pix (com 5% de desconto), dinheiro, transferência e cartão de crédito em até 7x sem juros.",
    },
    { p: "Vocês entregam pra todo o Brasil?", r: "Sim. Enviamos pelos Correios pra todo o país." },
    { p: "Os produtos são originais?", r: "Sim. Trabalhamos só com produtos 100% originais." },
  ],
};
