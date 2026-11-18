// =====================================================================
//  CATÁLOGO: categorias e produtos (dados de exemplo, edite à vontade).
//
//  Produto:
//    slug        identificador da URL (sem espaço nem acento)
//    nome, marca, categoria (slug da categoria), preco
//    precoAntigo opcional: mostra o preço riscado
//    tamanhos    lista de { t: "M", estoque: 3 }; deixe [] para tamanho único
//    selo        opcional: "Destaque" | "Últimas unidades" | "Promo"
//    novidade    true para aparecer em "Novidades"
//    imagens     lista de URLs (ex.: "img/camiseta-1.jpg"); vazio = ilustração automática
// =====================================================================
window.CATEGORIAS = [
  { slug: "camisetas", nome: "Camisetas", icone: "shirt" },
  { slug: "tenis", nome: "Tênis", icone: "sneaker" },
  { slug: "bones", nome: "Bonés", icone: "cap" },
  { slug: "calcas", nome: "Calças", icone: "pants" },
  { slug: "moletons", nome: "Moletons", icone: "hoodie" },
  { slug: "skate", nome: "Skate e Peças", icone: "skate" },
  { slug: "relogios", nome: "Relógios", icone: "watch" },
  { slug: "bermudas", nome: "Bermudas", icone: "shorts" },
  { slug: "mochilas", nome: "Mochilas e Bags", icone: "bag" },
  { slug: "acessorios", nome: "Acessórios", icone: "star" },
];

const T = (lista, estoque = 4) => lista.map((t) => ({ t, estoque }));
const ROUPA = ["P", "M", "G", "GG"];
const CALCA = ["38", "40", "42", "44", "46"];
const TENIS = ["37", "38", "39", "40", "41", "42", "43"];
const INFANTIL = ["10", "12", "14", "16"];

