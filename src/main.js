import { DATA } from './data.js'
import { supabase } from './supabase.js'

// ─── UTILS ───────────────────────────────────────────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isPhone(str) {
  return !/\S+@\S+\.\S+/.test(str)
}

// ─── STATE ───────────────────────────────────────────────
let currentStep    = 0
let isLoggedIn     = false
let currentUser    = null
let sessionLoading = false  // guarda contra dupla chamada

const state = {
  filial:   null,
  barbeiro: null,
  servico:  null,
  dia:      null,
  horario:  null,
}

// ─── AUTH: carregar sessão existente ─────────────────────
async function loadSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) await applySession(session)
}

async function applySession(session) {
  // Evita chamadas simultâneas (race condition entre loadSession e onAuthStateChange)
  if (sessionLoading) return
  sessionLoading = true

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, telefone, role, filial_id')
      .eq('id', session.user.id)
      .single()

    // Fallback para metadata do auth caso o trigger ainda não tenha rodado
    const meta = session.user.user_metadata || {}

    currentUser = {
      nome:      profile?.nome      || meta.nome      || session.user.email?.split('@')[0] || 'Usuário',
      telefone:  profile?.telefone  || meta.telefone  || '',
      role:      profile?.role      || 'cliente',
      filial_id: profile?.filial_id || null,
    }
    isLoggedIn = true
    updateNavLoginBtns()
  } finally {
    sessionLoading = false
  }
}

function updateNavLoginBtns() {
  document.querySelectorAll('.nav-login-btn').forEach(btn => {
    if (isLoggedIn && currentUser) {
      btn.textContent = currentUser.nome.split(' ')[0]
      btn.classList.add('logged')
    } else {
      btn.textContent = 'Login'
      btn.classList.remove('logged')
    }
  })
}

// ─── AUTH: registro ──────────────────────────────────────
// Retorna { needsConfirm: true } quando precisa confirmar email
async function handleRegister(nome, email, telefone, senha) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome, telefone } },
  })

  if (error) throw new Error(error.message)

  if (data.session) {
    await applySession(data.session)
    return { needsConfirm: false }
  } else {
    // Sem sessão — Supabase está com confirmação de email ativa
    return { needsConfirm: true }
  }
}

// ─── AUTH: login ─────────────────────────────────────────
async function handleLogin(identifier, senha) {
  let email = identifier

  if (isPhone(identifier)) {
    const { data, error } = await supabase.rpc('get_email_by_phone', {
      p_telefone: identifier,
    })
    if (error || !data) throw new Error('Telefone não encontrado. Tente com o e-mail.')
    email = data
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    if (error.message === 'Email not confirmed') {
      throw new Error('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.')
    }
    throw new Error('E-mail/telefone ou senha incorretos.')
  }

  await applySession(data.session)
}

// ─── AUTH: logout ────────────────────────────────────────
async function handleLogout() {
  await supabase.auth.signOut()
  isLoggedIn  = false
  currentUser = null
  updateNavLoginBtns()
  const confirmSection = document.getElementById('confirmSection')
  if (confirmSection) confirmSection.innerHTML = renderConfirmSection()
}

