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

// ─── STATUS DA FILIAL (aberto/fechado) ───────────────────
function getFilialStatus(filial, now = new Date()) {
  const horario = filial.horario || { abre: 9, fecha: 19 }
  const dia    = now.getDay()           // 0=dom, 6=sab
  const hora   = now.getHours() + now.getMinutes() / 60
  const fechadoDom = dia === 0          // assume fechado domingo por default
  const aberto = !fechadoDom && hora >= horario.abre && hora < horario.fecha
  const pad = (n) => String(n).padStart(2, '0')
  if (aberto) {
    return {
      aberto: true,
      label: 'Aberto',
      subLabel: `fecha às ${pad(horario.fecha)}h`,
    }
  }
  // Calcula próximo dia/hora de abertura
  let proxDia = dia
  if (hora >= horario.fecha) proxDia = (dia + 1) % 7
  if (proxDia === 0) proxDia = 1 // pula domingo
  const diasNomes = ['domingo', 'amanhã', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  const isHoje    = (proxDia === dia && hora < horario.abre)
  const labelDia  = isHoje ? `hoje` : (proxDia === ((dia + 1) % 7) ? 'amanhã' : diasNomes[proxDia])
  return {
    aberto: false,
    label: 'Fechado',
    subLabel: `abre ${labelDia} às ${pad(horario.abre)}h`,
  }
}

// ─── ANIMAÇÕES: REVEAL ON SCROLL ─────────────────────────
const _revealIO = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed')
          _revealIO.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
  : null

function reveal(el, delayMs = 0, variant = '') {
  if (!el) return
  el.classList.add('reveal')
  if (variant) el.classList.add(variant)
  if (delayMs) el.style.setProperty('--reveal-delay', `${delayMs}ms`)
  if (_revealIO) _revealIO.observe(el)
  else el.classList.add('revealed')
}

function revealStagger(selector, baseDelay = 70, variant = '', root = document) {
  root.querySelectorAll(selector).forEach((el, i) => reveal(el, i * baseDelay, variant))
}

// Marca elementos como reveal (opacity 0) SEM disparar a animação ainda.
// Útil quando precisamos esconder itens antes de uma transição de curtain.
function markRevealStagger(selector, baseDelay = 70, variant = '', root = document) {
  root.querySelectorAll(selector).forEach((el, i) => {
    if (el.classList.contains('reveal')) return
    el.classList.add('reveal')
    if (variant) el.classList.add(variant)
    el.style.setProperty('--reveal-delay', `${i * baseDelay}ms`)
  })
}

// Dispara a animação de reveal (adiciona .revealed via IO).
function commitReveal(selector, root = document) {
  root.querySelectorAll(selector).forEach(el => {
    if (el.classList.contains('reveal') && !el.classList.contains('revealed')) {
      if (_revealIO) _revealIO.observe(el)
      else el.classList.add('revealed')
    }
  })
}

// ─── ANIMAÇÕES: RIPPLE EFFECT ────────────────────────────
function attachGlobalRipple() {
  const SELECTOR = '.btn-primary, .btn-confirm, .btn-select, .btn-login-wall, .nav-login-btn, .btn-back, .filial-header'
  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest(SELECTOR)
    if (!target || target.disabled) return
    target.classList.add('ripple-host')
    const rect = target.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 1.8
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const fx = document.createElement('span')
    fx.className = 'ripple-fx'
    fx.style.cssText = `width:${size}px;height:${size}px;left:${x - size/2}px;top:${y - size/2}px`
    target.appendChild(fx)
    setTimeout(() => fx.remove(), 700)
  })
}

// ─── ANIMAÇÕES: MAGNETIC BUTTONS ─────────────────────────
function attachMagneticEffect() {
  if (!hasFinePointer()) return // só ativa em devices com mouse fino
  const SELECTOR = '.btn-primary, .btn-confirm'
  const STRENGTH = 0.25
  document.querySelectorAll(SELECTOR).forEach(btn => bindMagnetic(btn, STRENGTH))
  // observer pra botões adicionados depois
  const mo = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return
      if (node.matches?.(SELECTOR)) bindMagnetic(node, STRENGTH)
      node.querySelectorAll?.(SELECTOR).forEach(b => bindMagnetic(b, STRENGTH))
    }))
  })
  mo.observe(document.body, { childList: true, subtree: true })
}
function bindMagnetic(btn, strength) {
  if (btn._magnetic) return
  btn._magnetic = true
  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) * strength
    const dy = (e.clientY - (r.top + r.height / 2)) * strength
    btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
  })
  btn.addEventListener('pointerleave', () => {
    btn.style.transform = ''
  })
}

// ─── ANIMAÇÕES: WAIT HELPER ──────────────────────────────
function wait(ms) { return new Promise(r => setTimeout(r, ms)) }
// Ignoramos prefers-reduced-motion intencionalmente: muitos sistemas (Windows)
// vêm com a flag ativada por padrão e isso engole TODAS as animações da landing.
function reducedMotion() { return false }
// Detecta se o device tem mouse fino. Usa any-pointer para suportar laptops
// Windows com touchscreen + mouse — pointer:coarse retornaria true falsamente.
function hasFinePointer() { return window.matchMedia('(any-pointer: fine)').matches }
function isTouch() { return !hasFinePointer() }

// ─── ANIMAÇÕES: TEXT SCRAMBLE ────────────────────────────
class TextScramble {
  constructor(el) {
    this.el = el
    this.chars = '!<>-_\\/[]{}—=+*^?#________'
    this.update = this.update.bind(this)
  }
  setText(newText) {
    const oldText = this.el.innerText
    const length = Math.max(oldText.length, newText.length)
    const promise = new Promise(resolve => this.resolve = resolve)
    this.queue = []
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || ''
      const to = newText[i] || ''
      const start = Math.floor(Math.random() * 22)
      const end = start + Math.floor(Math.random() * 22)
      this.queue.push({ from, to, start, end })
    }
    cancelAnimationFrame(this.frameRequest)
    this.frame = 0
    this.update()
    return promise
  }
  update() {
    let output = ''
    let complete = 0
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i]
      if (this.frame >= end) {
        complete++
        output += to
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.chars[Math.floor(Math.random() * this.chars.length)]
          this.queue[i].char = char
        }
        output += `<span class="scramble-dud">${char}</span>`
      } else {
        output += from
      }
    }
    this.el.innerHTML = output
    if (complete === this.queue.length) {
      this.resolve()
    } else {
      this.frameRequest = requestAnimationFrame(this.update)
      this.frame++
    }
  }
}

async function scrambleHeroTitle() {
  const title = document.querySelector('.hero-title')
  if (!title || title._scrambled) return
  title._scrambled = true
  if (reducedMotion()) return
  const original = title.innerHTML
  const finalText = title.textContent
  const fx = new TextScramble(title)
  await fx.setText(finalText)
  title.innerHTML = original
}

// ─── ANIMAÇÕES: LETTER-BY-LETTER REVEAL ──────────────────
function splitLetters(el) {
  if (!el || el.dataset.split) return
  const html = el.innerHTML
  const segments = html.split(/(<br\s*\/?>)/i)
  el.innerHTML = ''
  let charIndex = 0
  segments.forEach(seg => {
    if (seg.match(/^<br/i)) {
      el.appendChild(document.createElement('br'))
    } else {
      const text = seg.replace(/<[^>]+>/g, '')
      text.split('').forEach(char => {
        const span = document.createElement('span')
        span.className = 'letter-reveal'
        span.textContent = char === ' ' ? ' ' : char
        span.style.setProperty('--letter-i', charIndex)
        el.appendChild(span)
        charIndex++
      })
    }
  })
  el.dataset.split = '1'
}

const _letterIO = ('IntersectionObserver' in window)
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.querySelectorAll('.letter-reveal').forEach(s => s.classList.add('show'))
          _letterIO.unobserve(entry.target)
        }
      })
    }, { threshold: 0.25 })
  : null