window.PRODUTOS = [
  // ---- Camisetas
  { slug: "camiseta-concreto-logo", nome: "Camiseta Concreto Logo", marca: "Concreto", categoria: "camisetas", preco: 129.9, tamanhos: T(ROUPA), novidade: true },
  { slug: "camiseta-concreto-oversized", nome: "Camiseta Concreto Oversized Preta", marca: "Concreto", categoria: "camisetas", preco: 149.9, tamanhos: T(ROUPA), selo: "Destaque" },
  { slug: "camiseta-asfalto-college", nome: "Camiseta Asfalto College", marca: "Asfalto Co.", categoria: "camisetas", preco: 139.9, tamanhos: T(["M", "G", "GG", "XG"]) },
  { slug: "camiseta-asfalto-listrada", nome: "Camiseta Asfalto Listrada", marca: "Asfalto Co.", categoria: "camisetas", preco: 119.9, precoAntigo: 149.9, tamanhos: T(ROUPA), selo: "Promo" },
  { slug: "camiseta-vila-sport", nome: "Camiseta Vila Sport Classic", marca: "Vila", categoria: "camisetas", preco: 159.9, tamanhos: T(ROUPA) },
  { slug: "camiseta-vila-stone", nome: "Camiseta Vila Stone Wash Marrom", marca: "Vila", categoria: "camisetas", preco: 109.9, tamanhos: [{ t: "G", estoque: 1 }], selo: "Últimas unidades" },
  { slug: "camiseta-concreto-infantil", nome: "Camiseta Concreto Tag Infantil", marca: "Concreto", categoria: "camisetas", preco: 99.9, tamanhos: T(INFANTIL), novidade: true },
  { slug: "kit-3-camisetas-asfalto", nome: "Kit 3 Camisetas Asfalto Básicas", marca: "Asfalto Co.", categoria: "camisetas", preco: 329.9, tamanhos: T(ROUPA), novidade: true },

  // ---- Tênis
  { slug: "tenis-passo-imigrante", nome: "Tênis Passo Imigrante Preto e Branco", marca: "Passo", categoria: "tenis", preco: 435.0, tamanhos: T(TENIS), selo: "Destaque", novidade: true },
  { slug: "tenis-passo-quina", nome: "Tênis Passo Quina Essencial", marca: "Passo", categoria: "tenis", preco: 399.9, tamanhos: T(TENIS) },
  { slug: "tenis-passo-serie-x", nome: "Tênis Passo Série X Khaki", marca: "Passo", categoria: "tenis", preco: 465.0, tamanhos: T(TENIS), selo: "Destaque" },
  { slug: "tenis-rampa-court-low", nome: "Tênis Rampa Court Low", marca: "Rampa", categoria: "tenis", preco: 599.9, tamanhos: T(["38", "39", "40", "41", "42", "43"]) },
  { slug: "tenis-rampa-big-low", nome: "Tênis Rampa Big Low", marca: "Rampa", categoria: "tenis", preco: 549.9, tamanhos: T(["39", "40", "41", "42"]), novidade: true },
  { slug: "tenis-passo-fluente", nome: "Tênis Passo Fluente Impermeável", marca: "Passo", categoria: "tenis", preco: 459.9, tamanhos: T(TENIS) },

  // ---- Bonés
  { slug: "bone-concreto-bomb", nome: "Boné Concreto Bomb", marca: "Concreto", categoria: "bones", preco: 149.9, tamanhos: [], novidade: true },
  { slug: "bone-concreto-five-panel", nome: "Boné Concreto Five Panel Tela", marca: "Concreto", categoria: "bones", preco: 149.9, tamanhos: [] },
  { slug: "bone-asfalto-pesponto", nome: "Boné Asfalto Pesponto", marca: "Asfalto Co.", categoria: "bones", preco: 139.9, tamanhos: [] },
  { slug: "bone-rampa-dad-hat", nome: "Boné Rampa Dad Hat", marca: "Rampa", categoria: "bones", preco: 169.9, tamanhos: [], selo: "Destaque" },
  { slug: "bone-vila-racing", nome: "Boné Vila Racing Laranja", marca: "Vila", categoria: "bones", preco: 159.9, tamanhos: [] },

  // ---- Calças
  { slug: "calca-vila-jeans-light", nome: "Calça Jeans Vila Light Blue", marca: "Vila", categoria: "calcas", preco: 365.0, tamanhos: T(CALCA), novidade: true },
  { slug: "calca-vila-relaxed-black", nome: "Calça Jeans Vila Relaxed Black", marca: "Vila", categoria: "calcas", preco: 355.0, tamanhos: [{ t: "40", estoque: 1 }, { t: "44", estoque: 1 }], selo: "Últimas unidades" },
  { slug: "calca-concreto-pocket", nome: "Calça Concreto Pocket", marca: "Concreto", categoria: "calcas", preco: 299.9, tamanhos: T(ROUPA) },
  { slug: "calca-concreto-cargo", nome: "Calça Sarja Concreto Cargo Box", marca: "Concreto", categoria: "calcas", preco: 319.9, tamanhos: T(ROUPA) },
  { slug: "calca-asfalto-baggy", nome: "Calça Jeans Asfalto Baggy", marca: "Asfalto Co.", categoria: "calcas", preco: 339.9, tamanhos: T(CALCA), selo: "Destaque" },

  // ---- Moletons
  { slug: "moletom-concreto-canguru", nome: "Moletom Concreto Canguru", marca: "Concreto", categoria: "moletons", preco: 349.9, tamanhos: T(ROUPA), novidade: true },
  { slug: "moletom-vila-careca", nome: "Moletom Vila Careca Cinza", marca: "Vila", categoria: "moletons", preco: 289.9, tamanhos: T(ROUPA) },
  { slug: "moletom-asfalto-ziper", nome: "Moletom Asfalto Zíper", marca: "Asfalto Co.", categoria: "moletons", preco: 379.9, tamanhos: T(ROUPA), selo: "Destaque" },
  { slug: "jaqueta-rampa-corta-vento", nome: "Jaqueta Rampa Corta-Vento", marca: "Rampa", categoria: "moletons", preco: 429.9, tamanhos: T(ROUPA) },

  // ---- Skate
  { slug: "shape-rampa-8", nome: "Shape Rampa Maple 8.0", marca: "Rampa", categoria: "skate", preco: 289.9, tamanhos: [] },
  { slug: "rodas-rampa-53", nome: "Rodas Rampa 53mm (jogo)", marca: "Rampa", categoria: "skate", preco: 199.9, tamanhos: [] },
  { slug: "lixa-rampa", nome: "Lixa Rampa Preta", marca: "Rampa", categoria: "skate", preco: 59.9, tamanhos: [] },

  // ---- Relógios
  { slug: "relogio-tempo-digital", nome: "Relógio Tempo Digital Preto", marca: "Tempo", categoria: "relogios", preco: 349.9, tamanhos: [], novidade: true },
  { slug: "relogio-tempo-classic", nome: "Relógio Tempo Classic Prata", marca: "Tempo", categoria: "relogios", preco: 499.9, tamanhos: [] },

  // ---- Bermudas
  { slug: "bermuda-concreto-jorts", nome: "Bermuda Concreto Jorts", marca: "Concreto", categoria: "bermudas", preco: 289.9, tamanhos: T(ROUPA), novidade: true },
  { slug: "bermuda-concreto-combat", nome: "Bermuda Concreto Combat", marca: "Concreto", categoria: "bermudas", preco: 229.9, tamanhos: T(ROUPA) },
  { slug: "short-vila-nylon", nome: "Short Nylon Vila", marca: "Vila", categoria: "bermudas", preco: 189.9, tamanhos: [{ t: "G", estoque: 1 }], selo: "Últimas unidades" },

  // ---- Mochilas
  { slug: "mochila-asfalto-urban", nome: "Mochila Asfalto Urban", marca: "Asfalto Co.", categoria: "mochilas", preco: 259.9, tamanhos: [] },
  { slug: "shoulder-bag-concreto", nome: "Shoulder Bag Concreto", marca: "Concreto", categoria: "mochilas", preco: 129.9, tamanhos: [], novidade: true },

  // ---- Acessórios
  { slug: "meia-concreto-kit", nome: "Kit 3 Meias Concreto", marca: "Concreto", categoria: "acessorios", preco: 69.9, tamanhos: [] },
  { slug: "carteira-vila", nome: "Carteira Vila Couro", marca: "Vila", categoria: "acessorios", preco: 99.9, tamanhos: [] },
];

// Descrição padrão para quem não tiver uma própria
window.PRODUTOS.forEach((p) => {
  p.descricao =
    p.descricao ||
    `${p.nome}, da ${p.marca}. Produto 100% original, com envio imediato. Dúvidas sobre medidas? Chama a gente no WhatsApp.`;
  p.imagens = p.imagens || [];
});