// ─── MODAL DE LOGIN ──────────────────────────────────────
window.openLoginModal = (mode = 'login') => {
  const modal = document.getElementById('loginModal')
  if (!modal) return
  modal.classList.add('open')
  applyLoginMode(mode)
  ;['loginNome', 'loginIdentifier', 'loginEmail', 'loginTel', 'loginSenha'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  clearModalMessage()
}

function applyLoginMode(mode) {
  document.getElementById('loginModalMode').value = mode
  const isReg = mode === 'register'
  document.getElementById('loginModalTitle').textContent    = isReg ? 'Criar conta'    : 'Entrar na conta'
  document.getElementById('loginModalBtn').textContent      = isReg ? 'Criar conta'    : 'Entrar'
  document.getElementById('fieldNome').style.display        = isReg ? 'block' : 'none'
  document.getElementById('fieldEmail').style.display       = isReg ? 'block' : 'none'
  document.getElementById('fieldWhats').style.display       = isReg ? 'block' : 'none'
  document.getElementById('fieldIdentifier').style.display  = isReg ? 'none'  : 'block'
  document.getElementById('loginSwitchText').textContent    = isReg ? 'Já tem conta?'  : 'Não tem conta?'
  document.getElementById('loginSwitchLink').textContent    = isReg ? 'Fazer login'    : 'Criar conta grátis'
}

window.toggleLoginMode = () => {
  const current = document.getElementById('loginModalMode').value
  applyLoginMode(current === 'login' ? 'register' : 'login')
  ;['loginNome', 'loginIdentifier', 'loginEmail', 'loginTel', 'loginSenha'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
  clearModalMessage()
}

window.toggleSenha = () => {
  const input = document.getElementById('loginSenha')
  input.type = input.type === 'password' ? 'text' : 'password'
}

window.closeLoginModal = () => {
  const modal = document.getElementById('loginModal')
  if (modal) modal.classList.remove('open')
}

// ─── MENSAGENS NO MODAL ──────────────────────────────────
function showModalMessage(text, type = 'error') {
  let el = document.getElementById('loginModalMsg')
  if (!el) {
    el = document.createElement('div')
    el.id = 'loginModalMsg'
    const btn = document.getElementById('loginModalBtn')
    btn.parentNode.insertBefore(el, btn)
  }
  el.textContent = text
  el.style.cssText = `
    padding: 12px 16px;
    margin-bottom: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    letter-spacing: 1px;
    line-height: 1.5;
    border-radius: 2px;
    border: 1px solid ${type === 'error' ? '#c0392b' : '#27ae60'};
    color: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
    background: ${type === 'error' ? 'rgba(192,57,43,0.08)' : 'rgba(39,174,96,0.08)'};
  `
}

function clearModalMessage() {
  const el = document.getElementById('loginModalMsg')
  if (el) el.remove()
}

// ─── SUBMIT LOGIN/REGISTRO ───────────────────────────────
window.submitLogin = async () => {
  const mode  = document.getElementById('loginModalMode').value
  const senha = document.getElementById('loginSenha').value.trim()
  const btn   = document.getElementById('loginModalBtn')

  clearModalMessage()

  if (!senha) { showModalMessage('Informe sua senha.'); return }

  const originalText = btn.textContent
  btn.textContent = 'Aguarde...'
  btn.disabled    = true

  try {
    if (mode === 'register') {
      const nome     = document.getElementById('loginNome').value.trim()
      const email    = document.getElementById('loginEmail').value.trim()
      const telefone = document.getElementById('loginTel').value.trim()

      if (!nome || !email || !telefone) {
        showModalMessage('Preencha todos os campos.')
        return
      }

      const result = await handleRegister(nome, email, telefone, senha)

      if (result.needsConfirm) {
        // Mostra mensagem de sucesso em verde e não fecha o modal
        showModalMessage('Conta criada! Verifique seu e-mail e clique no link de confirmação para ativar.', 'success')
        btn.textContent = originalText
        btn.disabled    = false
        return
      }

      closeLoginModal()
      updateNavLoginBtns()
      const cs1 = document.getElementById('confirmSection')
      if (cs1) cs1.innerHTML = renderConfirmSection()

    } else {
      const identifier = document.getElementById('loginIdentifier').value.trim()
      if (!identifier) { showModalMessage('Informe seu WhatsApp ou e-mail.'); return }

      await handleLogin(identifier, senha)
      closeLoginModal()
      updateNavLoginBtns()
      const cs2 = document.getElementById('confirmSection')
      if (cs2) cs2.innerHTML = renderConfirmSection()
    }

  } catch (err) {
    showModalMessage(err.message || 'Erro inesperado. Tente novamente.')
  } finally {
    // Sempre reativa o botão, independente do resultado
    btn.disabled    = false
    btn.textContent = originalText
  }
}

window.logoutUser = () => handleLogout()

// ─── MÁSCARA DE TELEFONE ─────────────────────────────────
function applyPhoneMask(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11)
    if (v.length <= 10) {
      // Fixo: (11) 1234-5678
      v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    } else {
      // Celular: (11) 91234-5678
      v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    }
    input.value = v.replace(/-$/, '')
  })
}