function setupLetterReveal(selector, root = document) {
  if (reducedMotion()) return
  root.querySelectorAll(selector).forEach(el => {
    splitLetters(el)
    if (_letterIO) _letterIO.observe(el)
    else el.querySelectorAll('.letter-reveal').forEach(s => s.classList.add('show'))
  })
}

// ─── ANIMAÇÕES: NUMBER COUNTER ───────────────────────────
function animateCounter(el, finalValue, suffix, duration = 1700) {
  const start = performance.now()
  function tick(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const current = Math.round(finalValue * eased)
    el.textContent = current + suffix
    if (progress < 1) requestAnimationFrame(tick)
    else el.textContent = finalValue + suffix
  }
  requestAnimationFrame(tick)
}

const _counterIO = ('IntersectionObserver' in window)
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target._counted) {
          const el = entry.target
          el._counted = true
          const m = (el.dataset.original || '').match(/^(\d+)(.*)$/)
          if (m) animateCounter(el, parseInt(m[1]), m[2])
          _counterIO.unobserve(el)
        }
      })
    }, { threshold: 0.4 })
  : null

function setupCounters(root = document) {
  if (reducedMotion()) return
  root.querySelectorAll('.stat-num').forEach(el => {
    if (el.dataset.original) return
    el.dataset.original = el.textContent
    const m = el.textContent.match(/^(\d+)(.*)$/)
    if (m) el.textContent = '0' + m[2]
    if (_counterIO) _counterIO.observe(el)
  })
}

// ─── ANIMAÇÕES: 3D TILT ──────────────────────────────────
function attachTilt(selector, root = document, maxRotate = 8) {
  if (isTouch() || reducedMotion()) return
  root.querySelectorAll(selector).forEach(card => {
    if (card._tilt) return
    card._tilt = true
    card.classList.add('tilt-card')
    card.addEventListener('pointerenter', () => card.classList.add('tilting'))
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect()
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2)
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2)
      card.style.transform = `perspective(900px) rotateX(${-dy * maxRotate}deg) rotateY(${dx * maxRotate}deg) translateZ(0)`
    })
    card.addEventListener('pointerleave', () => {
      card.classList.remove('tilting')
      card.style.transform = ''
    })
  })
}

// ─── ANIMAÇÕES: HERO PARALLAX ────────────────────────────
function attachHeroParallax() {
  if (isTouch() || reducedMotion()) return
  const hero = document.querySelector('#step-0 .hero')
  if (!hero || hero._parallax) return
  hero._parallax = true
  const layers = [
    { sel: '.hero-logo',   factor: 12 },
    { sel: '.hero-badge',  factor: 8 },
    { sel: '.hero-title',  factor: -16 },
    { sel: '.hero-sub',    factor: -10 },
    { sel: '.hero-cta',    factor: -6 },
  ].map(l => ({ el: hero.querySelector(l.sel), factor: l.factor })).filter(l => l.el)

  let raf = null
  let tx = 0, ty = 0
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect()
    tx = (e.clientX - r.left - r.width / 2) / r.width
    ty = (e.clientY - r.top - r.height / 2) / r.height
    if (!raf) raf = requestAnimationFrame(applyParallax)
  })
  hero.addEventListener('pointerleave', () => {
    tx = 0; ty = 0
    if (!raf) raf = requestAnimationFrame(applyParallax)
  })
  function applyParallax() {
    layers.forEach(l => {
      l.el.style.transform = `translate3d(${tx * l.factor}px, ${ty * l.factor}px, 0)`
    })
    raf = null
  }
}

// ─── ANIMAÇÕES: SMOOTH SCROLL ────────────────────────────
// Removido: lerp wheel intercept causava conflito com scroll nativo, abas
// trocando, modais e curtain — o navegador já tem scroll suave próprio.
function attachSmoothScroll() {
  // no-op intencional. Reservado caso a gente queira voltar com versão menos invasiva.
}

// ─── ANIMAÇÕES: CURTAIN TRANSITION ───────────────────────
let _curtainRunning = false
async function curtainTransition(callback) {
  const curtain = document.getElementById('curtain')
  if (!curtain || reducedMotion() || _curtainRunning) {
    callback()
    return
  }
  _curtainRunning = true
  curtain.classList.remove('uncover')
  void curtain.offsetWidth
  curtain.classList.add('cover')
  await wait(400)        // painéis se encontram no meio + brand mark aparece
  callback()             // troca o conteúdo enquanto está totalmente coberto
  await wait(80)         // pequena pausa pra brand mark "respirar"
  curtain.classList.remove('cover')
  curtain.classList.add('uncover')
  await wait(400)        // painéis voltam pras bordas
  curtain.classList.remove('uncover')
  _curtainRunning = false
}

// ─── DEV: auto-login como admin (desativa quando voltar pro Supabase real) ──
const DEV_AUTO_ADMIN = true
const DEV_ADMIN_USER = {
  id:        'dev-admin',
  nome:      'Admin Dev',
  telefone:  '(11) 99999-0000',
  role:      'admin',
  filial_id: 1,
}

// ─── STATE ───────────────────────────────────────────────
let currentStep    = 0
let isLoggedIn     = false
let currentUser    = null
let sessionLoading = false

const state = {
  filial:   null,
  barbeiro: null,
  servico:  null,
  dia:      null,
  horario:  null,
}

// ─── AUTH: carregar sessão existente ─────────────────────
async function loadSession() {
  if (DEV_AUTO_ADMIN) {
    currentUser = { ...DEV_ADMIN_USER }
    isLoggedIn  = true
    updateNavLoginBtns()
    return
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (session) await applySession(session)
}

async function applySession(session) {
  if (sessionLoading) return
  sessionLoading = true

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome, telefone, role, filial_id')
      .eq('id', session.user.id)
      .single()

    const meta = session.user.user_metadata || {}

    currentUser = {
      id:        session.user.id,
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
  const dashRoles = ['admin', 'gerente', 'barbeiro']
  const showDash  = isLoggedIn && dashRoles.includes(currentUser?.role)

  // ── nav desktop ──
  document.querySelectorAll('.nav-login-btn').forEach(btn => {
    if (isLoggedIn && currentUser) {
      btn.textContent = currentUser.nome.split(' ')[0]
      btn.classList.add('logged')
    } else {
      btn.textContent = 'Login'
      btn.classList.remove('logged')
    }
  })

  document.querySelectorAll('.nav-dash-btn').forEach(link => {
    link.style.display = showDash ? 'inline-block' : 'none'
  })

  // ── menu mobile ──
  window._navIsLoggedIn = isLoggedIn

  const mobileLoginLabel = document.getElementById('mobileLoginLabel')
  const mobileLoginItem  = document.getElementById('mobileLoginItem')
  const mobileDashItem   = document.getElementById('mobileDashItem')
  const mobileAgendItem  = document.getElementById('mobileAgendItem')

  if (mobileLoginLabel) {
    mobileLoginLabel.textContent = isLoggedIn && currentUser
      ? currentUser.nome.split(' ')[0]
      : 'Login'
  }
  if (mobileLoginItem) {
    mobileLoginItem.classList.toggle('active-user', isLoggedIn)
  }
  if (mobileDashItem) {
    mobileDashItem.style.display = showDash ? 'flex' : 'none'
  }
  if (mobileAgendItem) {
    mobileAgendItem.style.display = isLoggedIn ? 'flex' : 'none'
  }
}

// ─── AUTH: registro ──────────────────────────────────────
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
  if (DEV_AUTO_ADMIN) {
    // em modo dev: "logout" só reinicia o estado mantendo o admin
    currentUser = { ...DEV_ADMIN_USER }
    isLoggedIn  = true
    updateNavLoginBtns()
    closeProfileModal()
    return
  }
  await supabase.auth.signOut()
  isLoggedIn  = false
  currentUser = null
  updateNavLoginBtns()

  const app = document.getElementById('app')
  app.style.transition = 'opacity 0.4s ease'
  app.style.opacity = '0'
  setTimeout(() => {
    closeProfileModal()
    const confirmSection = document.getElementById('confirmSection')
    if (confirmSection) confirmSection.innerHTML = renderConfirmSection()
    Object.assign(state, { filial: null, barbeiro: null, servico: null, dia: null, horario: null })
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'))
    document.getElementById('step-0').classList.add('active')
    currentStep = 0
    app.style.opacity = '1'
  }, 400)
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
        showModalMessage('Conta criada! Verifique seu e-mail e clique no link de confirmação para ativar.', 'success')
        btn.textContent = originalText
        btn.disabled    = false
        return
      }

      closeLoginModal()
      updateNavLoginBtns()
      const cs1 = document.getElementById('confirmSection')
      if (cs1) cs1.innerHTML = renderConfirmSection()
      applyConfirmPhoneMask()

    } else {
      const identifier = document.getElementById('loginIdentifier').value.trim()
      if (!identifier) { showModalMessage('Informe seu WhatsApp ou e-mail.'); return }

      await handleLogin(identifier, senha)
      closeLoginModal()
      updateNavLoginBtns()
      const cs2 = document.getElementById('confirmSection')
      if (cs2) cs2.innerHTML = renderConfirmSection()
      applyConfirmPhoneMask()
    }

  } catch (err) {
    showModalMessage(err.message || 'Erro inesperado. Tente novamente.')
  } finally {
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
      v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    } else {
      v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    }
    input.value = v.replace(/-$/, '')
  })
}

