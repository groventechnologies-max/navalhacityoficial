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

// ─── ANIMAÇÕES: SMOOTH SCROLL (lerp) ─────────────────────
function attachSmoothScroll() {
  if (isTouch() || reducedMotion()) return
  document.querySelectorAll('.step').forEach(step => {
    if (step._smoothScroll) return
    step._smoothScroll = true
    let target = step.scrollTop
    let current = step.scrollTop
    let raf = null

    step.addEventListener('wheel', (e) => {
      // não interceptar scroll horizontal nem dentro de scrollers internos
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (e.target.closest && e.target.closest('.profile-photos, .days-strip, .portfolio-strip, iframe')) return
      const max = step.scrollHeight - step.clientHeight
      if (max <= 0) return
      e.preventDefault()
      target = Math.max(0, Math.min(target + e.deltaY, max))
      if (!raf) raf = requestAnimationFrame(tick)
    }, { passive: false })

    function tick() {
      const diff = target - current
      if (Math.abs(diff) < 0.5) {
        current = target
        step.scrollTop = target
        raf = null
        return
      }
      current += diff * 0.18
      step.scrollTop = current
      raf = requestAnimationFrame(tick)
    }

    // resync se houver scroll programático
    step._syncScroll = () => { target = step.scrollTop; current = step.scrollTop }
  })
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
  await wait(580)        // painéis se encontram no meio + brand mark aparece
  callback()             // troca o conteúdo enquanto está totalmente coberto
  await wait(120)        // pequena pausa pra brand mark "respirar"
  curtain.classList.remove('cover')
  curtain.classList.add('uncover')
  await wait(580)        // painéis voltam pras bordas
  curtain.classList.remove('uncover')
  _curtainRunning = false
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
      .select('id, servico, barbeiro, horario, status, filial_id')
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

    const now = new Date()
    container.innerHTML = data.map(ag => {
      const d    = new Date(ag.horario)
      const dia  = String(d.getDate()).padStart(2,'0')
      const mes  = mesesPt[d.getMonth()]
      const hora = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      const cor  = statusColor[ag.status] || '#888'
      const filialNome = DATA.filiais.find(f => f.id === ag.filial_id)?.nome || `Unidade ${ag.filial_id}`
      const podeAlterar = d > now && (ag.status === 'confirmado' || ag.status === 'pendente')
      return `
        <div
          data-ag-id="${ag.id}"
          data-filial="${ag.filial_id}"
          data-barbeiro="${escapeHTML(ag.barbeiro)}"
          style="
            padding: 12px 14px;
            margin-bottom: 8px;
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 4px;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 13px;
            letter-spacing: 0.5px;
          "
        >
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
          ${podeAlterar ? `
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
            <button
              onclick="reagendarFromCard(this)"
              style="background:none;border:1px solid #555;color:#aaa;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:2px;cursor:pointer;transition:background 0.2s,color 0.2s"
              onmouseover="this.style.background='rgba(255,255,255,0.07)'"
              onmouseout="this.style.background='none'"
            >Reagendar</button>
            <button
              onclick="cancelarAgendamento('${ag.id}')"
              style="background:none;border:1px solid #c0392b;color:#e74c3c;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:2px;cursor:pointer;transition:background 0.2s,color 0.2s"
              onmouseover="this.style.background='rgba(192,57,43,0.15)'"
              onmouseout="this.style.background='none'"
            >Cancelar</button>
          </div>
          ` : ''}
        </div>
      `
    }).join('')
  } catch (err) {
    container.innerHTML = `<div style="color:#e74c3c;font-size:12px">Erro ao carregar histórico.</div>`
  }
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
      .eq('id', (await supabase.auth.getUser()).data.user.id)

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
    // Marca itens como ocultos (opacity 0) sempre — evita flash quando curtain abrir
    markRevealStagger('#filiaisList .filial-item', 90)
    // Se o usuário já está no step 1, dispara animação imediatamente
    if (currentStep === 1) {
      commitReveal('#filiaisList .filial-item')
    }
  }, 600)
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
  goToStep(2)

  document.getElementById('profileContent').innerHTML = `
    <div style="padding:48px 0;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;color:#888">
      Carregando...
    </div>
  `

  const { data } = await supabase
    .from('equipe')
    .select('nome, especialidade, nota, foto_url')
    .eq('filial_id', id)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })

  if (data && data.length > 0) {
    state.filial = {
      ...state.filial,
      barbeiros: data.map(m => ({
        nome:          m.nome,
        especialidade: m.especialidade || '—',
        nota:          m.nota ? `${m.nota} ★` : '',
        foto:          m.foto_url || null,
        emoji:         '✂️',
      })),
    }
  }

  renderPerfil()
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

    <footer class="step-footer">
      <div class="logo-ft">Navalha<span>City</span></div>
      <div class="footer-sub">© 2025 Navalha City · Desenvolvido pela <a href="https://groven.netlify.app/" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;opacity:0.7;">Groven</a></div>
    </footer>
  `

  // Animações de entrada
  reveal(document.querySelector('#profileContent .section-label'), 0)
  reveal(document.querySelector('#profileContent .profile-photos-wrap'), 80, 'reveal-scale')
  reveal(document.querySelector('#profileContent .barbers-label'), 180)
  reveal(document.querySelector('#profileContent .barbers-title'), 240)
  revealStagger('#profileContent .barber-card', 80)
  reveal(document.querySelector('#profileContent .profile-desc'), 0, 'reveal-scale')

  // 3D tilt nos barbeiros + counter nas stats
  attachTilt('#profileContent .barber-card', document, 8)
  setupCounters(document.getElementById('profileContent'))
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
  applyConfirmPhoneMask()

  // Animações de entrada
  reveal(document.querySelector('#scheduleContent .section-label'), 0)
  revealStagger('#scheduleContent .schedule-context .context-chip', 60)
  revealStagger('#scheduleContent .services-grid .service-item', 60)
  reveal(document.querySelector('#scheduleContent .sched-block:last-of-type'), 0, 'reveal-scale')
  reveal(document.getElementById('confirmSection'), 100, 'reveal-scale')

  // Letter reveal no título "Agendamento" + tilt nos serviços
  setupLetterReveal('#scheduleContent .section-title')
  attachTilt('#scheduleContent .service-item', document, 6)
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

function labelParaISO(label, horario) {
  const meses = { Jan:0, Fev:1, Mar:2, Abr:3, Mai:4, Jun:5, Jul:6, Ago:7, Set:8, Out:9, Nov:10, Dez:11 }
  const partes = label.split(' ')[1].split('/')
  const dia    = parseInt(partes[0])
  const mes    = meses[partes[1]]
  const ano    = new Date().getFullYear()
  const [h, m] = horario.split(':').map(Number)
  const d = new Date(ano, mes, dia, h, m)
  if (d < new Date()) d.setFullYear(ano + 1)
  return d.toISOString()
}

window.selecionarDia = async (i, label) => {
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'))
  const dayBtn = document.getElementById(`day-${i}`)
  if (dayBtn) dayBtn.classList.add('selected')
  state.dia    = label
  state.diaIdx = i
  state.horario = null

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
  } catch (_) {}

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
      cliente_id:   user.id,
      cliente_nome: nome,
      cliente_tel:  tel,
      filial_id:    state.filial.id,
      barbeiro:     state.barbeiro.nome,
      servico:      state.servico.nome,
      preco:        state.servico.preco,
      horario:      labelParaISO(state.dia, state.horario),
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
        <div><strong>Data:</strong> ${escapeHTML(state.dia)} às <span class="hl">${escapeHTML(state.horario)}</span></div>
        <div style="margin-top:10px;font-size:13px;color:var(--muted)">Confirmação para <span class="hl">${escapeHTML(tel)}</span></div>
      `
    }
    goToStep(4)

    const rawTel = tel.replace(/\D/g, '')
    if (rawTel.length >= 10) {
      const msg = [
        `✂️ *Agendamento Confirmado — Navalha City*`,
        ``,
        `Olá, ${nome}! Seu horário foi confirmado com sucesso.`,
        ``,
        `📌 *Unidade:* ${state.filial.nome}`,
        `💈 *Barbeiro:* ${state.barbeiro.nome}`,
        `✂️ *Serviço:* ${state.servico.nome} (${state.servico.preco})`,
        `📅 *Data:* ${state.dia} às ${state.horario}`,
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

function renderReagendarDias() {
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const months   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const today    = new Date()
  document.getElementById('reagendarDaysStrip').innerHTML = Array.from({ length: 14 }, (_, i) => {
    const d   = new Date(today)
    d.setDate(today.getDate() + i + 1)
    const wd  = weekdays[d.getDay()]
    const dn  = d.getDate()
    const mon = months[d.getMonth()]
    const label = `${wd} ${dn}/${mon}`
    return `
      <div class="day-btn" id="rday-${i}" onclick="selecionarDiaReagendar(${i}, '${label}')">
        <div class="day-weekday">${wd}</div>
        <div class="day-num">${dn}</div>
        <div class="day-month" style="font-size:10px;opacity:0.6">${mon}</div>
      </div>
    `
  }).join('')
}

window.selecionarDiaReagendar = async (i, label) => {
  document.querySelectorAll('#reagendarDaysStrip .day-btn').forEach(b => b.classList.remove('selected'))
  const btn = document.getElementById(`rday-${i}`)
  if (btn) btn.classList.add('selected')
  _reagendar.dia     = label
  _reagendar.horario = null
  const grid = document.getElementById('reagendarTimesGrid')
  if (grid) grid.innerHTML = `<div style="color:var(--muted);font-size:13px;letter-spacing:1px;padding:8px 0">Verificando disponibilidade...</div>`
  await renderReagendarHorarios(label)
}

async function renderReagendarHorarios(label) {
  const grid = document.getElementById('reagendarTimesGrid')
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
      .eq('filial_id',  _reagendar.filialId)
      .eq('barbeiro',   _reagendar.barbeiroNome)
      .gte('horario',   dataInicio)
      .lte('horario',   dataFim)
      .in('status',     ['confirmado', 'pendente'])
      .neq('id',        _reagendar.id)
    if (data) data.forEach(row => {
      const h = new Date(row.horario)
      ocupados.add(`${String(h.getHours()).padStart(2,'0')}:${String(h.getMinutes()).padStart(2,'0')}`)
    })
  } catch (_) {}
  if (!grid) return
  grid.innerHTML = HORARIOS.map((h, i) => {
    const indisponivel = ocupados.has(h)
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
    const novoHorario = labelParaISO(_reagendar.dia, _reagendar.horario)
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
      await wait(2000) // espera animações internas do loading terminarem
      document.getElementById('loadingScreen')?.classList.add('hide')
      await wait(450) // espera fade do loading completar
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

  document.getElementById('btnAgendar').addEventListener('click', () => goToStep(1))
  document.getElementById('back1').addEventListener('click',      () => goToStep(0))
  document.getElementById('back2').addEventListener('click',      () => goToStep(1))
  document.getElementById('back3').addEventListener('click',      () => goToStep(2))
  document.getElementById('btnReset').addEventListener('click',   resetFlow)

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