// ─── MODAL DE PERFIL ─────────────────────────────────────
window.openProfileModal = () => {
  const modal = document.getElementById('profileModal')
  if (!modal || !currentUser) return
  document.getElementById('profileNome').value  = currentUser.nome     || ''
  document.getElementById('profileTel').value   = currentUser.telefone || ''
  document.getElementById('profileSenha').value = ''
  document.getElementById('profileSenhaConfirm').value = ''
  clearProfileMessage()
  modal.classList.add('open')
  loadHistorico()
}

async function loadHistorico() {
  const container = document.getElementById('profileHistorico')
  if (!container) return
  container.innerHTML = `<div style="color:var(--muted);font-size:12px;letter-spacing:1px;padding:8px 0">Carregando...</div>`

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('agendamentos')
      .select('servico, barbeiro, horario, status, filial_id')
      .eq('cliente_id', user.id)
      .order('horario', { ascending: false })
      .limit(10)

    if (error) throw error

    if (!data || data.length === 0) {
      container.innerHTML = `<div style="color:var(--muted);font-size:12px;letter-spacing:1px;padding:8px 0">Nenhum agendamento ainda.</div>`
      return
    }

    const mesesPt = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const statusColor = { confirmado: '#2ecc71', pendente: '#f39c12', cancelado: '#e74c3c' }

    container.innerHTML = data.map(ag => {
      const d    = new Date(ag.horario)
      const dia  = String(d.getDate()).padStart(2,'0')
      const mes  = mesesPt[d.getMonth()]
      const hora = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      const cor  = statusColor[ag.status] || '#888'
      const filialNome = DATA.filiais.find(f => f.id === ag.filial_id)?.nome || `Unidade ${ag.filial_id}`
      return `
        <div style="
          padding: 12px 14px;
          margin-bottom: 8px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 4px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px;
          letter-spacing: 0.5px;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="color:var(--white);font-weight:600">${escapeHTML(ag.servico)}</span>
            <span style="color:${cor};font-size:11px;letter-spacing:1px;text-transform:uppercase">${ag.status}</span>
          </div>
          <div style="color:var(--muted)">
            ${escapeHTML(ag.barbeiro)} · ${escapeHTML(filialNome)}
          </div>
          <div style="color:var(--muted);font-size:11px;margin-top:3px">
            ${dia}/${mes} às ${hora}
          </div>
        </div>
      `
    }).join('')
  } catch (err) {
    container.innerHTML = `<div style="color:#e74c3c;font-size:12px">Erro ao carregar histórico.</div>`
  }
}

window.closeProfileModal = () => {
  document.getElementById('profileModal')?.classList.remove('open')
}

window.toggleProfileSenha = () => {
  const input = document.getElementById('profileSenha')
  input.type = input.type === 'password' ? 'text' : 'password'
}

function showProfileMessage(text, type = 'error') {
  let el = document.getElementById('profileModalMsg')
  if (!el) {
    el = document.createElement('div')
    el.id = 'profileModalMsg'
    const btn = document.getElementById('profileSaveBtn')
    btn.parentNode.insertBefore(el, btn)
  }
  el.textContent = text
  el.style.cssText = `
    padding: 12px 16px;
    margin-bottom: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    letter-spacing: 1px;
    line-height: 1.5;
    border-radius: 2px;
    border: 1px solid ${type === 'error' ? '#c0392b' : '#27ae60'};
    color: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
    background: ${type === 'error' ? 'rgba(192,57,43,0.08)' : 'rgba(39,174,96,0.08)'};
  `
}

function clearProfileMessage() {
  document.getElementById('profileModalMsg')?.remove()
}