function applyConfirmPhoneMask() {
  const el = document.getElementById('clientPhone')
  if (el) applyPhoneMask(el)
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
}

// ─── STEP 5: MEUS AGENDAMENTOS ───────────────────────────
let _agendamentosCache  = []
let _agendamentoFiltro  = 'todos'

window.abrirMeusAgendamentos = () => {
  if (!isLoggedIn) { openLoginModal(); return }
  goToStep(5)
  loadHistorico()
  // Anima header ao entrar
  reveal(document.querySelector('#step-5 .section-label'), 0)
  reveal(document.querySelector('#step-5 .section-title'), 80)
  reveal(document.querySelector('#step-5 .agend-filters'), 200)
}

async function loadHistorico() {
  const list = document.getElementById('agendList')
  if (!list) return
  list.innerHTML = `<div class="agend-empty"><div class="empty-icon">⏳</div>Carregando seus agendamentos...</div>`

  try {
    if (!currentUser?.id) {
      list.innerHTML = `<div class="agend-empty"><div class="empty-icon">🔒</div>Faça login pra ver seus agendamentos.</div>`
      return
    }

    const { data, error } = await supabase
      .from('agendamentos')
      .select('id, servico, barbeiro, horario, status, filial_id')
      .eq('cliente_id', currentUser.id)
      .order('horario', { ascending: false })
      .limit(50)

    if (error) throw error

    _agendamentosCache = data || []
    renderHistorico()
  } catch (err) {
    list.innerHTML = `<div class="agend-empty" style="color:#e74c3c"><div class="empty-icon">⚠️</div>Erro ao carregar agendamentos.</div>`
  }
}

window.setAgendamentoFilter = (filtro) => {
  _agendamentoFiltro = filtro
  document.querySelectorAll('.agend-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === filtro)
  })
  renderHistorico()
}

function renderHistorico() {
  const list = document.getElementById('agendList')
  if (!list) return

  const mesesPt = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const now = new Date()

  let lista = _agendamentosCache
  if (_agendamentoFiltro === 'proximos') {
    lista = lista.filter(ag => new Date(ag.horario) > now && ag.status !== 'cancelado')
  } else if (_agendamentoFiltro === 'passados') {
    lista = lista.filter(ag => new Date(ag.horario) <= now || ag.status === 'cancelado')
  }

  if (!lista.length) {
    const isFirst = _agendamentosCache.length === 0
    list.innerHTML = `
      <div class="agend-empty">
        <div class="empty-icon">${isFirst
          ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="15" r="3"/><circle cx="9" cy="6" r="3"/><line x1="11.5" y1="13" x2="21" y2="5"/><line x1="11.5" y1="8" x2="21" y2="16"/><circle cx="17" cy="10.5" r="1.2" fill="currentColor" stroke="none"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
        }</div>
        ${isFirst ? 'Você ainda não tem agendamentos.' : 'Nenhum agendamento neste filtro.'}
        ${isFirst ? `<div><button class="agend-empty-cta" onclick="iniciarAgendamentoDireto()">Agendar agora</button></div>` : ''}
      </div>
    `
    return
  }

  list.innerHTML = lista.map(ag => {
    const d    = new Date(ag.horario)
    const dia  = String(d.getDate()).padStart(2,'0')
    const mes  = mesesPt[d.getMonth()]
    const hora = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    const filialNome = DATA.filiais.find(f => f.id === ag.filial_id)?.nome || `Unidade ${ag.filial_id}`
    const isPassado = d <= now
    const podeAlterar = d > now && (ag.status === 'confirmado' || ag.status === 'pendente')

    return `
      <div class="agend-card${isPassado ? ' passado' : ''}"
           data-ag-id="${ag.id}"
           data-filial="${ag.filial_id}"
           data-barbeiro="${escapeHTML(ag.barbeiro)}">
        <div class="agend-card-top">
          <div class="agend-card-svc">${escapeHTML(ag.servico)}</div>
          <div class="agend-card-status ${ag.status}">${ag.status}</div>
        </div>
        <div class="agend-card-info">
          <div class="row date">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${dia}/${mes} às ${hora}
          </div>
          <div class="row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            ${escapeHTML(ag.barbeiro)}
          </div>
          <div class="row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHTML(filialNome)}
          </div>
        </div>
        ${podeAlterar ? `
        <div class="agend-card-actions">
          <button class="btn-reagendar" onclick="reagendarFromCard(this)">Reagendar</button>
          <button class="btn-cancelar"  onclick="cancelarAgendamento('${ag.id}')">Cancelar</button>
        </div>` : ''}
      </div>
    `
  }).join('')

  // Animações de entrada com stagger
  revealStagger('#agendList .agend-card', 60)
}

window.cancelarAgendamento = async (id) => {
  if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return

  try {
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', id)

    if (error) throw new Error(error.message)

    loadHistorico()
  } catch (err) {
    alert('Erro ao cancelar: ' + (err.message || 'Tente novamente.'))
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
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ nome, telefone: tel })
      .eq('id', currentUser.id)

    if (profileError) throw new Error(profileError.message)

    if (senha) {
      const { error: passError } = await supabase.auth.updateUser({ password: senha })
      if (passError) throw new Error(passError.message)
    }

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

  curtainTransition(() => {
    from.classList.remove('active')
    to.classList.add('active')
    to.scrollTop = 0
    window.scrollTo(0, 0)
    if (to._syncScroll) to._syncScroll()
    currentStep = n
    if (window.closeMobileMenu) window.closeMobileMenu()
  }).then(() => {
    // Após curtain terminar, dispara reveals (assim a animação não é engolida pela cortina)
    if (n === 1) {
      commitReveal('#filiaisList .filial-item:not(.sk-card)')
    }
  })
}

window.goToStep = goToStep

