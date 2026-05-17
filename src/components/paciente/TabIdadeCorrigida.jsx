import { useState } from 'react'
import { differenceInMonths, parseISO } from 'date-fns'

const MARCOS = [
  { idade: 1,  desc: 'Fixa o olhar no rosto, reage a sons' },
  { idade: 2,  desc: 'Sorri socialmente' },
  { idade: 3,  desc: 'Sustenta a cabeça, vocaliza' },
  { idade: 4,  desc: 'Ri em voz alta, segura objetos' },
  { idade: 6,  desc: 'Senta com apoio, transfere objetos' },
  { idade: 9,  desc: 'Fica em pé com apoio, faz "ba-ba"' },
  { idade: 12, desc: 'Primeiras palavras, fica em pé sem apoio' },
  { idade: 18, desc: 'Anda bem, vocabulário de 10–20 palavras' },
  { idade: 24, desc: 'Frases de 2 palavras, corre' },
]

export default function TabIdadeCorrigida({ patient }) {
  const [igSemanas, setIgSemanas] = useState('')

  const ig = parseInt(igSemanas)
  const igValida = !isNaN(ig) && ig >= 22 && ig <= 41
  const prematuro = igValida && ig < 37

  let idadeCronologica = null
  let idadeCorrigida = null
  let semanasPrematuridade = 0

  if (patient?.birthdate && igValida) {
    idadeCronologica = differenceInMonths(new Date(), parseISO(patient.birthdate))
    semanasPrematuridade = 40 - ig
    const mesesCorrecao = Math.round(semanasPrematuridade / 4.33)
    idadeCorrigida = Math.max(0, idadeCronologica - mesesCorrecao)
  } else if (patient?.birthdate) {
    idadeCronologica = differenceInMonths(new Date(), parseISO(patient.birthdate))
  }

  const proxMarco = idadeCorrigida !== null
    ? MARCOS.find(m => m.idade > idadeCorrigida)
    : null

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-slate-700">Calcular Idade Corrigida</h3>
        <div>
          <label className="label">Idade gestacional ao nascer (semanas)</label>
          <input
            type="number" min="22" max="41" className="input"
            placeholder="Ex: 32 (prematuro) ou 40 (a termo)"
            value={igSemanas}
            onChange={e => setIgSemanas(e.target.value)}
          />
          {igSemanas && !igValida && (
            <p className="text-xs text-red-500 mt-1">Informe entre 22 e 41 semanas</p>
          )}
        </div>

        {patient?.birthdate && igValida && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Idade Cronológica</p>
                <p className="text-lg font-bold text-slate-800">{idadeCronologica} meses</p>
              </div>
              {prematuro ? (
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-600 mb-1">Idade Corrigida</p>
                  <p className="text-lg font-bold text-blue-800">{idadeCorrigida} meses</p>
                </div>
              ) : (
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 mb-1">Status</p>
                  <p className="text-sm font-bold text-green-800">A termo</p>
                </div>
              )}
            </div>
            {prematuro && (
              <p className="text-xs text-slate-500 text-center">
                Prematuro de {semanasPrematuridade} semanas — use a idade corrigida para avaliar desenvolvimento
              </p>
            )}
            {proxMarco && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Próximo marco (aos {proxMarco.idade} meses)</p>
                <p className="text-sm text-blue-800">{proxMarco.desc}</p>
              </div>
            )}
          </div>
        )}

        {!patient?.birthdate && (
          <p className="text-sm text-slate-400 italic">Data de nascimento não registrada.</p>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-3 text-sm">Marcos de Desenvolvimento</h3>
        <div className="space-y-2">
          {MARCOS.map(m => {
            const atingido = idadeCorrigida !== null && idadeCorrigida >= m.idade
            return (
              <div key={m.idade} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${atingido ? 'bg-green-50' : 'bg-slate-50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  atingido ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {m.idade}
                </div>
                <p className="text-sm text-slate-700 flex-1">{m.desc}</p>
                {atingido && <span className="text-green-500 text-xs font-bold">✓</span>}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">Números = meses de idade corrigida (ou cronológica se a termo)</p>
      </div>
    </div>
  )
}
