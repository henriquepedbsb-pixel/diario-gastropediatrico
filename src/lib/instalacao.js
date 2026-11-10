/* Instalação do PedDiário na tela inicial.
   O Chrome/Android avisa que o app pode ser instalado pelo evento
   `beforeinstallprompt`, que dispara cedo — por isso é guardado aqui, fora do React. */

let eventoInstalar = null
const ouvintes = new Set()
const avisar = () => ouvintes.forEach(fn => fn(eventoInstalar))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()          // segura o aviso nativo para oferecermos no momento certo
    eventoInstalar = e
    avisar()
  })
  window.addEventListener('appinstalled', () => { eventoInstalar = null; avisar() })
}

export const eventoDeInstalacao = () => eventoInstalar
export const aoMudarInstalacao = (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn) }
export const limparEventoDeInstalacao = () => { eventoInstalar = null; avisar() }

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '')

export const estaInstalado = () =>
  typeof window !== 'undefined' && (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )

export const ehSamsungInternet = () => /SamsungBrowser/i.test(ua())
export const ehAndroid = () => /Android/i.test(ua())
export const ehIOS = () =>
  /iPhone|iPad|iPod/i.test(ua()) ||
  // iPadOS se apresenta como Mac, mas tem tela de toque
  (/Macintosh/i.test(ua()) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)

/* Abre o endereço atual do PedDiário no Chrome (Android) */
export const linkAbrirNoChrome = (caminho = '/') => {
  const host = typeof window !== 'undefined' ? window.location.host : ''
  return `intent://${host}${caminho}#Intent;scheme=https;package=com.android.chrome;end`
}