// ─── STEP 1: FILIAIS ─────────────────────────────────────
function renderFiliais() {
  const el = document.getElementById('filiaisList')

  el.innerHTML = DATA.filiais.map(f => {
    const status = getFilialStatus(f)
    const telDigits = (f.telefone || '').replace(/\D/g, '')
    return `
    <div class="filial-item" id="filial-${f.id}">
      <div class="filial-header" onclick="toggleFilial(${f.id})">
        <div class="filial-left">
          <div class="filial-num">0${f.id}</div>
          <div class="filial-info">
            <h3>${f.nome}</h3>
            <p>${f.regiao}</p>
          </div>
        </div>
        <div class="filial-status">
          <span class="filial-status-dot ${status.aberto ? 'open' : 'closed'}"></span>
          <span class="filial-status-text">${status.label}</span>
        </div>
        <div class="filial-arrow">▼</div>
      </div>
      <div class="filial-body">
        <div class="filial-content">
          <div class="filial-address">
            <h4>Endereço</h4>
            <p>${f.endereco.replace(/\n/g, '<br>')}</p>
            <div class="filial-meta">
              <span class="meta-line">${status.aberto ? 'Aberto agora' : 'Fechado'} · ${status.subLabel}</span>
            </div>
            <div class="filial-actions">
              ${telDigits ? `<a class="btn-call" href="tel:+${telDigits}">📞 Ligar</a>` : ''}
              ${f.whatsapp ? `<a class="btn-whats" href="https://wa.me/${f.whatsapp}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
            </div>
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
  `}).join('')
  // Marca itens como ocultos (opacity 0) — evita flash quando curtain abrir
  markRevealStagger('#filiaisList .filial-item', 90)
  // Se o usuário já está no step 1, dispara animação imediatamente
  if (currentStep === 1) {
    commitReveal('#filiaisList .filial-item')
  }
}

window.toggleFilial = (id) => {
  const el     = document.getElementById(`filial-${id}`)
  if (!el) return
  const isOpen = el.classList.contains('open')
  document.querySelectorAll('.filial-item').forEach(i => i.classList.remove('open'))
  if (!isOpen) el.classList.add('open')
}

window.selecionarFilial = async (id) => {
  state.filial   = DATA.filiais.find(f => f.id === id)
  state.barbeiro = null

  // Busca dados do Supabase em paralelo com a animação do curtain
  const fetchPromise = supabase
    .from('equipe')
    .select('nome, especialidade, nota, foto_url, portfolio_urls')
    .eq('filial_id', id)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })

  // Renderiza imediatamente com dados estáticos — sem tela de carregando
  renderPerfil()
  goToStep(2)

  // Quando os dados do Supabase chegarem, atualiza se tiver fotos/portfólio reais
  const { data } = await fetchPromise
  if (data && data.length > 0) {
    state.filial = {
      ...state.filial,
      barbeiros: data.map(m => ({
        nome:          m.nome,
        especialidade: m.especialidade || '—',
        nota:          m.nota ? `${m.nota} ★` : '',
        foto:          m.foto_url || null,
        portfolio:     Array.isArray(m.portfolio_urls) ? m.portfolio_urls : [],
      })),
    }
    if (currentStep === 2) renderPerfil()
  }
}

// Modo barbearia única: pula seleção de unidade
function iniciarAgendamentoDireto() {
  const base = DATA.filiais[0]
  state.filial   = { ...base, nome: 'Sua Barbearia', regiao: '' }
  state.barbeiro = null
  renderPerfil()
  goToStep(2)
}
window.iniciarAgendamentoDireto = iniciarAgendamentoDireto

// ─── STEP 2: PERFIL + BARBEIROS ──────────────────────────
const PROFILE_TABS = ['Profissionais', 'Fidelidade', 'Produtos', 'Pacotes', 'Assinaturas', 'Avaliações']

function diasSemanaHorarios(f) {
  const abre  = (f.horario?.abre  ?? 9).toString().padStart(2, '0') + ':00'
  const fecha = (f.horario?.fecha ?? 19).toString().padStart(2, '0') + ':00'
  return [
    { dia: 'Segunda-feira', h: `${abre} - ${fecha}` },
    { dia: 'Terça-feira',   h: `${abre} - ${fecha}` },
    { dia: 'Quarta-feira',  h: `${abre} - ${fecha}` },
    { dia: 'Quinta-feira',  h: `${abre} - ${fecha}` },
    { dia: 'Sexta-feira',   h: `${abre} - ${fecha}` },
    { dia: 'Sábado',        h: `${abre} - 18:00` },
    { dia: 'Domingo',       h: 'Fechado' },
  ]
}

const PAGAMENTOS = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX', 'Apple Pay', 'Pix Crédito', 'Mastercard', 'Visa', 'Elo']

const COMODIDADES = [
  { label: 'Wi-Fi',            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>` },
  { label: 'Estacionamento',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>` },
  { label: 'Acessibilidade',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M19 13l-4-2-2-3-3 1-5 1"/><path d="M9 16a4 4 0 1 0 4 4"/><path d="M13 14l3 7h3"/></svg>` },
  { label: 'Ambiente criança', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/><path d="M9 8h.01M15 8h.01"/></svg>` },
]

function renderPerfilTabContent(tab, f) {
  if (tab === 'Profissionais') {
    return `
      <div class="barbers-grid">
        ${f.barbeiros.map((b, i) => `
          <div class="barber-card" id="barber-${i}" onclick="selecionarBarbeiro(${i})">
            <div class="selected-badge">Selecionado</div>
            ${b.badge ? `<div class="barber-badge">${escapeHTML(b.badge)}</div>` : ''}
            <div class="barber-photo">
              ${b.foto
                ? `<img src="${escapeHTML(b.foto)}" alt="${escapeHTML(b.nome)}">`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:52%;height:52%;opacity:0.5"><circle cx="24" cy="17" r="9"/><path d="M6 44c0-10 8-17 18-17s18 7 18 17"/></svg>`}
            </div>
            <div class="barber-info">
              <div class="barber-name">${escapeHTML(b.nome)}</div>
              <div class="barber-specialty">${escapeHTML(b.especialidade)}</div>
              <div class="barber-rating">${escapeHTML(b.nota || '')} · Disponível</div>
            </div>
          </div>
        `).join('')}
      </div>
    `
  }
  const placeholders = {
    'Fidelidade':  'Programa de fidelidade em breve. Volte logo!',
    'Produtos':    'Catálogo de produtos em breve.',
    'Pacotes':     'Pacotes promocionais serão divulgados em breve.',
    'Assinaturas': 'Planos de assinatura em breve.',
    'Avaliações':  'Ainda não há avaliações para esta unidade.',
  }
  return `<div class="bs-tab-empty">${placeholders[tab] || 'Em breve.'}</div>`
}

function renderPerfil() {
  const f         = state.filial
  const horarios  = diasSemanaHorarios(f)
  const enderecoL = (f.endereco || '').split('\n')

  document.getElementById('profileContent').innerHTML = `
    <div class="bs-layout">
      <main class="bs-main">

        <div class="bs-shop-head">
          <div class="bs-shop-id">
            <div class="bs-shop-avatar">
              <img src="/logo.svg" alt="${escapeHTML(f.nome)}">
            </div>
            <div class="bs-shop-meta">
              <h2 class="bs-shop-name">${escapeHTML(f.nome)}</h2>
              <div class="bs-shop-rating">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="12,2 15,9 22,9.5 17,14.5 18.5,21.5 12,18 5.5,21.5 7,14.5 2,9.5 9,9"/></svg>
                <span>5.0</span>
              </div>
            </div>
          </div>
          <button class="bs-shop-cta" onclick="document.querySelector('.bs-tabs .bs-tab[data-tab=&quot;Profissionais&quot;]')?.click(); document.querySelector('#bsTabContent .barber-card')?.scrollIntoView({behavior:'smooth',block:'center'})">Agendar agora</button>
        </div>

        <div class="bs-photos" id="photosCarousel">
          ${[
            { key: 'principal', label: 'Foto Principal' },
            { key: 'ambiente',  label: 'Ambiente' },
            { key: 'detalhe',   label: 'Detalhe' },
            { key: 'cadeira',   label: 'Cadeira' },
            { key: 'produtos',  label: 'Produtos' },
          ].map(({ key, label }) => {
            const url = f.fotos && f.fotos[key]
            return `<div class="bs-photo${url ? ' has' : ''}" data-label="${label}">${url ? `<img src="${url}" alt="${label}">` : ''}</div>`
          }).join('')}
        </div>

        <div class="bs-tabs" role="tablist">
          ${PROFILE_TABS.map((t, i) => `
            <button class="bs-tab${i === 0 ? ' active' : ''}"
                    role="tab"
                    data-tab="${t}"
                    onclick="switchPerfilTab('${t}')">${t}</button>
          `).join('')}
          <span class="bs-tabs-underline"></span>
        </div>

        <div class="bs-tab-content" id="bsTabContent">
          ${renderPerfilTabContent('Profissionais', f)}
        </div>

        <div class="bs-comodidades">
          <div class="bs-comodidades-head">
            <h3 class="bs-comodidades-title">Comodidades</h3>
            <span class="bs-comodidades-sub">Clique no item para mais informações</span>
          </div>
          <div class="bs-comodidades-grid">
            ${COMODIDADES.map(c => `
              <div class="bs-comodidade">
                <div class="bs-comodidade-icon">${c.icon}</div>
                <div class="bs-comodidade-label">${c.label}</div>
              </div>
            `).join('')}
          </div>
        </div>

      </main>

      <aside class="bs-side">
        <div class="bs-side-block">
          <div class="bs-side-address">
            ${enderecoL.map(l => `<div>${escapeHTML(l)}</div>`).join('')}
          </div>
        </div>

        <div class="bs-side-block">
          <h4 class="bs-side-title">Horário de atendimento</h4>
          <ul class="bs-side-hours">
            ${horarios.map(h => `<li><span>${h.dia}</span><span>${h.h}</span></li>`).join('')}
          </ul>
        </div>

        <div class="bs-side-block">
          <h4 class="bs-side-title">Formas de pagamento</h4>
          <div class="bs-side-pays">
            ${PAGAMENTOS.map(p => `<span class="bs-pay-chip">${escapeHTML(p)}</span>`).join('')}
          </div>
        </div>

        <div class="bs-side-block">
          <h4 class="bs-side-title">Redes Sociais</h4>
          <div class="bs-side-social">
            <a href="https://www.instagram.com/suabarbearia" target="_blank" rel="noopener" class="bs-social-btn" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="https://wa.me/${f.whatsapp || ''}" target="_blank" rel="noopener" class="bs-social-btn" aria-label="WhatsApp">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </a>
          </div>
        </div>
      </aside>
    </div>

    <footer class="step-footer">
      <div class="logo-ft">Sua<span>Barbearia</span></div>
      <div class="footer-sub">© 2025 Sua Barbearia · Desenvolvido pela <a href="https://groven.netlify.app/" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;opacity:0.7;">Groven</a></div>
    </footer>
  `

  // Animações de entrada
  reveal(document.querySelector('#profileContent .bs-shop-head'), 0)
  reveal(document.querySelector('#profileContent .bs-photos'), 80, 'reveal-scale')
  reveal(document.querySelector('#profileContent .bs-tabs'), 160)
  revealStagger('#profileContent .barber-card', 80)
  reveal(document.querySelector('#profileContent .bs-comodidades'), 0, 'reveal-scale')
  reveal(document.querySelector('#profileContent .bs-side'), 120)

  // 3D tilt nos barbeiros
  attachTilt('#profileContent .barber-card', document, 8)
}

window.switchPerfilTab = (tab) => {
  document.querySelectorAll('#profileContent .bs-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab)
  })
  const container = document.getElementById('bsTabContent')
  if (!container) return
  container.innerHTML = renderPerfilTabContent(tab, state.filial)
  if (tab === 'Profissionais') {
    revealStagger('#profileContent .barber-card', 60)
    attachTilt('#profileContent .barber-card', document, 8)
  }
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
  const b = state.barbeiro
  const f = state.filial

  document.getElementById('scheduleContent').innerHTML = `
    <div class="bs-layout">
      <main class="bs-main">

        <div class="bs-shop-head">
          <div class="bs-shop-id">
            <div class="bs-shop-avatar bs-shop-avatar-photo">
              ${b.foto
                ? `<img src="${escapeHTML(b.foto)}" alt="${escapeHTML(b.nome)}">`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:60%;height:60%;opacity:0.6"><circle cx="24" cy="17" r="9"/><path d="M6 44c0-10 8-17 18-17s18 7 18 17"/></svg>`}
            </div>
            <div class="bs-shop-meta">
              <div class="bs-shop-eyebrow">Passo 03 — Marque seu horário</div>
              <h2 class="bs-shop-name">${escapeHTML(b.nome)}</h2>
              <div class="bs-shop-rating">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="12,2 15,9 22,9.5 17,14.5 18.5,21.5 12,18 5.5,21.5 7,14.5 2,9.5 9,9"/></svg>
                <span>${escapeHTML((b.nota || '').replace('★','').trim() || '5.0')}</span>
                <span class="bs-shop-sep">·</span>
                <span class="bs-shop-specialty">${escapeHTML(b.especialidade || '')}</span>
              </div>
            </div>
          </div>
          <button class="bs-shop-cta-ghost" onclick="document.getElementById('back3').click()">Trocar barbeiro</button>
        </div>

        ${b.portfolio && b.portfolio.length ? `
        <div class="bs-card">
          <div class="bs-card-title">Trabalhos de ${escapeHTML(b.nome)}</div>
          <div class="portfolio-strip">
            ${b.portfolio.map(src => `
              <div class="portfolio-item">
                <img src="${src}" alt="Corte">
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div class="bs-card">
          <div class="bs-card-title">Serviço desejado</div>
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

        <div class="bs-card">
          <div class="bs-card-title">Escolha a data</div>
          <div class="avail-bar" id="availBar">
            <div class="avail-dot"></div>
            <span id="availText">Selecione uma data</span>
          </div>
          <div class="days-strip" id="daysStrip"></div>
          <div class="times-grid" id="timesGrid"></div>
        </div>

        <div id="confirmSection">${renderConfirmSection()}</div>

      </main>

      <aside class="bs-side">
        <div class="bs-side-block">
          <h4 class="bs-side-title">Resumo do agendamento</h4>
          <ul class="bs-summary">
            <li><span>Unidade</span><span>${escapeHTML(f.nome)}</span></li>
            <li><span>Barbeiro</span><span>${escapeHTML(b.nome)}</span></li>
            <li id="sumSvc"><span>Serviço</span><span class="muted">—</span></li>
            <li id="sumDia"><span>Data</span><span class="muted">—</span></li>
            <li id="sumHora"><span>Horário</span><span class="muted">—</span></li>
          </ul>
        </div>

        <div class="bs-side-block">
          <div class="bs-side-address">
            ${(f.endereco || '').split('\n').map(l => `<div>${escapeHTML(l)}</div>`).join('')}
          </div>
        </div>

        <div class="bs-side-block">
          <h4 class="bs-side-title">Precisa de ajuda?</h4>
          <div class="bs-side-social">
            <a href="https://wa.me/${f.whatsapp || ''}" target="_blank" rel="noopener" class="bs-social-btn" aria-label="WhatsApp">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </a>
            <a href="https://www.instagram.com/suabarbearia" target="_blank" rel="noopener" class="bs-social-btn" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>
            </a>
          </div>
        </div>
      </aside>
    </div>

    <footer class="step-footer">
      <div class="logo-ft">Sua<span>Barbearia</span></div>
      <div class="footer-sub">© 2025 Sua Barbearia · Desenvolvido pela <a href="https://groven.netlify.app/" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;opacity:0.7;">Groven</a></div>
    </footer>
  `

  renderDias()
  applyConfirmPhoneMask()

  // Animações de entrada
  reveal(document.querySelector('#scheduleContent .bs-shop-head'), 0)
  revealStagger('#scheduleContent .services-grid .service-item', 60)
  reveal(document.querySelector('#scheduleContent .bs-card:last-of-type'), 0, 'reveal-scale')
  reveal(document.getElementById('confirmSection'), 100, 'reveal-scale')
  reveal(document.querySelector('#scheduleContent .bs-side'), 120)

  // Tilt nos serviços
  attachTilt('#scheduleContent .service-item', document, 6)
}

function updateSummary(field, value) {
  const li = document.getElementById(field)
  if (!li) return
  const span = li.querySelector('span:last-child')
  if (!span) return
  if (value) {
    span.textContent = value
    span.classList.remove('muted')
  } else {
    span.textContent = '—'
    span.classList.add('muted')
  }
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
  updateSummary('sumSvc', `${state.servico.nome} · ${state.servico.preco}`)
}

// Estado do calendário visível (mês/ano)
const _calState = {
  month: new Date().getMonth(),
  year:  new Date().getFullYear(),
  hostId: 'daysStrip',
  onSelect: null,  // (dateStr, label) => void
  selected: null,  // 'YYYY-MM-DD'
}

const MESES_PT_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_PT_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const WEEKDAYS_PT_SHORT = ['Sex', 'Sex', 'Sex', 'Sex', 'Sex', 'Sex', 'Sex'] // não usado direto
const WEEKDAYS_HEADER = ['D','S','T','Q','Q','S','S']

function fmtDateISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function fmtDateLabel(d) {
  const wds = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  return `${wds[d.getDay()]} ${d.getDate()}/${MESES_PT_SHORT[d.getMonth()]}`
}

function renderCalendar(host = document.getElementById(_calState.hostId)) {
  if (!host) return
  const today = new Date(); today.setHours(0,0,0,0)
  const minMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const maxFuture = new Date(today); maxFuture.setMonth(today.getMonth() + 2)

  const { month, year } = _calState
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startWd  = firstDay.getDay()
  const daysIn   = lastDay.getDate()

  const canPrev = (year > minMonth.getFullYear()) ||
                  (year === minMonth.getFullYear() && month > minMonth.getMonth())
  const canNext = (year < maxFuture.getFullYear()) ||
                  (year === maxFuture.getFullYear() && month < maxFuture.getMonth())

  let html = `
    <div class="cal-header">
      <div class="cal-month">${MESES_PT_FULL[month]} ${year}</div>
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="navCalendar(-1)" ${canPrev ? '' : 'disabled'}>‹</button>
        <button class="cal-nav-btn" onclick="navCalendar(1)"  ${canNext ? '' : 'disabled'}>›</button>
      </div>
    </div>
    <div class="cal-grid">
      ${WEEKDAYS_HEADER.map(w => `<div class="cal-weekday">${w}</div>`).join('')}
  `

  // Espaços vazios antes do primeiro dia
  for (let i = 0; i < startWd; i++) html += `<div class="cal-day empty"></div>`

  for (let d = 1; d <= daysIn; d++) {
    const date = new Date(year, month, d); date.setHours(0,0,0,0)
    const iso  = fmtDateISO(date)
    const isPast    = date < today
    const isSunday  = date.getDay() === 0
    const isFar     = date > maxFuture
    const isToday   = date.getTime() === today.getTime()
    const disabled  = isPast || isSunday || isFar
    const selected  = _calState.selected === iso
    const cls = ['cal-day']
    if (disabled) cls.push('disabled')
    if (isToday)  cls.push('today')
    if (selected) cls.push('selected')
    const onclick = disabled ? '' : `onclick="selecionarDia('${iso}')"`
    html += `<div class="${cls.join(' ')}" ${onclick}>${d}</div>`
  }

  html += `</div>`
  host.innerHTML = html
}

window.navCalendar = (dir) => {
  _calState.month += dir
  if (_calState.month > 11) { _calState.month = 0;  _calState.year++ }
  if (_calState.month < 0)  { _calState.month = 11; _calState.year-- }
  renderCalendar()
}

function renderDias() {
  // Reset do calendário pro mês atual quando renderiza um novo agendamento
  const today = new Date()
  _calState.month   = today.getMonth()
  _calState.year    = today.getFullYear()
  _calState.hostId  = 'daysStrip'
  _calState.selected = null
  renderCalendar()
  document.getElementById('timesGrid').innerHTML = ''
}

const HORARIOS = ['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00']

function dateAndTimeToISO(dateISO, horario) {
  // dateISO: 'YYYY-MM-DD', horario: 'HH:MM' → ISOString local
  const [y, m, d]  = dateISO.split('-').map(Number)
  const [h, mm]    = horario.split(':').map(Number)
  return new Date(y, m - 1, d, h, mm).toISOString()
}

window.selecionarDia = async (dateISO) => {
  _calState.selected = dateISO
  renderCalendar()

  const dateObj = new Date(dateISO + 'T00:00:00')
  state.dia      = dateISO
  state.diaLabel = fmtDateLabel(dateObj)
  state.horario  = null
  updateSummary('sumDia',  state.diaLabel)
  updateSummary('sumHora', null)

  const timesGrid = document.getElementById('timesGrid')
  const availText = document.getElementById('availText')
  const availBar  = document.getElementById('availBar')
  if (timesGrid) timesGrid.innerHTML = `<div style="color:var(--muted);font-size:13px;letter-spacing:1px;padding:8px 0">Verificando disponibilidade...</div>`
  if (availBar)  availBar.classList.add('active')
  if (availText) availText.textContent = 'Carregando...'

  await renderHorarios(dateISO)
}

async function renderHorarios(dateISO) {
  const timesGrid = document.getElementById('timesGrid')
  const availText = document.getElementById('availText')

  let ocupados  = new Set()
  let bloqueios = []
  let dataInicio, dataFim, dia, mes, ano

  try {
    const [y, mm, dd] = dateISO.split('-').map(Number)
    ano = y; mes = mm - 1; dia = dd
    dataInicio = new Date(ano, mes, dia, 0, 0, 0).toISOString()
    dataFim    = new Date(ano, mes, dia, 23, 59, 59).toISOString()

    const [agRes, blqRes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('horario')
        .eq('filial_id',   state.filial.id)
        .eq('barbeiro',    state.barbeiro.nome)
        .gte('horario',    dataInicio)
        .lte('horario',    dataFim)
        .in('status',      ['confirmado', 'pendente']),
      supabase
        .from('bloqueios')
        .select('barbeiro, inicio, fim')
        .eq('filial_id', state.filial.id)
        .or(`barbeiro.eq.${state.barbeiro.nome},barbeiro.is.null`)
        .lte('inicio', dataFim)
        .gte('fim',    dataInicio),
    ])

    if (agRes.data) agRes.data.forEach(row => {
      const h = new Date(row.horario)
      ocupados.add(`${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}`)
    })
    if (blqRes.data) bloqueios = blqRes.data
  } catch (_) {}

  function horarioBloqueado(h) {
    if (!bloqueios.length) return false
    const [hh, mm] = h.split(':').map(Number)
    const slot = new Date(ano, mes, dia, hh, mm).getTime()
    return bloqueios.some(b =>
      slot >= new Date(b.inicio).getTime() &&
      slot <  new Date(b.fim).getTime()
    )
  }

  // Se for hoje, esconder horários que já passaram (com margem de 30 min)
  const hojeISO = fmtDateISO(new Date())
  const isToday = dateISO === hojeISO
  const minTime = isToday ? Date.now() + 30 * 60 * 1000 : 0

  function horarioPassado(h) {
    if (!isToday) return false
    const [hh, mm] = h.split(':').map(Number)
    return new Date(ano, mes, dia, hh, mm).getTime() < minTime
  }

  const disponiveis = HORARIOS.filter(h => !ocupados.has(h) && !horarioBloqueado(h) && !horarioPassado(h)).length
  if (availText) {
    availText.textContent = disponiveis === 0 && isToday
      ? 'Sem horários disponíveis hoje'
      : `${disponiveis} horário${disponiveis !== 1 ? 's' : ''} disponível${disponiveis !== 1 ? 'is' : ''}`
  }

  if (!timesGrid) return
  // Esconde completamente os horários que já passaram (não mostra como cinza)
  const horariosVisiveis = HORARIOS.filter(h => !horarioPassado(h))
  timesGrid.innerHTML = horariosVisiveis.map((h, i) => {
    const indisponivel = ocupados.has(h) || horarioBloqueado(h)
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
  updateSummary('sumHora', h)
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
    const { error } = await supabase.from('agendamentos').insert({
      cliente_id:   currentUser.id,
      cliente_nome: nome,
      cliente_tel:  tel,
      filial_id:    state.filial.id,
      barbeiro:     state.barbeiro.nome,
      servico:      state.servico.nome,
      preco:        state.servico.preco,
      horario:      dateAndTimeToISO(state.dia, state.horario),
      observacoes:  document.getElementById('clientObs')?.value.trim() || null,
      status:       'confirmado',
    })

    if (error) throw new Error(error.message)

    const details = document.getElementById('confirmDetails')
    if (details) {
      details.innerHTML = `
        <div><strong>Cliente:</strong> ${escapeHTML(nome)}</div>
        <div><strong>Unidade:</strong> ${escapeHTML(state.filial.nome)}</div>
        <div><strong>Barbeiro:</strong> ${escapeHTML(state.barbeiro.nome)}</div>
        <div><strong>Serviço:</strong> ${escapeHTML(state.servico.nome)} — <span class="hl">${escapeHTML(state.servico.preco)}</span></div>
        <div><strong>Data:</strong> ${escapeHTML(state.diaLabel || state.dia)} às <span class="hl">${escapeHTML(state.horario)}</span></div>
        <div style="margin-top:10px;font-size:13px;color:var(--muted)">Confirmação para <span class="hl">${escapeHTML(tel)}</span></div>
      `
    }
    goToStep(4)

    const rawTel = tel.replace(/\D/g, '')
    if (rawTel.length >= 10) {
      const msg = [
        `*Agendamento Confirmado*`,
        ``,
        `Olá, ${nome}! Seu horário foi confirmado com sucesso.`,
        ``,
        `*Unidade:* ${state.filial.nome}`,
        `*Barbeiro:* ${state.barbeiro.nome}`,
        `*Serviço:* ${state.servico.nome} (${state.servico.preco})`,
        `*Data:* ${state.diaLabel || state.dia} às ${state.horario}`,
        document.getElementById('clientObs')?.value.trim()
          ? `📝 *Obs:* ${document.getElementById('clientObs').value.trim()}`
          : null,
        ``,
        `Até lá! 👋`,
      ].filter(Boolean).join('\n')
      window.open(`https://wa.me/55${rawTel}?text=${encodeURIComponent(msg)}`, '_blank')
    }
  } catch (err) {
    alert('Erro ao confirmar: ' + (err.message || 'Tente novamente.'))
    btn.textContent = 'Confirmar Agendamento'
  }
}