window.saveProfile = async () => {
  const nome    = document.getElementById('profileNome').value.trim()
  const tel     = document.getElementById('profileTel').value.trim()
  const senha   = document.getElementById('profileSenha').value
  const confirm = document.getElementById('profileSenhaConfirm').value
  const btn     = document.getElementById('profileSaveBtn')

  clearProfileMessage()

  if (!nome) { showProfileMessage('Informe seu nome.'); return }
  if (senha && senha.length < 6) { showProfileMessage('A senha precisa ter pelo menos 6 caracteres.'); return }
  if (senha && senha !== confirm) { showProfileMessage('As senhas não coincidem.'); return }

  btn.textContent = 'Salvando...'
  btn.disabled    = true

  try {
    // Atualiza o perfil no banco
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nome, telefone: tel })
      .eq('id', (await supabase.auth.getUser()).data.user.id)

    if (profileError) throw new Error(profileError.message)

    // Atualiza senha se informada
    if (senha) {
      const { error: passError } = await supabase.auth.updateUser({ password: senha })
      if (passError) throw new Error(passError.message)
    }

    // Atualiza estado local
    currentUser.nome     = nome
    currentUser.telefone = tel
    updateNavLoginBtns()

    showProfileMessage('Alterações salvas com sucesso!', 'success')
    document.getElementById('profileSenha').value        = ''
    document.getElementById('profileSenhaConfirm').value = ''
  } catch (err) {
    showProfileMessage(err.message || 'Erro ao salvar. Tente novamente.')
  } finally {
    btn.textContent = 'Salvar alterações'
    btn.disabled    = false
  }
}


// ─── NAVEGAÇÃO ───────────────────────────────────────────
function goToStep(n) {
  if (n === currentStep) return
  const from = document.getElementById(`step-${currentStep}`)
  const to   = document.getElementById(`step-${n}`)
  if (!from || !to) return
  from.classList.remove('active')
  to.classList.add('active')
  to.scrollTop = 0
  window.scrollTo(0, 0)
  currentStep = n
}

// ─── STEP 1: FILIAIS ─────────────────────────────────────
function renderFiliais() {
  const el = document.getElementById('filiaisList')

  el.innerHTML = Array(5).fill(0).map(() => `
    <div class="filial-item sk-card">
      <div class="filial-header">
        <div class="filial-left">
          <div class="sk sk-num"></div>
          <div>
            <div class="sk sk-title"></div>
            <div class="sk sk-sub"></div>
          </div>
        </div>
      </div>
    </div>
  `).join('')

  setTimeout(() => {
    el.innerHTML = DATA.filiais.map(f => `
      <div class="filial-item" id="filial-${f.id}">
        <div class="filial-header" onclick="toggleFilial(${f.id})">
          <div class="filial-left">
            <div class="filial-num">0${f.id}</div>
            <div class="filial-info">
              <h3>${f.nome}</h3>
              <p>${f.regiao}</p>
            </div>
          </div>
          <div class="filial-arrow">▼</div>
        </div>
        <div class="filial-body">
          <div class="filial-content">
            <div class="filial-address">
              <h4>Endereço</h4>
              <p>${f.endereco.replace(/\n/g, '<br>')}</p>
              <div class="filial-tags">
                ${f.tags.map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
              <button class="btn-select" onclick="selecionarFilial(${f.id})">
                Escolher esta unidade →
              </button>
            </div>
            <div class="filial-map">
              <iframe src="${f.mapsUrl}" allowfullscreen loading="lazy"></iframe>
              <div class="map-overlay"></div>
            </div>
          </div>
        </div>
      </div>
    `).join('')
  }, 600)
}

window.toggleFilial = (id) => {
  const el     = document.getElementById(`filial-${id}`)
  if (!el) return
  const isOpen = el.classList.contains('open')
  document.querySelectorAll('.filial-item').forEach(i => i.classList.remove('open'))
  if (!isOpen) el.classList.add('open')
}

window.selecionarFilial = (id) => {
  state.filial   = DATA.filiais.find(f => f.id === id)
  state.barbeiro = null
  renderPerfil()
  goToStep(2)
}

