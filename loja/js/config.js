// =====================================================================
//  CONFIGURAÇÃO DA LOJA: troque aqui o nome, contatos e textos.
//  Tudo no site lê deste arquivo.
// =====================================================================
window.LOJA = {
  nome: "Bairro Store",
  slogan: "Streetwear de verdade, direto da rua.",
  descricao:
    "Tênis, roupas, bonés, acessórios e skate. Só produtos originais, com atendimento direto no WhatsApp.",

  // WhatsApp só com números: DDI + DDD + número (ex.: 5511999999999)
  whatsapp: "5500000000000",
  whatsappExibicao: "(00) 00000-0000",
  email: "contato@suaLoja.com.br",
  instagram: "sualoja",
  endereco: "Rua Exemplo, 123 - Centro, Sua Cidade / UF",
  horario: { dias: "Segunda a sábado", horas: "09:30 – 19:00" },

  // Regras de preço
  descontoPix: 5,       // % de desconto no Pix
  parcelasSemJuros: 7,  // em quantas vezes parcela sem juros

  // Faixa rolante do topo
  avisos: [
    "Somente produtos originais",
    "5% OFF no Pix",
    "Parcele em até 7x sem juros",
  ],

  // Faixa de benefícios abaixo do banner
  beneficios: [
    { icone: "truck", titulo: "Enviamos para todo o Brasil", texto: "Correios ou retirada na loja" },
    { icone: "pix", titulo: "5% OFF no Pix", texto: "Desconto direto no WhatsApp" },
    { icone: "shield", titulo: "Produtos originais", texto: "Só as melhores marcas" },
    { icone: "card", titulo: "7x sem juros", texto: "No cartão de crédito" },
  ],

  // Banner principal
  banner: {
    chamada: "Nova coleção",
    titulo: "Vista a rua.",
    texto: "Peças originais das melhores marcas de streetwear e skate.",
    botao: "Ver novidades",
    link: "#novidades",
  },

  // Categorias que aparecem como vitrine na página inicial (na ordem)
  vitrines: ["camisetas", "tenis", "bones", "calcas", "moletons"],

  faq: [
    {
      p: "Como faço para comprar?",
      r: "Escolha o produto, selecione o tamanho e clique em Comprar. Você cai no nosso WhatsApp com o pedido já preenchido, e é só confirmar.",
    },
    {
      p: "Quais formas de pagamento vocês aceitam?",
      r: "Pix (com 5% de desconto), dinheiro, transferência e cartão de crédito em até 7x sem juros.",
    },
    { p: "Vocês entregam para todo o Brasil?", r: "Sim. Enviamos pelos Correios para todo o país." },
    { p: "Os produtos são originais?", r: "Sim. Trabalhamos somente com produtos 100% originais." },
  ],
};