// ─── RESET ───────────────────────────────────────────────
function resetFlow() {
  Object.assign(state, { filial: null, barbeiro: null, servico: null, dia: null, horario: null })
  goToStep(0)
}

// ─── REAGENDAMENTO ───────────────────────────────────────
let _reagendar = { id: null, filialId: null, barbeiroNome: null, dia: null, horario: null }

window.reagendarFromCard = (btn) => {
  const card = btn.closest('[data-ag-id]')
  reagendarAgendamento(card.dataset.agId, parseInt(card.dataset.filial), card.dataset.barbeiro)
}

window.reagendarAgendamento = (id, filialId, barbeiroNome) => {
  _reagendar = { id, filialId, barbeiroNome, dia: null, horario: null }
  document.getElementById('reagendarTitle').textContent = `Reagendar — ${barbeiroNome}`
  document.getElementById('reagendarContext').textContent = `Escolha uma nova data e horário`
  document.getElementById('reagendarMsg').style.display = 'none'
  document.getElementById('reagendarTimesGrid').innerHTML = ''
  renderReagendarDias()
  document.getElementById('reagendarModal').classList.add('open')
}

window.closeReagendarModal = () => {
  document.getElementById('reagendarModal')?.classList.remove('open')
}

// Estado do calendário de reagendamento (independente do principal)
const _calReagState = {
  month: new Date().getMonth(),
  year:  new Date().getFullYear(),
  selected: null,
}