// ─── STEP 2: PERFIL + BARBEIROS ──────────────────────────
function renderPerfil() {
  const f = state.filial

  document.getElementById('profileContent').innerHTML = `
    <div class="section-label">${f.nome} — ${f.regiao}</div>

    <div class="profile-photos-wrap">
      <div class="profile-photos" id="photosCarousel">
        ${[
          { key: 'principal', label: 'Foto Principal' },
          { key: 'ambiente',  label: 'Ambiente' },
          { key: 'detalhe',   label: 'Detalhe' },
          { key: 'cadeira',   label: 'Cadeira' },
          { key: 'produtos',  label: 'Produtos' },
        ].map(({ key, label }) => {
          const url = f.fotos && f.fotos[key]
          return `<div class="photo-placeholder${url ? ' has-photo' : ''}" data-label="${label}">
            ${url ? `<img src="${url}" alt="${label}">` : ''}
          </div>`
        }).join('')}
      </div>
      <button class="photo-nav photo-nav-prev" onclick="scrollPhotos(-1)">←</button>
      <button class="photo-nav photo-nav-next" onclick="scrollPhotos(1)">→</button>
      <div class="photo-counter" id="photoCounter">1 / 5</div>
    </div>

    <div class="profile-desc">
      <div>
        <h2 class="profile-desc-title">${f.nome}</h2>
        <p class="profile-desc-text">${f.descricao}</p>
      </div>
      <div class="profile-stats">
        ${f.stats.map(s => `
          <div class="stat">
            <div class="stat-num">${s.n}</div>
            <div class="stat-label">${s.l}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="barbers-label">Passo 02 — Escolha seu barbeiro</div>
    <div class="barbers-title">${f.barbeiros.length} Profissionais Disponíveis</div>

    <div class="barbers-grid">
      ${f.barbeiros.map((b, i) => `
        <div class="barber-card" id="barber-${i}" onclick="selecionarBarbeiro(${i})">
          <div class="selected-badge">Selecionado</div>
          ${b.badge ? `<div class="barber-badge">${b.badge}</div>` : ''}
          <div class="barber-photo">
            ${b.foto ? `<img src="${b.foto}" alt="${b.nome}">` : (b.emoji || '✂️')}
          </div>
          <div class="barber-info">
            <div class="barber-name">${b.nome}</div>
            <div class="barber-specialty">${b.especialidade}</div>
            <div class="barber-rating">${b.nota} · Disponível</div>
          </div>
        </div>
      `).join('')}
    </div>

    <footer class="step-footer">
      <div class="logo-ft">Navalha<span>City</span></div>
      <div class="footer-sub">© 2025 Navalha City · Desenvolvido pela <a href="https://groven.netlify.app/" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;opacity:0.7;">Groven</a></div>
    </footer>
  `
}

window.scrollPhotos = (dir) => {
  const el = document.getElementById('photosCarousel')
  if (!el) return
  el.scrollBy({ left: dir * el.offsetWidth, behavior: 'smooth' })
  setTimeout(() => {
    const idx     = Math.round(el.scrollLeft / el.offsetWidth) + 1
    const counter = document.getElementById('photoCounter')
    if (counter) counter.textContent = `${idx} / 5`
  }, 320)
}

window.selecionarBarbeiro = (idx) => {
  document.querySelectorAll('.barber-card').forEach(c => c.classList.remove('selected'))
  const card = document.getElementById(`barber-${idx}`)
  if (card) card.classList.add('selected')
  state.barbeiro = state.filial.barbeiros[idx]
  renderAgendamento()
  goToStep(3)
}

// ─── STEP 3: AGENDAMENTO ─────────────────────────────────
function renderAgendamento() {
  document.getElementById('scheduleContent').innerHTML = `
    <div class="section-label">Passo 03 — Marque seu horário</div>
    <h2 class="section-title" style="margin-bottom:32px">Agendamento</h2>

    <div class="schedule-context">
      <div class="context-chip">
        <div class="context-dot"></div>
        <div>
          <div class="chip-label">Unidade</div>
          <div class="chip-value">${state.filial.nome}</div>
        </div>
      </div>
      <div class="context-chip">
        <div class="context-dot"></div>
        <div>
          <div class="chip-label">Barbeiro</div>
          <div class="chip-value">${state.barbeiro.nome}</div>
        </div>
      </div>
    </div>

    ${state.barbeiro.portfolio && state.barbeiro.portfolio.length ? `
    <div class="sched-block">
      <div class="sched-label">Trabalhos de ${state.barbeiro.nome}</div>
      <div class="portfolio-strip">
        ${state.barbeiro.portfolio.map(src => `
          <div class="portfolio-item">
            <img src="${src}" alt="Corte">
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="sched-block">
      <div class="sched-label">Serviço desejado</div>
      <div class="services-grid">
        ${DATA.servicos.map((s, i) => `
          <div class="service-item${s.badge ? ' has-badge' : ''}" id="svc-${i}" onclick="selecionarServico(${i})">
            ${s.badge ? `<span class="svc-badge">${s.badge}</span>` : ''}
            <div class="svc-row">
              <span class="service-name">${s.nome}</span>
              <span class="service-price">${s.preco}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="sched-block">
      <div class="sched-label">Escolha a data</div>
      <div class="avail-bar" id="availBar">
        <div class="avail-dot"></div>
        <span id="availText">Selecione uma data</span>
      </div>
      <div class="days-strip" id="daysStrip"></div>
      <div class="times-grid" id="timesGrid"></div>
    </div>

    <div id="confirmSection">${renderConfirmSection()}</div>

    <footer class="step-footer">
      <div class="logo-ft">Navalha<span>City</span></div>
      <div class="footer-sub">© 2025 Navalha City · Desenvolvido pela <a href="https://groven.netlify.app/" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;opacity:0.7;">Groven</a></div>
    </footer>
  `

  renderDias()
}

function renderConfirmSection() {
  if (!isLoggedIn) {
    return `
      <div class="login-wall">
        <div class="login-wall-icon">🔒</div>
        <div class="login-wall-title">Faça login para continuar</div>
        <p class="login-wall-sub">Para confirmar seu agendamento, você precisa estar logado.</p>
        <button class="btn-login-wall" onclick="openLoginModal()">Entrar na minha conta</button>
        <div class="login-wall-register">Não tem conta? <a href="#" onclick="openLoginModal('register'); return false;">Criar conta grátis</a></div>
      </div>
    `
  }
  return `
    <div class="confirm-form">
      <div class="confirm-form-user">
        <div class="confirm-form-user-avatar">${currentUser.nome.charAt(0).toUpperCase()}</div>
        <div>
          <div class="confirm-form-user-name">${escapeHTML(currentUser.nome)}</div>
          <button class="confirm-form-logout" onclick="logoutUser()">Sair</button>
        </div>
      </div>
      <h4>Confirme seus dados</h4>
      <div class="form-row">
        <input class="form-input" type="text" id="clientName"  placeholder="Seu nome completo" value="${escapeHTML(currentUser.nome)}">
        <input class="form-input" type="tel"  id="clientPhone" placeholder="WhatsApp"          value="${escapeHTML(currentUser.telefone)}">
      </div>
      <textarea class="form-input" rows="3" id="clientObs" placeholder="Observações (opcional)" style="resize:none;width:100%"></textarea>
      <button class="btn-confirm" onclick="confirmarAgendamento()">Confirmar Agendamento</button>
    </div>
  `
}

window.selecionarServico = (i) => {
  document.querySelectorAll('.service-item').forEach(s => s.classList.remove('selected'))
  const svc = document.getElementById(`svc-${i}`)
  if (svc) svc.classList.add('selected')
  state.servico = DATA.servicos[i]
}

function renderDias() {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const months   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const today    = new Date()

  document.getElementById('daysStrip').innerHTML = Array.from({ length: 14 }, (_, i) => {
    const d    = new Date(today)
    d.setDate(today.getDate() + i + 1)
    const wd   = weekdays[d.getDay()]
    const dn   = d.getDate()
    const mon  = months[d.getMonth()]
    const label = `${wd} ${dn}/${mon}`
    return `
      <div class="day-btn" id="day-${i}" onclick="selecionarDia(${i}, '${label}')">
        <div class="day-weekday">${wd}</div>
        <div class="day-num">${dn}</div>
        <div class="day-month" style="font-size:10px;opacity:0.6">${mon}</div>
      </div>
    `
  }).join('')

  document.getElementById('timesGrid').innerHTML = ''
}

const HORARIOS = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00']

// Converte label "Seg 12/Mai" + horario "09:00" → ISO datetime string
function labelParaISO(label, horario) {
  const meses = { Jan:0, Fev:1, Mar:2, Abr:3, Mai:4, Jun:5, Jul:6, Ago:7, Set:8, Out:9, Nov:10, Dez:11 }
  // label ex: "Seg 12/Mai"
  const partes = label.split(' ')[1].split('/')
  const dia    = parseInt(partes[0])
  const mes    = meses[partes[1]]
  const ano    = new Date().getFullYear()
  const [h, m] = horario.split(':').map(Number)
  const d = new Date(ano, mes, dia, h, m)
  // Ajusta virada de ano: se data ficou no passado > 6 meses, é ano que vem
  if (d < new Date() && (new Date() - d) > 180 * 864e5) d.setFullYear(ano + 1)
  return d.toISOString()
}

window.selecionarDia = async (i, label) => {
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'))
  const dayBtn = document.getElementById(`day-${i}`)
  if (dayBtn) dayBtn.classList.add('selected')
  state.dia    = label
  state.diaIdx = i
  state.horario = null

  // Mostra loading nos horários enquanto busca
  const timesGrid = document.getElementById('timesGrid')
  const availText = document.getElementById('availText')
  const availBar  = document.getElementById('availBar')
  if (timesGrid) timesGrid.innerHTML = `<div style="color:var(--muted);font-size:13px;letter-spacing:1px;padding:8px 0">Verificando disponibilidade...</div>`
  if (availBar)  availBar.classList.add('active')
  if (availText) availText.textContent = 'Carregando...'

  await renderHorarios(label)
}

async function renderHorarios(label) {
  const timesGrid = document.getElementById('timesGrid')
  const availText = document.getElementById('availText')

  // Busca horários já ocupados no banco para esse barbeiro+dia
  let ocupados = new Set()
  try {
    const meses = { Jan:0, Fev:1, Mar:2, Abr:3, Mai:4, Jun:5, Jul:6, Ago:7, Set:8, Out:9, Nov:10, Dez:11 }
    const partes = label.split(' ')[1].split('/')
    const dia    = parseInt(partes[0])
    const mes    = meses[partes[1]]
    const ano    = new Date().getFullYear()
    const dataInicio = new Date(ano, mes, dia, 0, 0, 0).toISOString()
    const dataFim    = new Date(ano, mes, dia, 23, 59, 59).toISOString()

    const { data } = await supabase
      .from('agendamentos')
      .select('horario')
      .eq('filial_id',   state.filial.id)
      .eq('barbeiro',    state.barbeiro.nome)
      .gte('horario',    dataInicio)
      .lte('horario',    dataFim)
      .in('status',      ['confirmado', 'pendente'])

    if (data) data.forEach(row => {
      const h = new Date(row.horario)
      ocupados.add(`${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}`)
    })
  } catch (_) { /* falha silenciosa — mostra tudo disponível */ }

  const disponiveis = HORARIOS.filter(h => !ocupados.has(h)).length
  if (availText) availText.textContent = `${disponiveis} horário${disponiveis !== 1 ? 's' : ''} disponível${disponiveis !== 1 ? 'is' : ''}`

  if (!timesGrid) return
  timesGrid.innerHTML = HORARIOS.map((h, i) => {
    const indisponivel = ocupados.has(h)
    return `
      <div class="time-btn ${indisponivel ? 'unavailable' : ''}"
           id="time-${i}"
           onclick="selecionarHorario(${i}, '${h}')">
        ${h}
      </div>
    `
  }).join('')
}

window.selecionarHorario = (i, h) => {
  const btn = document.getElementById(`time-${i}`)
  if (!btn || btn.classList.contains('unavailable')) return
  document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'))
  btn.classList.add('selected')
  state.horario = h
}

window.confirmarAgendamento = async () => {
  const nome = document.getElementById('clientName')?.value.trim()
  const tel  = document.getElementById('clientPhone')?.value.trim()

  if (!nome || !tel) { alert('Preencha seu nome e WhatsApp.'); return }
  if (!state.servico || !state.dia || !state.horario) {
    alert('Selecione o serviço, a data e o horário.')
    return
  }

  const btn = document.querySelector('#confirmSection .btn-confirm')
  if (!btn) return
  btn.textContent = 'Reservando...'
  btn.disabled    = true

  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('agendamentos').insert({
      cliente_id:  user.id,
      filial_id:   state.filial.id,
      barbeiro:    state.barbeiro.nome,
      servico:     state.servico.nome,
      preco:       state.servico.preco,
      horario:     labelParaISO(state.dia, state.horario),
      observacoes: document.getElementById('clientObs')?.value.trim() || null,
      status:      'confirmado',
    })

    if (error) throw new Error(error.message)

    const details = document.getElementById('confirmDetails')
    if (details) {
      details.innerHTML = `
        <div><strong>Cliente:</strong> ${escapeHTML(nome)}</div>
        <div><strong>Unidade:</strong> ${escapeHTML(state.filial.nome)}</div>
        <div><strong>Barbeiro:</strong> ${escapeHTML(state.barbeiro.nome)}</div>
        <div><strong>Serviço:</strong> ${escapeHTML(state.servico.nome)} — <span class="hl">${escapeHTML(state.servico.preco)}</span></div>
        <div><strong>Data:</strong> ${escapeHTML(state.dia)} às <span class="hl">${escapeHTML(state.horario)}</span></div>
        <div style="margin-top:10px;font-size:13px;color:var(--muted)">Confirmação para <span class="hl">${escapeHTML(tel)}</span></div>
      `
    }
    goToStep(4)
  } catch (err) {
    alert('Erro ao confirmar: ' + (err.message || 'Tente novamente.'))
    btn.textContent = 'Confirmar Agendamento'
    btn.disabled    = false
  }
}

// ─── RESET ───────────────────────────────────────────────
function resetFlow() {
  Object.assign(state, { filial: null, barbeiro: null, servico: null, dia: null, horario: null })
  goToStep(0)
}

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSession()

  renderFiliais()

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && !isLoggedIn) {
      await applySession(session)
    } else if (event === 'SIGNED_OUT') {
      isLoggedIn  = false
      currentUser = null
      updateNavLoginBtns()
    }
  })

  document.getElementById('loginModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLoginModal()
  })

  document.querySelectorAll('.nav-login-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isLoggedIn) openProfileModal()
      else openLoginModal()
    })
  })

  // Máscara de telefone em todos os campos de tel
  ;['loginTel', 'profileTel'].forEach(id => {
    const el = document.getElementById(id)
    if (el) applyPhoneMask(el)
  })

  document.getElementById('btnAgendar').addEventListener('click', () => goToStep(1))
  document.getElementById('back1').addEventListener('click',      () => goToStep(0))
  document.getElementById('back2').addEventListener('click',      () => goToStep(1))
  document.getElementById('back3').addEventListener('click',      () => goToStep(2))
  document.getElementById('btnReset').addEventListener('click',   resetFlow)

  // Swipe para voltar
  let _tx = null, _ty = null
  document.addEventListener('touchstart', e => {
    if (e.target.closest('.profile-photos') || e.target.closest('.days-strip')) { _tx = null; return }
    _tx = e.changedTouches[0].screenX
    _ty = e.changedTouches[0].screenY
  }, { passive: true })
  document.addEventListener('touchend', e => {
    if (_tx === null) return
    const dx = e.changedTouches[0].screenX - _tx
    const dy = e.changedTouches[0].screenY - _ty
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 0 && currentStep > 0) {
      goToStep(currentStep - 1)
    }
    _tx = null
  }, { passive: true })
})
