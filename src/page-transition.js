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

  // ── ENTRADA: se a classe page-entering existe, abre o curtain ──
  function handleEnter() {
    const html = document.documentElement
    const fromTransition = html.classList.contains('page-entering') ||
                           sessionStorage.getItem(FLAG) === '1'
    if (!fromTransition) return
    sessionStorage.removeItem(FLAG)

    function open() {
      const curtain = getCurtain()
      if (!curtain) { html.classList.remove('page-entering'); return }
      // Pequeno delay pra deixar o conteúdo da página renderizar antes
      setTimeout(() => {
        // Antes de remover a classe, fixamos o estado "cover" via classe oficial pra
        // garantir continuidade visual quando page-entering for retirada
        curtain.classList.add('cover')
        void curtain.offsetWidth
        html.classList.remove('page-entering')
        curtain.classList.remove('cover')
        curtain.classList.add('uncover')
        setTimeout(() => curtain.classList.remove('uncover'), CURTAIN_DURATION + 50)
      }, 100)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', open, { once: true })
    } else {
      open()
    }
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