function renderReagendarDias() {
  const today = new Date()
  _calReagState.month = today.getMonth()
  _calReagState.year  = today.getFullYear()
  _calReagState.selected = null
  renderReagendarCalendar()
}

function renderReagendarCalendar() {
  const host = document.getElementById('reagendarDaysStrip')
  if (!host) return
  const today = new Date(); today.setHours(0,0,0,0)
  const minMonth  = new Date(today.getFullYear(), today.getMonth(), 1)
  const maxFuture = new Date(today); maxFuture.setMonth(today.getMonth() + 2)

  const { month, year } = _calReagState
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startWd  = firstDay.getDay()
  const daysIn   = lastDay.getDate()

  const canPrev = (year > minMonth.getFullYear()) ||
                  (year === minMonth.getFullYear() && month > minMonth.getMonth())
  const canNext = (year < maxFuture.getFullYear()) ||
                  (year === maxFuture.getFullYear() && month < maxFuture.getMonth())

  let html = `
    <div class="cal-header">
      <div class="cal-month">${MESES_PT_FULL[month]} ${year}</div>
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="navReagCalendar(-1)" ${canPrev ? '' : 'disabled'}>‹</button>
        <button class="cal-nav-btn" onclick="navReagCalendar(1)"  ${canNext ? '' : 'disabled'}>›</button>
      </div>
    </div>
    <div class="cal-grid">
      ${WEEKDAYS_HEADER.map(w => `<div class="cal-weekday">${w}</div>`).join('')}
  `
  for (let i = 0; i < startWd; i++) html += `<div class="cal-day empty"></div>`
  for (let d = 1; d <= daysIn; d++) {
    const date = new Date(year, month, d); date.setHours(0,0,0,0)
    const iso  = fmtDateISO(date)
    const isPast    = date < today
    const isSunday  = date.getDay() === 0
    const isFar     = date > maxFuture
    const isToday   = date.getTime() === today.getTime()
    const disabled  = isPast || isSunday || isFar
    const selected  = _calReagState.selected === iso
    const cls = ['cal-day']
    if (disabled) cls.push('disabled')
    if (isToday)  cls.push('today')
    if (selected) cls.push('selected')
    const onclick = disabled ? '' : `onclick="selecionarDiaReagendar('${iso}')"`
    html += `<div class="${cls.join(' ')}" ${onclick}>${d}</div>`
  }
  html += `</div>`
  host.innerHTML = html
}

