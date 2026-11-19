/* Glamour — catálogo da coleção em destaque.
 * Edite aqui nomes, preços, cores e tamanhos: o site inteiro
 * (cartões, filtro de valor e aba de detalhes) é gerado a partir desta lista.
 * Preços em reais (número inteiro). */
window.GLAMOUR_CATALOG = {
  sizes: ['36', '38', '40', '42', '44', '46'],

  /* Tabela de medidas de referência (cm) */
  sizeGuide: [
    { size: '36', bust: '82–85', waist: '64–67', hip: '90–93' },
    { size: '38', bust: '86–89', waist: '68–71', hip: '94–97' },
    { size: '40', bust: '90–93', waist: '72–75', hip: '98–101' },
    { size: '42', bust: '94–97', waist: '76–79', hip: '102–105' },
    { size: '44', bust: '98–102', waist: '80–84', hip: '106–110' },
    { size: '46', bust: '103–107', waist: '85–89', hip: '111–115' }
  ],

  priceRanges: [
    { id: 'todos', label: 'Todos' },
    { id: 'ate-800', label: 'Até R$ 800', max: 800 },
    { id: '800-1000', label: 'R$ 800 a R$ 1.000', min: 801, max: 1000 },
    { id: 'acima-1000', label: 'Acima de R$ 1.000', min: 1001 }
  ],

  products: [
    {
      id: 'ameixa',
      name: 'Vestido Ombro a Ombro Ameixa',
      desc: 'Decote ombro a ombro e caimento acinturado, em tom profundo e sofisticado.',
      details: 'Modelagem longa e ajustada ao corpo, com decote ombro a ombro que valoriza colo e ombros. Ideal para eventos noturnos e cerimônias.',
      fabric: 'Crepe com elastano',
      price: 890,
      image: 'assets/img/dress-ameixa.webp', w: 720, h: 1025, pos: '50% 20%',
      alt: 'Vestido longo ombro a ombro na cor ameixa',
      colors: [
        { name: 'Ameixa', hex: '#5B1A3A' },
        { name: 'Preto', hex: '#1E1C1F' },
        { name: 'Azul-marinho', hex: '#1F2A4A' },
        { name: 'Esmeralda', hex: '#1F5A4A' }
      ]
    },
    {
      id: 'vermelho',
      name: 'Vestido Fluido Vermelho',
      desc: 'Saia ampla e leve, que ganha movimento a cada passo. Presença marcante.',
      details: 'Corpo acinturado e saia evasê de muito volume e leveza. Perfeito para festas ao ar livre, formaturas e casamentos.',
      fabric: 'Musseline',
      price: 790,
      image: 'assets/img/dress-vermelho.webp', w: 720, h: 865, pos: '50% 40%',
      alt: 'Vestido longo vermelho de saia fluida em movimento',
      colors: [
        { name: 'Vermelho', hex: '#B3121F' },
        { name: 'Pink', hex: '#C2185B' },
        { name: 'Azul-royal', hex: '#2541A8' },
        { name: 'Lilás', hex: '#A58BD0' }
      ]
    },
    {
      id: 'renda',
      name: 'Vestido Renda Azul-Noite',
      desc: 'Renda delicada com mangas longas, para uma elegância clássica e atemporal.',
      details: 'Renda trabalhada com forro, mangas longas e recortes estratégicos na cintura. Elegante para mães dos noivos e eventos formais.',
      fabric: 'Renda com forro em cetim',
      price: 1090,
      image: 'assets/img/dress-renda.webp', w: 720, h: 960, pos: '50% 25%',
      alt: 'Vestido de renda azul-noite com mangas longas',
      colors: [
        { name: 'Azul-noite', hex: '#232A5C' },
        { name: 'Preto', hex: '#1E1C1F' },
        { name: 'Verde-oliva', hex: '#556B3A' }
      ]
    },
    {
      id: 'serenity',
      name: 'Vestido Transpassado Serenity',
      desc: 'Decote transpassado e fenda lateral em tom suave, leve e romântico.',
      details: 'Decote em V transpassado, faixa na cintura e fenda lateral. Uma escolha leve e romântica para madrinhas e convidadas.',
      fabric: 'Chiffon',
      price: 690,
      image: 'assets/img/dress-serenity.webp', w: 720, h: 1080, pos: '50% 30%',
      alt: 'Vestido longo azul-claro transpassado com fenda',
      colors: [
        { name: 'Serenity', hex: '#A9C2DE' },
        { name: 'Rosé', hex: '#E3B5B8' },
        { name: 'Lavanda', hex: '#BBA6D6' },
        { name: 'Champagne', hex: '#E6D3B3' }
      ]
    },
    {
      id: 'marfim',
      name: 'Vestido Bordado Marfim',
      desc: 'Bordados delicados e saia rodada em tom marfim, para momentos inesquecíveis.',
      details: 'Bordados aplicados à mão no corpo e saia rodada com camadas de tule. Uma peça de destaque para ocasiões únicas.',
      fabric: 'Tule bordado',
      price: 1290,
      image: 'assets/img/dress-marfim.webp', w: 720, h: 900, pos: '50% 35%',
      alt: 'Vestido longo marfim bordado com saia rodada',
      colors: [
        { name: 'Marfim', hex: '#EFE7D6' },
        { name: 'Nude', hex: '#D9B9A0' },
        { name: 'Prata', hex: '#C9C9CC' }
      ]
    },
    {
      id: 'rubi',
      name: 'Vestido Rubi com Cauda',
      desc: 'Modelagem marcante com cauda esvoaçante. Para quem quer ser lembrada.',
      details: 'Mangas longas, corpo estruturado e cauda esvoaçante que cria uma silhueta inesquecível na entrada e nas fotos.',
      fabric: 'Crepe e chiffon',
      price: 1190,
      image: 'assets/img/dress-rubi.webp', w: 720, h: 1080, pos: '50% 30%',
      alt: 'Modelo com vestido vermelho rubi com cauda longa',
      colors: [
        { name: 'Rubi', hex: '#9B111E' },
        { name: 'Preto', hex: '#1E1C1F' },
        { name: 'Esmeralda', hex: '#1F5A4A' }
      ]
    }
  ]
};
