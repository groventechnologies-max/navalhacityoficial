// Transições de página com curtain wipe — compartilhado entre index, dashboard e equipe.
// Intercepta cliques em links internos e expõe window.pageTransitionTo(url) para
// navegação programática (ex: após logout).
;(function () {
  const INTERNAL_PATHS = ['/', '/dashboard', '/equipe']
  const CURTAIN_DURATION = 580
  const FLAG = 'pageTransitionEnter'

  function isInternalHref(href) {
    if (!href) return false
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false
    if (/^https?:\/\//i.test(href)) {
      try {
        const u = new URL(href)
        if (u.origin !== window.location.origin) return false
        href = u.pathname + u.search + u.hash
      } catch { return false }
    }
    const path = href.split(/[?#]/)[0]
    return INTERNAL_PATHS.includes(path)
  }

  function getCurtain() { return document.getElementById('curtain') }

  // ── ENTRADA: se vier de uma transição, mantém curtain coberto e abre suavemente ──
  function handleEnter() {
    if (sessionStorage.getItem(FLAG) !== '1') return
    sessionStorage.removeItem(FLAG)

    // Injeta estilo que mantém curtain coberto SEM animação até o JS principal rodar.
    const earlyStyle = document.createElement('style')
    earlyStyle.id = '_curtainEarlyCover'
    earlyStyle.textContent = `
      #curtain { pointer-events: all !important; }
      #curtain .curtain-top    { transform: translateY(0) !important; transition: none !important; }
      #curtain .curtain-bottom { transform: translateY(0) !important; transition: none !important; }
      #curtain .curtain-mark   { opacity: 1 !important; transition: opacity 0.3s ease !important; }
      #curtain .curtain-mark-text { transform: translateY(0) !important; }
      #curtain .curtain-mark-line { width: 140px !important; }
    `
    if (document.head) document.head.appendChild(earlyStyle)
    else document.addEventListener('DOMContentLoaded', () => document.head.appendChild(earlyStyle), { once: true })

    document.addEventListener('DOMContentLoaded', () => {
      // Pequeno delay pra garantir que o conteúdo já está renderizado antes do curtain abrir
      setTimeout(() => {
        const curtain = getCurtain()
        if (!curtain) { earlyStyle.remove(); return }
        // Remove o early style e ativa as classes oficiais pra animar saída
        earlyStyle.remove()
        curtain.classList.add('cover')
        // Reflow pra commit do estado coberto via classes nativas
        void curtain.offsetWidth
        curtain.classList.remove('cover')
        curtain.classList.add('uncover')
        setTimeout(() => curtain.classList.remove('uncover'), CURTAIN_DURATION + 50)
      }, 80)
    }, { once: true })
  }

  // ── SAÍDA: cobre, salva flag, navega ──
  function pageTransitionTo(url) {
    if (!url) return
    const curtain = getCurtain()
    if (!curtain) {
      window.location.href = url
      return
    }
    sessionStorage.setItem(FLAG, '1')
    curtain.classList.remove('uncover')
    void curtain.offsetWidth
    curtain.classList.add('cover')
    setTimeout(() => { window.location.href = url }, CURTAIN_DURATION)
  }

  // ── Intercepta cliques em links de navegação interna ──
  function attachLinkInterceptor() {
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      const link = e.target.closest && e.target.closest('a[href]')
      if (!link) return
      if (link.target && link.target !== '' && link.target !== '_self') return
      if (link.hasAttribute('download')) return
      const href = link.getAttribute('href')
      if (!isInternalHref(href)) return
      // Não intercepta se for o mesmo path da página atual (sem search/hash diferentes)
      const targetPath = href.split(/[?#]/)[0]
      if (targetPath === window.location.pathname) return
      e.preventDefault()
      pageTransitionTo(href)
    })
  }

  window.pageTransitionTo = pageTransitionTo

  handleEnter()
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachLinkInterceptor, { once: true })
  } else {
    attachLinkInterceptor()
  }
})()