window.navReagCalendar = (dir) => {
  _calReagState.month += dir
  if (_calReagState.month > 11) { _calReagState.month = 0;  _calReagState.year++ }
  if (_calReagState.month < 0)  { _calReagState.month = 11; _calReagState.year-- }
  renderReagendarCalendar()
}

window.selecionarDiaReagendar = async (dateISO) => {
  _calReagState.selected = dateISO
  renderReagendarCalendar()
  const dateObj = new Date(dateISO + 'T00:00:00')
  _reagendar.dia      = dateISO
  _reagendar.diaLabel = fmtDateLabel(dateObj)
  _reagendar.horario  = null
  const grid = document.getElementById('reagendarTimesGrid')
  if (grid) grid.innerHTML = `<div style="color:var(--muted);font-size:13px;letter-spacing:1px;padding:8px 0">Verificando disponibilidade...</div>`
  await renderReagendarHorarios(dateISO)
}

async function renderReagendarHorarios(dateISO) {
  const grid = document.getElementById('reagendarTimesGrid')
  let ocupados = new Set()
  let bloqueios = []
  let dia, mes, ano

  try {
    const [y, mm, dd] = dateISO.split('-').map(Number)
    ano = y; mes = mm - 1; dia = dd
    const dataInicio = new Date(ano, mes, dia, 0, 0, 0).toISOString()
    const dataFim    = new Date(ano, mes, dia, 23, 59, 59).toISOString()
    const [agRes, blqRes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('horario')
        .eq('filial_id',  _reagendar.filialId)
        .eq('barbeiro',   _reagendar.barbeiroNome)
        .gte('horario',   dataInicio)
        .lte('horario',   dataFim)
        .in('status',     ['confirmado', 'pendente'])
        .neq('id',        _reagendar.id),
      supabase
        .from('bloqueios')
        .select('barbeiro, inicio, fim')
        .eq('filial_id', _reagendar.filialId)
        .or(`barbeiro.eq.${_reagendar.barbeiroNome},barbeiro.is.null`)
        .lte('inicio', dataFim)
        .gte('fim',    dataInicio),
    ])
    if (agRes.data) agRes.data.forEach(row => {
      const h = new Date(row.horario)
      ocupados.add(`${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}`)
    })
    if (blqRes.data) bloqueios = blqRes.data
  } catch (_) {}

  function horarioBloqueado(h) {
    if (!bloqueios.length) return false
    const [hh, mm] = h.split(':').map(Number)
    const slot = new Date(ano, mes, dia, hh, mm).getTime()
    return bloqueios.some(b =>
      slot >= new Date(b.inicio).getTime() &&
      slot <  new Date(b.fim).getTime()
    )
  }

  // Se for hoje, esconder horários já passados (margem 30 min)
  const hojeISO = fmtDateISO(new Date())
  const isToday = dateISO === hojeISO
  const minTime = isToday ? Date.now() + 30 * 60 * 1000 : 0
  function horarioPassado(h) {
    if (!isToday) return false
    const [hh, mm] = h.split(':').map(Number)
    return new Date(ano, mes, dia, hh, mm).getTime() < minTime
  }

  if (!grid) return
  const horariosVisiveis = HORARIOS.filter(h => !horarioPassado(h))
  grid.innerHTML = horariosVisiveis.map((h, i) => {
    const indisponivel = ocupados.has(h) || horarioBloqueado(h)
    return `
      <div class="time-btn ${indisponivel ? 'unavailable' : ''}"
           id="rtime-${i}"
           onclick="selecionarHorarioReagendar(${i}, '${h}')">
        ${h}
      </div>
    `
  }).join('')
}

