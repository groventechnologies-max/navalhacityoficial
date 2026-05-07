export const DATA = {
  filiais: [
    {
      id: 1,
      nome: "Unidade 1",
      regiao: "Centro Histórico",
      endereco: "Rua das Flores, 142 — Centro\nTel: (13) 98800-1001 · Seg–Sáb 09h–20h",
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.633308!3d-23.550520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000001",
      descricao: "Nossa unidade mais tradicional, localizada no coração da cidade. Com mais de 5 anos de história, o ambiente combina o charme clássico das barbearias de antigamente com técnicas modernas. Cadeiras vintage, cheiro de tônico e música boa — é isso que você vai encontrar aqui.",
      stats: [{ n: "5+", l: "Anos de história" }, { n: "2.4k", l: "Clientes atendidos" }, { n: "98%", l: "Satisfação" }],
      tags: ["Estacionamento próximo", "Aceita PIX", "Wi-Fi gratuito"],
      fotos: {
        principal: '/fotos/unidade-1/principal.jpeg',
        ambiente:  '/fotos/unidade-1/ambiente.jpeg',
        detalhe:   '/fotos/unidade-1/detalhe.jpeg',
        cadeira:   '/fotos/unidade-1/cadeira.jpeg',
        produtos:  null,
      },
      barbeiros: [
        { nome: "Vinicius Bryan", foto: '/fotos/barbeiros/unidade-1/vinicius-bryan.jpeg', especialidade: "Todos os cortes", nota: "5.0 ★", badge: "Recomendado" },
        { nome: "Rafael Costa",   emoji: "💈", especialidade: "Degradê & Navalhado",  nota: "4.9 ★" },
        { nome: "Diego Mendes",   emoji: "✂️", especialidade: "Corte Clássico",        nota: "4.8 ★" },
        { nome: "Bruno Alves",    emoji: "🪒", especialidade: "Barba & Bigode",        nota: "4.7 ★" },
      ]
    },
    {
      id: 2,
      nome: "Unidade 2",
      regiao: "Zona Norte",
      endereco: "Av. Boa Vista, 780 — Bairro Boa Vista\nTel: (13) 98800-1002 · Seg–Sáb 09h–21h",
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.633308!3d-23.560520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000002",
      descricao: "A unidade mais espaçosa da rede, ideal para quem quer conforto e atendimento sem pressa. Ambiente climatizado, TV e a melhor cerveja gelada da casa enquanto você aguarda. Nossa equipe na Unidade 2 é especialista em cortes modernos e tratamentos capilares.",
      stats: [{ n: "3+", l: "Anos de operação" }, { n: "1.8k", l: "Clientes atendidos" }, { n: "97%", l: "Satisfação" }],
      tags: ["Estacionamento próprio", "Aceita cartão", "Cerveja inclusa"],
      barbeiros: [
        { nome: "Mateus Lima",   emoji: "💈", especialidade: "Corte Moderno",         nota: "4.9 ★", badge: "Recomendado" },
        { nome: "Gustavo Neto",  emoji: "✂️", especialidade: "Barba Desenhada",       nota: "4.8 ★" },
        { nome: "Felipe Torres", emoji: "🪒", especialidade: "Degradê Americano",     nota: "4.9 ★" },
        { nome: "André Souza",   emoji: "💈", especialidade: "Corte Infantil",         nota: "4.7 ★" },
      ]
    },
    {
      id: 3,
      nome: "Unidade 3",
      regiao: "Zona Sul",
      endereco: "R. dos Ipês, 55 — Jardins\nTel: (13) 98800-1003 · Seg–Dom 08h–20h",
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.643308!3d-23.570520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000003",
      descricao: "Localizada no bairro mais charmoso da cidade, a Unidade 3 tem uma pegada premium. Atendemos inclusive aos domingos para os que têm a semana cheia. Especialistas em coloração masculina, progressivas e tratamentos especiais.",
      stats: [{ n: "2+", l: "Anos de operação" }, { n: "1.2k", l: "Clientes atendidos" }, { n: "99%", l: "Satisfação" }],
      tags: ["Aberto domingo", "Tratamentos premium", "Aceita PIX/cartão"],
      barbeiros: [
        { nome: "Caio Ferreira",  emoji: "✂️", especialidade: "Coloração Masculina",  nota: "5.0 ★", badge: "Recomendado" },
        { nome: "Leonardo Paz",   emoji: "💈", especialidade: "Corte Premium",         nota: "4.9 ★" },
      ]
    },
    {
      id: 4,
      nome: "Unidade 4",
      regiao: "Zona Leste",
      endereco: "Av. das Palmeiras, 312 — Vila Esperança\nTel: (13) 98800-1004 · Seg–Sáb 10h–20h",
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.613308!3d-23.555520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000004",
      descricao: "Nossa unidade mais jovem, mas já com uma clientela fiel na região leste. Ambiente descolado, playlist sempre boa e profissionais antenados nas últimas tendências. Venha conferir o espaço gamer exclusivo enquanto espera.",
      stats: [{ n: "1+", l: "Anos de operação" }, { n: "900+", l: "Clientes atendidos" }, { n: "96%", l: "Satisfação" }],
      tags: ["Espaço gamer", "Aceita PIX", "Convênio empresas"],
      barbeiros: [
        { nome: "Thiago Ramos",  emoji: "💈", especialidade: "Corte Street",          nota: "4.8 ★", badge: "Recomendado" },
        { nome: "Vitor Hugo",    emoji: "✂️", especialidade: "Undercut & Fade",       nota: "4.9 ★" },
        { nome: "Samuel Dias",   emoji: "🪒", especialidade: "Barba Completa",        nota: "4.7 ★" },
        { nome: "João Pedro",    emoji: "💈", especialidade: "Dreads & Tranças",      nota: "4.8 ★" },
        { nome: "Lucas Freitas", emoji: "✂️", especialidade: "Corte Clássico",        nota: "4.6 ★" },
      ]
    },
    {
      id: 5,
      nome: "Unidade 5",
      regiao: "Zona Oeste",
      endereco: "R. Verde, 88 — Parque das Águas\nTel: (13) 98800-1005 · Ter–Dom 09h–19h",
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3656.7!2d-46.653308!3d-23.545520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDMzJzAxLjkiUyA0NsKwMzgnMDAuMCJX!5e0!3m2!1spt-BR!2sbr!4v1610000005",
      descricao: "Próxima ao Parque das Águas, nossa unidade oeste tem um clima tranquilo e familiar. Ideal para trazer o filho, o pai ou toda a família. Fechamos às terças para manutenção e treinamento da equipe — porque a qualidade vem do preparo.",
      stats: [{ n: "2+", l: "Anos de operação" }, { n: "1.1k", l: "Clientes atendidos" }, { n: "98%", l: "Satisfação" }],
      tags: ["Ambiente familiar", "Corte infantil", "Aceita PIX/cartão"],
      barbeiros: [
        { nome: "Paulo Henrique", emoji: "💈", especialidade: "Família & Kids",        nota: "4.9 ★", badge: "Recomendado" },
        { nome: "Rodrigo Melo",   emoji: "✂️", especialidade: "Navalhado Clássico",    nota: "4.8 ★" },
        { nome: "Marcos Silva",   emoji: "🪒", especialidade: "Barba & Hidratação",    nota: "4.9 ★" },
        { nome: "Eduardo Lima",   emoji: "💈", especialidade: "Corte Social",           nota: "4.7 ★" },
        { nome: "Henrique Costa", emoji: "✂️", especialidade: "Degradê Texturizado",   nota: "4.8 ★" },
        { nome: "Fábio Rocha",    emoji: "🪒", especialidade: "Platinado & Cor",        nota: "4.6 ★" },
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
