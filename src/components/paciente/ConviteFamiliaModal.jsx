import { useEffect, useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { format, parseISO } from 'date-fns'
import { X, Loader2, Copy, Check, MessageCircle, QrCode, RefreshCw } from 'lucide-react'
import { useConvite } from '../../hooks/useConvite'

/* QR code em SVG (sem serviço externo — o código do convite não sai do navegador) */
function QrSvg({ texto }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(texto)
    qr.make()
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
  }, [texto])
  return <div className="w-56 h-56 mx-auto [&>svg]:w-full [&>svg]:h-full" role="img"
    aria-label="QR code do convite" dangerouslySetInnerHTML={{ __html: svg }} />
}

export default function ConviteFamiliaModal({ patient, onClose }) {
  const { gerarConvite } = useConvite()
  const [convite, setConvite] = useState(null)
  const [gerando, setGerando] = useState(true)
  const [erro,    setErro]    = useState('')
  const [copiado, setCopiado] = useState(false)

  const primeiroNome = (patient?.name ?? '').trim().split(' ')[0] || 'seu filho(a)'

  const gerar = async () => {
    setGerando(true); setErro(''); setCopiado(false)
    try { setConvite(await gerarConvite(patient.id)) }
    catch (err) { setErro(err.message) }
    finally { setGerando(false) }
  }

  useEffect(() => { gerar() }, [patient.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const textoWhats = convite
    ? `Olá! Este é o convite para acompanhar ${primeiroNome} no PedDiário. ` +
      `Abra o link, crie sua senha e pronto: ${convite.link}\n\n(O link vale por 7 dias e só pode ser usado uma vez.)`
    : ''

  const copiar = async () => {
    if (!convite) return
    try {
      await navigator.clipboard.writeText(convite.link)
    } catch {
      const el = document.getElementById('convite-link')
      el?.select(); document.execCommand?.('copy')
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <QrCode size={18} className="text-blue-600" /> Convidar a família de {primeiroNome}
          </h3>
          <button onClick={onClose} aria-label="Fechar"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {gerando ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-16">
              <Loader2 size={18} className="animate-spin" /> Gerando convite…
            </div>
          ) : erro ? (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{erro}</div>
              <button onClick={gerar} className="btn-secondary w-full"><RefreshCw size={15} /> Tentar de novo</button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 text-center">
                Mostre o QR code na consulta ou envie o link. A família cria a senha e já entra
                vinculada a {primeiroNome}.
              </p>

              <QrSvg texto={convite.link} />

              <div className="flex gap-2">
                <input id="convite-link" readOnly value={convite.link}
                  className="input text-xs font-mono" onFocus={e => e.target.select()} />
                <button onClick={copiar} aria-label="Copiar link"
                  className="shrink-0 inline-flex items-center justify-center w-11 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95">
                  {copiado ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>

              <a href={`https://wa.me/?text=${encodeURIComponent(textoWhats)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold bg-green-600 hover:bg-green-700 text-white active:scale-[0.99]">
                <MessageCircle size={16} /> Enviar pelo WhatsApp
              </a>

              <p className="text-xs text-slate-400 text-center">
                Vale até {format(parseISO(convite.expiraEm), "dd/MM 'às' HH:mm")} · uso único.
                Gerar um novo convite cancela este.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