window.selecionarHorarioReagendar = (i, h) => {
  const btn = document.getElementById(`rtime-${i}`)
  if (!btn || btn.classList.contains('unavailable')) return
  document.querySelectorAll('#reagendarTimesGrid .time-btn').forEach(b => b.classList.remove('selected'))
  btn.classList.add('selected')
  _reagendar.horario = h
}

window.confirmarReagendamento = async () => {
  const msgEl = document.getElementById('reagendarMsg')
  const btn   = document.getElementById('reagendarBtn')
  if (!_reagendar.dia || !_reagendar.horario) {
    msgEl.textContent   = 'Selecione a data e o horário.'
    msgEl.style.display = 'block'
    return
  }
  btn.textContent = 'Salvando...'
  btn.disabled    = true
  msgEl.style.display = 'none'
  try {
    const novoHorario = dateAndTimeToISO(_reagendar.dia, _reagendar.horario)
    const { error } = await supabase
      .from('agendamentos')
      .update({ horario: novoHorario, status: 'confirmado' })
      .eq('id', _reagendar.id)
    if (error) throw new Error(error.message)
    closeReagendarModal()
    loadHistorico()
  } catch (err) {
    msgEl.textContent   = err.message || 'Erro ao reagendar. Tente novamente.'
    msgEl.style.display = 'block'
    btn.textContent = 'Confirmar novo horário'
    btn.disabled    = false
  }
}

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSession()

  renderFiliais()

  // ── Animações: ripple + magnetic + smooth scroll + letter reveal estático ──
  attachGlobalRipple()
  attachMagneticEffect()
  attachSmoothScroll()
  setupLetterReveal('#step-1 .section-title')

  // ── Rede de segurança: força loading a sair se algo travar ──
  setTimeout(() => {
    document.getElementById('loadingScreen')?.classList.add('hide')
    const hero = document.querySelector('#step-0 .hero')
    if (hero && !hero.classList.contains('hero-anim') && !hero.classList.contains('hero-ready')) {
      hero.classList.add('hero-ready')
    }
  }, 5000)

  // Se a página está sendo aberta vinda de uma transição (ex: dashboard → /),
  // pula o loading screen e o scramble pra não duplicar com o curtain.
  const cameFromTransition = document.documentElement.classList.contains('page-entering')

  // ── Boot sequence: loading → hero anim → scramble + parallax ──
  ;(async () => {
    try {
      if (cameFromTransition) {
        document.getElementById('loadingScreen')?.classList.add('hide')
        const hero = document.querySelector('#step-0 .hero')
        hero?.classList.add('hero-ready') // mostra direto, sem animação de subir
        try { attachHeroParallax() } catch (e) { console.warn('parallax falhou', e) }
        return
      }
      await wait(1200) // espera animações internas do loading terminarem
      document.getElementById('loadingScreen')?.classList.add('hide')
      await wait(280) // espera fade do loading completar
      const hero = document.querySelector('#step-0 .hero')
      hero?.classList.add('hero-anim')
      try { attachHeroParallax() } catch (e) { console.warn('parallax falhou', e) }
      try { scrambleHeroTitle() } catch (e) { console.warn('scramble falhou', e) }
    } catch (e) {
      console.error('boot animation falhou', e)
      document.getElementById('loadingScreen')?.classList.add('hide')
      document.querySelector('#step-0 .hero')?.classList.add('hero-ready')
    }
  })()

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

  document.getElementById('reagendarModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeReagendarModal()
  })

  document.querySelectorAll('.nav-login-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (isLoggedIn) openProfileModal()
      else openLoginModal()
    })
  })

  ;['loginTel', 'profileTel'].forEach(id => {
    const el = document.getElementById(id)
    if (el) applyPhoneMask(el)
  })

  document.getElementById('btnAgendar').addEventListener('click', () => iniciarAgendamentoDireto())
  document.getElementById('back1').addEventListener('click',      () => goToStep(0))
  document.getElementById('back2').addEventListener('click',      () => goToStep(0))
  document.getElementById('back3').addEventListener('click',      () => goToStep(2))
  document.getElementById('back5')?.addEventListener('click',     () => goToStep(0))
  document.getElementById('btnReset').addEventListener('click',   resetFlow)

  let _tx = null, _ty = null
  document.addEventListener('touchstart', e => {
    if (e.target.closest('.bs-photos') || e.target.closest('.days-strip')) { _tx = null; return }
    _tx = e.changedTouches[0].screenX
    _ty = e.changedTouches[0].screenY
  }, { passive: true })
  document.addEventListener('touchend', e => {
    if (_tx === null) return
    const dx = e.changedTouches[0].screenX - _tx
    const dy = e.changedTouches[0].screenY - _ty
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 0 && currentStep > 0) {
      const target = currentStep - 1 === 1 ? 0 : currentStep - 1 // pula step-1 (unidades)
      goToStep(target)
    }
    _tx = null
  }, { passive: true })
})
