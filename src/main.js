import { DATA } from './data.js'

// ─── UTILS ───────────────────────────────────────────────
function wait(ms) { return new Promise(r => setTimeout(r, ms)) }
function reducedMotion() { return false }
function hasFinePointer() { return window.matchMedia('(any-pointer: fine)').matches }
function isTouch() { return !hasFinePointer() }

// ─── STATUS DA FILIAL (aberto/fechado) ───────────────────
function getFilialStatus(filial, now = new Date()) {
  const horario = filial.horario || { abre: 9, fecha: 19 }
  const dia    = now.getDay()
  const hora   = now.getHours() + now.getMinutes() / 60
  const fechadoDom = dia === 0
  const aberto = !fechadoDom && hora >= horario.abre && hora < horario.fecha
  const pad = (n) => String(n).padStart(2, '0')
  if (aberto) {
    return { aberto: true, label: 'Aberto', subLabel: `fecha às ${pad(horario.fecha)}h` }
  }
  let proxDia = dia
  if (hora >= horario.fecha) proxDia = (dia + 1) % 7
  if (proxDia === 0) proxDia = 1
  const diasNomes = ['domingo', 'amanhã', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
  const isHoje    = (proxDia === dia && hora < horario.abre)
  const labelDia  = isHoje ? 'hoje' : (proxDia === ((dia + 1) % 7) ? 'amanhã' : diasNomes[proxDia])
  return { aberto: false, label: 'Fechado', subLabel: `abre ${labelDia} às ${pad(horario.abre)}h` }
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

function markRevealStagger(selector, baseDelay = 70, variant = '', root = document) {
  root.querySelectorAll(selector).forEach((el, i) => {
    if (el.classList.contains('reveal')) return
    el.classList.add('reveal')
    if (variant) el.classList.add(variant)
    el.style.setProperty('--reveal-delay', `${i * baseDelay}ms`)
  })
}

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
  const SELECTOR = '.btn-primary, .btn-confirm, .btn-select, .btn-back, .filial-header'
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
  if (!hasFinePointer()) return
  const SELECTOR = '.btn-primary, .btn-confirm'
  const STRENGTH = 0.25
  document.querySelectorAll(SELECTOR).forEach(btn => bindMagnetic(btn, STRENGTH))
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
  btn.addEventListener('pointerleave', () => { btn.style.transform = '' })
}

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
        span.textContent = char === ' ' ? ' ' : char
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
  await wait(400)
  callback()
  await wait(80)
  curtain.classList.remove('cover')
  curtain.classList.add('uncover')
  await wait(400)
  curtain.classList.remove('uncover')
  _curtainRunning = false
}

// ─── STATE ───────────────────────────────────────────────
let currentStep = 0

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
    currentStep = n
  }).then(() => {
    if (n === 1) commitReveal('#filiaisList .filial-item:not(.sk-card)')
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
<div class="filial-tags">
                ${f.tags.map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
              <button class="btn-select" onclick="selecionarFilial(${f.id})">
                Agendar nesta unidade →
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
    markRevealStagger('#filiaisList .filial-item', 90)
    if (currentStep === 1) commitReveal('#filiaisList .filial-item')
  }, 600)
}

window.toggleFilial = (id) => {
  const el = document.getElementById(`filial-${id}`)
  if (!el) return
  const isOpen = el.classList.contains('open')
  document.querySelectorAll('.filial-item').forEach(i => i.classList.remove('open'))
  if (!isOpen) el.classList.add('open')
}

// ─── WHATSAPP REDIRECT ────────────────────────────────────
// Número de destino: cada filial usa o campo `whatsapp` do data.js
// Para trocar para um número único, altere a linha abaixo
window.selecionarFilial = (id) => {
  const filial = DATA.filiais.find(f => f.id === id)
  if (!filial) return

  const numero = filial.whatsapp // ex: '5513988001001'
  const msg = [
    `Olá! Vim pelo site da Navalha City e gostaria de agendar um corte de cabelo.`,
    ``,
    `📍 *Unidade escolhida:* ${filial.nome} — ${filial.regiao}`,
    ``,
    `Poderia me ajudar com um horário? 😊`,
  ].join('\n')

  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank')
}

// ─── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderFiliais()

  attachGlobalRipple()
  attachMagneticEffect()
  setupLetterReveal('#step-1 .section-title')

  setTimeout(() => {
    document.getElementById('loadingScreen')?.classList.add('hide')
    const hero = document.querySelector('#step-0 .hero')
    if (hero && !hero.classList.contains('hero-anim') && !hero.classList.contains('hero-ready')) {
      hero.classList.add('hero-ready')
    }
  }, 5000)

  const cameFromTransition = document.documentElement.classList.contains('page-entering')

  ;(async () => {
    try {
      if (cameFromTransition) {
        document.getElementById('loadingScreen')?.classList.add('hide')
        const hero = document.querySelector('#step-0 .hero')
        hero?.classList.add('hero-ready')
        try { attachHeroParallax() } catch (e) { console.warn('parallax falhou', e) }
        return
      }
      await wait(1200)
      document.getElementById('loadingScreen')?.classList.add('hide')
      await wait(280)
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

  document.getElementById('btnAgendar').addEventListener('click', () => goToStep(1))
  document.getElementById('back1').addEventListener('click',      () => goToStep(0))

  // Swipe para voltar
  let _tx = null, _ty = null
  document.addEventListener('touchstart', e => {
    _tx = e.changedTouches[0].screenX
    _ty = e.changedTouches[0].screenY
  }, { passive: true })
  document.addEventListener('touchend', e => {
    if (_tx === null) return
    const dx = e.changedTouches[0].screenX - _tx
    const dy = e.changedTouches[0].screenY - _ty
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dx > 0 && currentStep > 0) {
      goToStep(0)
    }
    _tx = null
  }, { passive: true })
})
