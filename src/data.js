export const DATA = {
  filiais: [
    {
      id: 1,
      nome: "Unidade Centro",
      regiao: "Centro",
      endereco: "Rua Principal, 100 — Centro\nPróximo ao Terminal de Ônibus",
      telefone: '+5511900000001',
      whatsapp: '5511900000001',
      horario: { abre: 9, fecha: 19 },
      mapsUrl: "https://maps.google.com/maps?q=Rua+Senador+Salgado+Filho+95,Vicente+de+Carvalho,Guarujá,SP,Brasil&output=embed",
      descricao: "Nossa unidade mais tradicional, localizada no coração da cidade. Com anos de história, o ambiente combina o charme clássico das barbearias de antigamente com técnicas modernas. Cadeiras vintage, cheiro de tônico e música boa — é isso que você vai encontrar aqui.",
      stats: [{ n: "5+", l: "Anos de história" }, { n: "2.4k", l: "Clientes atendidos" }, { n: "98%", l: "Satisfação" }],
      tags: ["Estacionamento próximo", "Aceita PIX", "Wi-Fi gratuito"],
      fotos: {
        principal: '/fotos/unidade-1/principal.jpeg',
        ambiente:  '/fotos/unidade-1/ambiente.jpeg',
        detalhe:   '/fotos/unidade-1/detalhe.jpeg',
        cadeira:   '/fotos/unidade-1/cadeira.jpeg',
        produtos:  undefined,
      },
      barbeiros: [
        { nome: "Barbeiro 01", especialidade: "Todos os cortes",    nota: "5.0 ★", portfolio: ['/fotos/portfolio/unidade-1/vinicius-bryan/corte1.jpeg', '/fotos/portfolio/unidade-1/vinicius-bryan/corte2.jpeg', '/fotos/portfolio/unidade-1/vinicius-bryan/corte3.jpeg'] },
        { nome: "Barbeiro 02", especialidade: "Degradê & Navalhado", nota: "4.9 ★" },
        { nome: "Barbeiro 03", especialidade: "Corte Clássico",      nota: "4.8 ★" },
        { nome: "Barbeiro 04", especialidade: "Barba & Bigode",      nota: "4.7 ★" },
      ]
    },
    {
      id: 2,
      nome: "Unidade Zona Norte",
      regiao: "Zona Norte",
      endereco: "Av. Principal, 780 — Bairro Norte",
      telefone: '+5511900000002',
      whatsapp: '5511900000002',
      horario: { abre: 9, fecha: 19 },
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.633308!3d-23.560520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000002",
      descricao: "A unidade mais espaçosa da rede, ideal para quem quer conforto e atendimento sem pressa. Ambiente climatizado, TV e a melhor cerveja gelada da casa enquanto você aguarda. Nossa equipe é especialista em cortes modernos e tratamentos capilares.",
      stats: [{ n: "3+", l: "Anos de operação" }, { n: "1.8k", l: "Clientes atendidos" }, { n: "97%", l: "Satisfação" }],
      tags: ["Estacionamento próprio", "Aceita cartão", "Cerveja inclusa"],
      barbeiros: [
        { nome: "Barbeiro 01", especialidade: "Corte Moderno",     nota: "4.9 ★" },
        { nome: "Barbeiro 02", especialidade: "Barba Desenhada",   nota: "4.8 ★" },
        { nome: "Barbeiro 03", especialidade: "Degradê Americano", nota: "4.9 ★" },
        { nome: "Barbeiro 04", especialidade: "Corte Infantil",    nota: "4.7 ★" },
      ]
    },
    {
      id: 3,
      nome: "Unidade Zona Sul",
      regiao: "Zona Sul",
      endereco: "R. das Flores, 55 — Jardins",
      telefone: '+5511900000003',
      whatsapp: '5511900000003',
      horario: { abre: 9, fecha: 19 },
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.643308!3d-23.570520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000003",
      descricao: "Localizada no bairro mais charmoso da cidade, esta unidade tem uma pegada premium. Atendemos inclusive aos domingos para os que têm a semana cheia. Especialistas em coloração masculina, progressivas e tratamentos especiais.",
      stats: [{ n: "2+", l: "Anos de operação" }, { n: "1.2k", l: "Clientes atendidos" }, { n: "99%", l: "Satisfação" }],
      tags: ["Aberto domingo", "Tratamentos premium", "Aceita PIX/cartão"],
      barbeiros: [
        { nome: "Barbeiro 01", especialidade: "Coloração Masculina", nota: "5.0 ★" },
        { nome: "Barbeiro 02", especialidade: "Corte Premium",        nota: "4.9 ★" },
      ]
    },
    {
      id: 4,
      nome: "Unidade Zona Leste",
      regiao: "Zona Leste",
      endereco: "Av. das Palmeiras, 312 — Vila Nova",
      telefone: '+5511900000004',
      whatsapp: '5511900000004',
      horario: { abre: 9, fecha: 19 },
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.613308!3d-23.555520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000004",
      descricao: "Nossa unidade mais jovem, mas já com uma clientela fiel na região. Ambiente descolado, playlist sempre boa e profissionais antenados nas últimas tendências. Venha conferir o espaço exclusivo enquanto aguarda.",
      stats: [{ n: "1+", l: "Anos de operação" }, { n: "900+", l: "Clientes atendidos" }, { n: "96%", l: "Satisfação" }],
      tags: ["Espaço gourmet", "Aceita PIX", "Convênio empresas"],
      barbeiros: [
        { nome: "Barbeiro 01", especialidade: "Corte Street",      nota: "4.8 ★" },
        { nome: "Barbeiro 02", especialidade: "Undercut & Fade",   nota: "4.9 ★" },
        { nome: "Barbeiro 03", especialidade: "Barba Completa",    nota: "4.7 ★" },
        { nome: "Barbeiro 04", especialidade: "Dreads & Tranças",  nota: "4.8 ★" },
        { nome: "Barbeiro 05", especialidade: "Corte Clássico",    nota: "4.6 ★" },
      ]
    },
    {
      id: 5,
      nome: "Unidade Zona Oeste",
      regiao: "Zona Oeste",
      endereco: "R. Verde, 88 — Parque das Águas",
      telefone: '+5511900000005',
      whatsapp: '5511900000005',
      horario: { abre: 9, fecha: 19 },
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.653308!3d-23.545520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000005",
      descricao: "Próxima ao parque, esta unidade tem um clima tranquilo e familiar. Ideal para trazer o filho, o pai ou toda a família. Fechamos às terças para manutenção e treinamento da equipe — porque a qualidade vem do preparo.",
      stats: [{ n: "2+", l: "Anos de operação" }, { n: "1.1k", l: "Clientes atendidos" }, { n: "98%", l: "Satisfação" }],
      tags: ["Ambiente familiar", "Corte infantil", "Aceita PIX/cartão"],
      barbeiros: [
        { nome: "Barbeiro 01", especialidade: "Família & Kids",         nota: "4.9 ★" },
        { nome: "Barbeiro 02", especialidade: "Navalhado Clássico",     nota: "4.8 ★" },
        { nome: "Barbeiro 03", especialidade: "Barba & Hidratação",     nota: "4.9 ★" },
        { nome: "Barbeiro 04", especialidade: "Corte Social",            nota: "4.7 ★" },
        { nome: "Barbeiro 05", especialidade: "Degradê Texturizado",    nota: "4.8 ★" },
        { nome: "Barbeiro 06", especialidade: "Platinado & Cor",         nota: "4.6 ★" },
      ]
    }
  ],

  servicos: [
    { nome: "Corte de cabelo", preco: "R$ 45" },
    { nome: "Barba completa",  preco: "R$ 35" },
    { nome: "Corte + Barba",   preco: "R$ 70", badge: "Mais Popular" },
    { nome: "Navalhado",       preco: "R$ 50" },
    { nome: "Hidratação",      preco: "R$ 40" },
    { nome: "Coloração",       preco: "R$ 80" },
  ]
};
