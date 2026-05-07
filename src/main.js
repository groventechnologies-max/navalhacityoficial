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
let currentStep = 0
let isLoggedIn  = false
let currentUser = null

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
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, telefone, role, filial_id')
    .eq('id', session.user.id)
    .single()

  if (profile) {
    currentUser = {
      nome:      profile.nome,
      telefone:  profile.telefone || '',
      role:      profile.role,
      filial_id: profile.filial_id,
    }
    isLoggedIn = true
    updateNavLoginBtns()
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
async function handleRegister(nome, email, telefone, senha) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, telefone },
    },
  })

  if (error) throw new Error(error.message)

  // Loga automaticamente após registro (confirmação de email desativada)
  if (data.session) await applySession(data.session)
}

// ─── AUTH: login ─────────────────────────────────────────
async function handleLogin(identifier, senha) {
  let email = identifier

  if (isPhone(identifier)) {
    const { data, error } = await supabase.rpc('get_email_by_phone', {
      p_telefone: identifier,
    })
    if (error || !data) throw new Error('Telefone não encontrado.')
    email = data
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    throw new Error('Email/telefone ou senha incorretos.')
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
}

function applyLoginMode(mode) {
  document.getElementById('loginModalMode').value = mode
  const isReg = mode === 'register'
  document.getElementById('loginModalTitle').textContent = isReg ? 'Criar conta' : 'Entrar na conta'
  document.getElementById('loginModalBtn').textContent   = isReg ? 'Criar conta' : 'Entrar'
  document.getElementById('fieldNome').style.display        = isReg ? 'block' : 'none'
  document.getElementById('fieldEmail').style.display       = isReg ? 'block' : 'none'
  document.getElementById('fieldWhats').style.display       = isReg ? 'block' : 'none'
  document.getElementById('fieldIdentifier').style.display  = isReg ? 'none'  : 'block'
  document.getElementById('loginSwitchText').textContent    = isReg ? 'Já tem conta?' : 'Não tem conta?'
  document.getElementById('loginSwitchLink').textContent    = isReg ? 'Fazer login' : 'Criar conta grátis'
}

window.toggleLoginMode = () => {
  const current = document.getElementById('loginModalMode').value
  applyLoginMode(current === 'login' ? 'register' : 'login')
  ;['loginNome', 'loginIdentifier', 'loginEmail', 'loginTel', 'loginSenha'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.value = ''
  })
}

window.toggleSenha = () => {
  const input = document.getElementById('loginSenha')
  input.type = input.type === 'password' ? 'text' : 'password'
}

window.closeLoginModal = () => {
  const modal = document.getElementById('loginModal')
  if (modal) modal.classList.remove('open')
}

