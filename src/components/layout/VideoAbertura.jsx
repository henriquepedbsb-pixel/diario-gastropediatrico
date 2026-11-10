import { useEffect, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Vídeo de abertura (login e convite): loop curto, sem som.
   Mostra só a foto (poster) quando o aparelho pede menos movimento,
   está em economia de dados, ou se o vídeo não carregar.
   Arquivos em /public: abertura.mp4 (~1,4 MB) e abertura-poster.jpg.
───────────────────────────────────────────────────────────── */

const VIDEO  = '/abertura.mp4'
const POSTER = '/abertura-poster.jpg'

function preferirFoto() {
  if (typeof window === 'undefined') return true
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true
    if (navigator.connection?.saveData) return true
  } catch { /* navegador antigo: segue com o vídeo */ }
  return false
}

export default function VideoAbertura({ className = '', posicao = 'object-center' }) {
  const [soFoto, setSoFoto] = useState(true)   // começa com a foto; liga o vídeo após montar

  useEffect(() => { setSoFoto(preferirFoto()) }, [])

  const classes = `w-full h-full object-cover ${posicao} ${className}`

  if (soFoto) {
    return <img src={POSTER} alt="Dr. Henrique Gomes no consultório" className={classes} />
  }
  return (
    <video
      className={classes}
      src={VIDEO}
      poster={POSTER}
      autoPlay muted loop playsInline
      preload="metadata"
      disablePictureInPicture
      aria-label="Dr. Henrique Gomes no consultório"
      onError={() => setSoFoto(true)}
    />
  )
}
