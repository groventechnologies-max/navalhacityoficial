import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuração via variáveis de ambiente no painel Supabase:
//   SUPABASE_URL           — preenchido automaticamente
//   SUPABASE_SERVICE_ROLE_KEY — preenchido automaticamente
//   ZAPI_URL               — ex: https://api.z-api.io/instances/SEU_ID/token/SEU_TOKEN
//
// Para disparar a cada 10 minutos, ative pg_cron no Supabase e rode:
//   select cron.schedule(
//     'lembrete-whatsapp',
//     '*/10 * * * *',
//     $$ select net.http_post(
//          url:='https://SEU_PROJECT_ID.supabase.co/functions/v1/lembrete-whatsapp',
//          headers:='{"Authorization":"Bearer SEU_ANON_KEY"}'::jsonb
//        ) $$
//   );

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  // Hardening: exige header Authorization (cron job passa ANON_KEY ou um shared secret).
  // Sem isso, a função fica acessível por qualquer um que descubra a URL e dispara WhatsApps em massa.
  const authHeader = req.headers.get('authorization') ?? ''
  const expected   = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!authHeader.startsWith('Bearer ') || !expected || authHeader.slice(7) !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const agora   = new Date()
  const em50min = new Date(agora.getTime() + 50 * 60_000)
  const em70min = new Date(agora.getTime() + 70 * 60_000)

  const { data: agendamentos, error } = await supabase
    .from('agendamentos')
    .select('id, cliente_nome, cliente_tel, barbeiro, servico, horario, filial_id')
    .gte('horario', em50min.toISOString())
    .lte('horario', em70min.toISOString())
    .in('status', ['confirmado', 'pendente'])

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 })
  }

  const zapiUrl = Deno.env.get('ZAPI_URL')
  let enviados = 0, falhas = 0, semApi = 0

  for (const ag of agendamentos ?? []) {
    const rawTel = (ag.cliente_tel ?? '').replace(/\D/g, '')
    if (rawTel.length < 10) continue

    const d    = new Date(ag.horario)
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

    // Sanitiza nome pra não quebrar formatação WhatsApp (caracteres * _ ~ `)
    const nomeSeguro = String(ag.cliente_nome ?? '').replace(/[*_~`]/g, '')

    const msg = [
      `⏰ *Lembrete — Navalha City*`,
      ``,
      `Olá, ${nomeSeguro}! Seu agendamento é em aproximadamente 1 hora.`,
      ``,
      `💈 *Barbeiro:* ${ag.barbeiro}`,
      `✂️ *Serviço:* ${ag.servico}`,
      `🕐 *Horário:* ${hora}`,
      ``,
      `Te esperamos! ✂️`,
    ].join('\n')

    const phone = `55${rawTel}`

    if (!zapiUrl) { semApi++; continue }

    try {
      const resp = await fetch(`${zapiUrl}/send-text`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone, message: msg }),
      })
      if (resp.ok) enviados++; else falhas++
    } catch (_e) {
      falhas++
    }
  }

  // Não retorna telefones nem nomes na response (response é logada por padrão).
  return Response.json({
    ok:        true,
    janela:    `${em50min.toISOString()} → ${em70min.toISOString()}`,
    total:     agendamentos?.length ?? 0,
    enviados,
    falhas,
    sem_api:   semApi,
  })
})