// ─── MOSTRAR MENSAGEM NO MODAL ───────────────────────────
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
    border: 1px solid ${type === 'error' ? '#c0392b' : '#27ae60'};
    color: ${type === 'error' ? '#e74c3c' : '#2ecc71'};
    background: ${type === 'error' ? 'rgba(192,57,43,0.08)' : 'rgba(39,174,96,0.08)'};
  `
}

function clearModalMessage() {
  const el = document.getElementById('loginModalMsg')
  if (el) el.remove()
}

window.submitLogin = async () => {
  const mode  = document.getElementById('loginModalMode').value
  const senha = document.getElementById('loginSenha').value.trim()
  const btn   = document.getElementById('loginModalBtn')

  clearModalMessage()

  if (!senha) { showModalMessage('Informe sua senha.'); return }

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

      await handleRegister(nome, email, telefone, senha)

      // Fecha o modal e atualiza a UI — usuário já está logado
      closeLoginModal()
      updateNavLoginBtns()
      const confirmSection = document.getElementById('confirmSection')
      if (confirmSection) confirmSection.innerHTML = renderConfirmSection()

    } else {
      const identifier = document.getElementById('loginIdentifier').value.trim()
      if (!identifier) { showModalMessage('Informe seu WhatsApp ou e-mail.'); return }

      await handleLogin(identifier, senha)

      closeLoginModal()
      updateNavLoginBtns()
      const confirmSection = document.getElementById('confirmSection')
      if (confirmSection) confirmSection.innerHTML = renderConfirmSection()
    }

  } catch (err) {
    showModalMessage(err.message || 'Erro inesperado. Tente novamente.')
  } finally {
    if (btn.disabled) {
      btn.textContent = mode === 'register' ? 'Criar conta' : 'Entrar'
      btn.disabled    = false
    }
  }
}

window.logoutUser = () => handleLogout()

// ─── NAVEGAÇÃO ───────────────────────────────────────────
function goToStep(n) {
  if (n === currentStep) return
  const from = document.getElementById(`step-${currentStep}`)
  const to   = document.getElementById(`step-${n}`)
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
  document.getElementById(`barber-${idx}`).classList.add('selected')
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
  document.getElementById(`svc-${i}`).classList.add('selected')
  state.servico = DATA.servicos[i]
}

function renderDias() {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const today    = new Date()

  document.getElementById('daysStrip').innerHTML = Array.from({ length: 14 }, (_, i) => {
    const d  = new Date(today)
    d.setDate(today.getDate() + i + 1)
    const wd = weekdays[d.getDay()]
    const dn = d.getDate()
    return `
      <div class="day-btn" id="day-${i}" onclick="selecionarDia(${i}, '${wd} ${dn}')">
        <div class="day-weekday">${wd}</div>
        <div class="day-num">${dn}</div>
      </div>
    `
  }).join('')

  document.getElementById('timesGrid').innerHTML = ''
}

window.selecionarDia = (i, label) => {
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'))
  document.getElementById(`day-${i}`).classList.add('selected')
  state.dia = label
  renderHorarios()
  const bar  = document.getElementById('availBar')
  const text = document.getElementById('availText')
  if (bar)  bar.classList.add('active')
  if (text) text.textContent = '15 horários disponíveis'
}

function renderHorarios() {
  const horarios      = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00']
  const indisponiveis = new Set([1, 4, 7, 12])

  document.getElementById('timesGrid').innerHTML = horarios.map((h, i) => `
    <div class="time-btn ${indisponiveis.has(i) ? 'unavailable' : ''}"
         id="time-${i}"
         onclick="selecionarHorario(${i}, '${h}')">
      ${h}
    </div>
  `).join('')
}

window.selecionarHorario = (i, h) => {
  const btn = document.getElementById(`time-${i}`)
  if (btn.classList.contains('unavailable')) return
  document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'))
  btn.classList.add('selected')
  state.horario = h
}

// ─── CONFIRMAÇÃO ─────────────────────────────────────────
window.confirmarAgendamento = () => {
  const nome = document.getElementById('clientName').value.trim()
  const tel  = document.getElementById('clientPhone').value.trim()

  if (!nome || !tel) { alert('Preencha seu nome e WhatsApp.'); return }
  if (!state.servico || !state.dia || !state.horario) {
    alert('Selecione o serviço, a data e o horário.')
    return
  }

  const btn = document.querySelector('#confirmSection .btn-confirm')
  if (!btn) return
  btn.textContent = 'Reservando...'
  btn.disabled    = true

  setTimeout(() => {
    document.getElementById('confirmDetails').innerHTML = `
      <div><strong>Cliente:</strong> ${escapeHTML(nome)}</div>
      <div><strong>Unidade:</strong> ${escapeHTML(state.filial.nome)}</div>
      <div><strong>Barbeiro:</strong> ${escapeHTML(state.barbeiro.nome)}</div>
      <div><strong>Serviço:</strong> ${escapeHTML(state.servico.nome)} — <span class="hl">${escapeHTML(state.servico.preco)}</span></div>
      <div><strong>Data:</strong> ${escapeHTML(state.dia)} às <span class="hl">${escapeHTML(state.horario)}</span></div>
      <div style="margin-top:10px;font-size:13px;color:var(--muted)">Confirmação enviada para <span class="hl">${escapeHTML(tel)}</span></div>
    `
    goToStep(4)
  }, 1000)
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

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await applySession(session)
    } else {
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
      if (isLoggedIn) logoutUser()
      else openLoginModal()
    })
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
