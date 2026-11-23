// =====================================================================
//  CATÁLOGO: categorias e produtos (exemplos para demonstração).
//
//  Produto:
//    slug        identificador da URL (sem espaço nem acento, único)
//    nome, marca, categoria (slug da categoria), preco
//    precoAntigo opcional: mostra o preço riscado
//    tamanhos    lista de { t: "M", estoque: 3 }; [] = tamanho único
//    cores       opcional: lista de cores para o cliente escolher
//    selo        opcional: "Destaque" | "Promo" | "Últimas unidades" | "Mais vendido" | "Exclusivo"
//    novidade    true para aparecer em "Novidades"
//    imagens     lista de URLs (ex.: "img/camiseta-1.jpg"); vazio = arte automática
//    descricao   opcional
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

window.PRODUTOS = [
  {"slug": "kit-3-camisetas-wats-company", "nome": "Kit 3 Camisetas Wats Company", "marca": "Wats Company", "categoria": "camisetas", "preco": 349.9, "tamanhos": [{"t": "P", "estoque": 3}, {"t": "M", "estoque": 3}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 3}, {"t": "XG", "estoque": 3}], "novidade": true},
  {"slug": "camiseta-nike-logo", "nome": "Camiseta Nike - Logo", "marca": "Nike", "categoria": "camisetas", "preco": 139.9, "tamanhos": [{"t": "P", "estoque": 2}, {"t": "M", "estoque": 5}, {"t": "G", "estoque": 5}, {"t": "GG", "estoque": 1}], "selo": "Destaque"},
  {"slug": "camiseta-plano-c-beast", "nome": "Camiseta Plano C Beast", "marca": "Plano C", "categoria": "camisetas", "preco": 129.9, "tamanhos": [{"t": "PP", "estoque": 2}, {"t": "P", "estoque": 2}, {"t": "M", "estoque": 2}, {"t": "G", "estoque": 2}, {"t": "GG", "estoque": 0}], "novidade": true},
  {"slug": "camiseta-adidas-estampada-camo", "nome": "Camiseta Adidas Estampada Camo", "marca": "Adidas", "categoria": "camisetas", "preco": 175, "tamanhos": [{"t": "M", "estoque": 3}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 3}, {"t": "G2", "estoque": 3}], "novidade": true},
  {"slug": "camiseta-volcom-stone-watcher-preta", "nome": "Camiseta Volcom Stone Watcher Preta", "marca": "Volcom", "categoria": "camisetas", "preco": 119.9, "tamanhos": [{"t": "P", "estoque": 1}, {"t": "M", "estoque": 2}, {"t": "G", "estoque": 2}, {"t": "GG", "estoque": 1}], "novidade": true},
  {"slug": "tenis-ous-imigrante-pb-gold-essencial", "nome": "Tênis ÖUS Imigrante PB Gold Essencial", "marca": "ÖUS", "categoria": "tenis", "preco": 435, "tamanhos": [{"t": "36", "estoque": 2}, {"t": "37", "estoque": 2}, {"t": "38", "estoque": 2}, {"t": "39", "estoque": 3}, {"t": "40", "estoque": 3}, {"t": "41", "estoque": 2}, {"t": "42", "estoque": 1}, {"t": "43", "estoque": 2}, {"t": "44", "estoque": 2}], "selo": "Destaque", "novidade": true},
  {"slug": "tenis-nike-court-vision-low-masculino", "nome": "Tênis Nike Court Vision Low Masculino", "marca": "Nike", "categoria": "tenis", "preco": 599.9, "tamanhos": [{"t": "38", "estoque": 1}, {"t": "39", "estoque": 2}, {"t": "40", "estoque": 3}, {"t": "41", "estoque": 3}, {"t": "42", "estoque": 2}, {"t": "43", "estoque": 1}], "novidade": true},
  {"slug": "tenis-hocks-formiga-011-brasa", "nome": "Tênis Hocks Formiga 011 - Brasa", "marca": "Hocks", "categoria": "tenis", "preco": 395, "tamanhos": [{"t": "36", "estoque": 1}, {"t": "37", "estoque": 2}, {"t": "38", "estoque": 2}, {"t": "39", "estoque": 3}, {"t": "40", "estoque": 3}, {"t": "41", "estoque": 3}, {"t": "42", "estoque": 3}, {"t": "43", "estoque": 2}, {"t": "44", "estoque": 1}], "selo": "Destaque"},
  {"slug": "tenis-tesla-coil-black-reflect", "nome": "Tênis Tesla Coil - Black Reflect", "marca": "Tesla", "categoria": "tenis", "preco": 429.9, "tamanhos": [{"t": "34", "estoque": 1}, {"t": "35", "estoque": 3}, {"t": "36", "estoque": 2}, {"t": "37", "estoque": 2}, {"t": "38", "estoque": 4}, {"t": "39", "estoque": 3}, {"t": "40", "estoque": 3}, {"t": "41", "estoque": 3}, {"t": "42", "estoque": 1}, {"t": "44", "estoque": 4}]},
  {"slug": "tenis-freeday-switch", "nome": "Tênis Freeday Switch", "marca": "Freeday", "categoria": "tenis", "preco": 319.9, "tamanhos": [{"t": "34", "estoque": 3}, {"t": "43", "estoque": 2}, {"t": "44", "estoque": 1}]},
  {"slug": "bone-anth-co-kemp-3", "nome": "Boné Anth Co - Kemp", "marca": "Anth Co", "categoria": "bones", "preco": 65, "tamanhos": [], "selo": "Últimas unidades", "novidade": true},
  {"slug": "bone-wats-company-bomb", "nome": "Boné Wats Company - Bomb", "marca": "Wats Company", "categoria": "bones", "preco": 149.9, "tamanhos": [], "cores": ["Preto"]},
  {"slug": "bone-chronic-five-panel", "nome": "Boné Chronic Five Panel", "marca": "Chronic", "categoria": "bones", "preco": 135, "tamanhos": [], "selo": "Últimas unidades"},
  {"slug": "bone-nike-2", "nome": "Boné Nike", "marca": "Nike", "categoria": "bones", "preco": 189.9, "tamanhos": [{"t": "P", "estoque": 3}, {"t": "M", "estoque": 3}, {"t": "G", "estoque": 3}], "selo": "Últimas unidades"},
  {"slug": "chapeu-volcom-stone", "nome": "Chapéu Volcom - Stone", "marca": "Volcom", "categoria": "bones", "preco": 209.9, "tamanhos": []},
  {"slug": "bone-trucker-grafite", "nome": "Boné Trucker Grafite", "marca": "", "categoria": "bones", "preco": 129.9, "tamanhos": [], "selo": "Exclusivo", "novidade": true},
  {"slug": "calca-jeans-plano-c-light-blue", "nome": "Calça Jeans Plano C - Light Blue", "marca": "Plano C", "categoria": "calcas", "preco": 365, "tamanhos": [{"t": "38", "estoque": 3}, {"t": "40", "estoque": 3}, {"t": "42", "estoque": 3}, {"t": "44", "estoque": 3}, {"t": "46", "estoque": 3}], "cores": ["Azul"], "novidade": true},
  {"slug": "calca-jeans-wats-company-zat-baggy", "nome": "Calça Jeans Wats Company - Zat Baggy", "marca": "Wats Company", "categoria": "calcas", "preco": 275, "precoAntigo": 320, "tamanhos": [{"t": "P", "estoque": 2}, {"t": "M", "estoque": 2}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 0}], "selo": "Promo", "novidade": true},
  {"slug": "calca-jeans-chocolate-baggy", "nome": "Calça Jeans Chocolate Baggy", "marca": "Chocolate", "categoria": "calcas", "preco": 285, "precoAntigo": 345, "tamanhos": [{"t": "42", "estoque": 2}, {"t": "44", "estoque": 3}], "selo": "Promo"},
  {"slug": "calca-moletom-nike-jogger", "nome": "Calça Moletom Nike Jogger", "marca": "Nike", "categoria": "calcas", "preco": 179.9, "precoAntigo": 320, "tamanhos": [{"t": "P", "estoque": 1}], "cores": ["Cinza"], "selo": "Promo"},
  {"slug": "calca-drop-dead-classic-90s-marbled-jeans-azul", "nome": "Calça Drop Dead Classic 90S Marbled Jeans Azul", "marca": "Drop Dead", "categoria": "calcas", "preco": 199.9, "precoAntigo": 275, "tamanhos": [{"t": "44", "estoque": 1}, {"t": "46", "estoque": 1}], "selo": "Promo"},
  {"slug": "calca-jogger-moletom-preta", "nome": "Calça Jogger Moletom Preta", "marca": "", "categoria": "calcas", "preco": 169.9, "tamanhos": [{"t": "P", "estoque": 3}, {"t": "M", "estoque": 3}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 3}], "novidade": true},
  {"slug": "moletom-santa-cruz-screaming-slime", "nome": "Moletom Santa Cruz - Screaming Slime", "marca": "Santa Cruz", "categoria": "moletons", "preco": 209.9, "precoAntigo": 420, "tamanhos": [{"t": "P", "estoque": 0}, {"t": "G", "estoque": 2}], "selo": "Mais vendido"},
  {"slug": "moletom-volcom-circlestoned", "nome": "Moletom Volcom - Circlestoned", "marca": "Volcom", "categoria": "moletons", "preco": 195, "precoAntigo": 389.9, "tamanhos": [{"t": "M", "estoque": 2}, {"t": "P", "estoque": 1}, {"t": "GG", "estoque": 1}, {"t": "G", "estoque": 1}], "selo": "Promo"},
  {"slug": "moletom-chocolate", "nome": "Moletom Chocolate", "marca": "Chocolate", "categoria": "moletons", "preco": 150, "precoAntigo": 289.9, "tamanhos": [{"t": "P", "estoque": 1}, {"t": "M", "estoque": 2}, {"t": "G", "estoque": 1}], "selo": "Promo"},
  {"slug": "mometom-dropdead-classic", "nome": "Moletom Drop Dead - Classic", "marca": "Drop Dead", "categoria": "moletons", "preco": 209.9, "precoAntigo": 300, "tamanhos": [{"t": "P", "estoque": 2}, {"t": "M", "estoque": 1}, {"t": "G", "estoque": 2}, {"t": "GG", "estoque": 2}], "selo": "Promo"},
  {"slug": "corta-vento-wats-company-logo", "nome": "Corta-vento Wats Company - Logo", "marca": "Wats Company", "categoria": "moletons", "preco": 195, "precoAntigo": 379.9, "tamanhos": [{"t": "P", "estoque": 1}, {"t": "M", "estoque": 2}, {"t": "G", "estoque": 2}], "selo": "Últimas unidades"},
  {"slug": "skate-completo-hondar-monster-azul", "nome": "Skate completo Hondar - Monster Azul", "marca": "Hondar", "categoria": "skate", "preco": 385, "tamanhos": []},
  {"slug": "skate-montado-chaze-monster-vermelho", "nome": "Skate Montado Chaze - Monster Vermelho", "marca": "Chaze", "categoria": "skate", "preco": 385, "tamanhos": []},
  {"slug": "shape-milk-maple-8-5", "nome": "Shape Milk Maple 8.5", "marca": "Milk", "categoria": "skate", "preco": 345, "tamanhos": []},
  {"slug": "truck-lyons-vazado-importado", "nome": "Truck Lyons vazado importado", "marca": "Lyons", "categoria": "skate", "preco": 299.9, "tamanhos": [{"t": "139", "estoque": 3}, {"t": "149", "estoque": 3}]},
  {"slug": "roda-lyons-lisa", "nome": "Roda Lyons Lisa", "marca": "Lyons", "categoria": "skate", "preco": 75, "tamanhos": [{"t": "52", "estoque": 3}]},
  {"slug": "truck-anodizado-roxo-139", "nome": "Truck Anodizado Roxo 139mm (par)", "marca": "", "categoria": "skate", "preco": 289.9, "tamanhos": [], "selo": "Destaque", "novidade": true},
  {"slug": "truck-anodizado-dourado-139", "nome": "Truck Anodizado Dourado 139mm (par)", "marca": "", "categoria": "skate", "preco": 289.9, "tamanhos": [], "novidade": true},
  {"slug": "relogio-casio-digital-analogico-feminino-bege", "nome": "Relógio Casio / Digital - Analógico - Feminino / Bege", "marca": "Casio", "categoria": "relogios", "preco": 565, "tamanhos": [], "selo": "Últimas unidades"},
  {"slug": "relogio-casio-analogico-mdv-10-1a1v", "nome": "Relógio Casio Analógico - MDV-10-1A1V", "marca": "Casio", "categoria": "relogios", "preco": 589.9, "tamanhos": []},
  {"slug": "relogio-g-shock-digital-analogico-ga-2100-1a1dr", "nome": "Relógio G-SHOCK / Digital - Analógico GA-2100-1A1DR", "marca": "Casio", "categoria": "relogios", "preco": 549.9, "tamanhos": [], "selo": "Mais vendido"},
  {"slug": "relogio-g-shock-digital-analogico", "nome": "Relógio G-SHOCK / Digital - Analógico", "marca": "Casio", "categoria": "relogios", "preco": 699.9, "tamanhos": [], "selo": "Exclusivo"},
  {"slug": "relogio-casio-vintage-aq-230el-1a", "nome": "Relógio Casio Vintage - AQ-230EL-1A", "marca": "Casio", "categoria": "relogios", "preco": 525, "tamanhos": [], "selo": "Últimas unidades"},
  {"slug": "relogio-casio-duro-azul", "nome": "Relógio Casio Duro MDV-106 Azul", "marca": "Casio", "categoria": "relogios", "preco": 599.9, "tamanhos": [], "novidade": true},
  {"slug": "bermuda-wats-company-nylon-faixa", "nome": "Bermuda Wats Company - Nylon Faixa", "marca": "Wats Company", "categoria": "bermudas", "preco": 235, "tamanhos": [{"t": "P", "estoque": 2}, {"t": "M", "estoque": 3}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 3}], "novidade": true},
  {"slug": "short-nylon-plano-c", "nome": "Short Nylon Plano C", "marca": "Plano C", "categoria": "bermudas", "preco": 189.9, "tamanhos": [{"t": "G1", "estoque": 2}], "selo": "Últimas unidades"},
  {"slug": "bermuda-hocks-sint-c-elastano", "nome": "Bermuda Hocks - Sint C/Elastano", "marca": "Hocks", "categoria": "bermudas", "preco": 185, "precoAntigo": 239.9, "tamanhos": [{"t": "P", "estoque": 1}, {"t": "M", "estoque": 1}, {"t": "G", "estoque": 2}, {"t": "GG", "estoque": 1}, {"t": "XG", "estoque": 2}], "selo": "Promo"},
  {"slug": "shorts-adidas-essentials-linear-logo", "nome": "Shorts Adidas Essentials Linear Logo", "marca": "Adidas", "categoria": "bermudas", "preco": 199.9, "tamanhos": [{"t": "M", "estoque": 3}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 3}, {"t": "G2", "estoque": 3}], "selo": "Mais vendido"},
  {"slug": "bermuda-chocolate-2", "nome": "Bermuda Chocolate", "marca": "Chocolate", "categoria": "bermudas", "preco": 209.9, "precoAntigo": 285, "tamanhos": [{"t": "38", "estoque": 0}, {"t": "40", "estoque": 2}, {"t": "42", "estoque": 1}, {"t": "44", "estoque": 2}, {"t": "46", "estoque": 1}], "selo": "Promo"},
  {"slug": "mala-hocks", "nome": "Mala Hocks", "marca": "Hocks", "categoria": "mochilas", "preco": 235, "tamanhos": []},
  {"slug": "wats-company-bag-lateral", "nome": "Wats Company Bag Lateral", "marca": "Wats Company", "categoria": "mochilas", "preco": 179.9, "tamanhos": []},
  {"slug": "mochila-roxy", "nome": "Mochila Roxy", "marca": "Roxy", "categoria": "mochilas", "preco": 185, "tamanhos": []},
  {"slug": "mochila-quik-silver-2", "nome": "Mochila Quiksilver", "marca": "Quiksilver", "categoria": "mochilas", "preco": 199.9, "tamanhos": []},
  {"slug": "mochila-dc", "nome": "Mochila DC", "marca": "DC", "categoria": "mochilas", "preco": 279.9, "tamanhos": []},
  {"slug": "carteira-volcom", "nome": "Carteira Volcom", "marca": "Volcom", "categoria": "acessorios", "preco": 149.9, "tamanhos": [{"t": "Único", "estoque": 3}]},
  {"slug": "meia-cano-baixo-hocks", "nome": "Meia Cano Baixo Hocks", "marca": "Hocks", "categoria": "acessorios", "preco": 35, "tamanhos": []},
  {"slug": "kit-2-cuecas-plano-c", "nome": "Kit 2 Cuecas Plano C", "marca": "Plano C", "categoria": "acessorios", "preco": 85, "tamanhos": [{"t": "P", "estoque": 6}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 4}]},
  {"slug": "cueca-wats", "nome": "Cueca Wats", "marca": "Wats Company", "categoria": "acessorios", "preco": 59.9, "tamanhos": [{"t": "P", "estoque": 4}, {"t": "M", "estoque": 1}, {"t": "G", "estoque": 3}, {"t": "GG", "estoque": 2}]},
  {"slug": "touca-nike", "nome": "Touca Nike", "marca": "Nike", "categoria": "acessorios", "preco": 139.9, "precoAntigo": 195, "tamanhos": [], "selo": "Promo"}
];

window.PRODUTOS.forEach((p) => {
  p.imagens = p.imagens || [];
  p.tamanhos = p.tamanhos || [];
  p.descricao =
    p.descricao ||
    `${p.nome}${p.marca ? `, da ${p.marca}` : ""}. Produto 100% original, com envio imediato. Dúvida sobre medida ou cor? Chama no WhatsApp.`;
});
