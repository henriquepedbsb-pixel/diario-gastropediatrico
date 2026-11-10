/* Lembrete diário pelo calendário do próprio celular.
   Não depende de servidor nem de permissão de notificação: cria um evento que
   se repete todo dia, com alarme, apontando para o PedDiário. */

const dois = (n) => String(n).padStart(2, '0')

const partes = (hora) => {
  const [h, m] = String(hora || '20:00').split(':').map(Number)
  return { h: Number.isFinite(h) ? h : 20, m: Number.isFinite(m) ? m : 0 }
}

/* AAAAMMDDTHHMMSS no horário local, a partir de hoje */
const carimbos = (hora, duracaoMin = 10) => {
  const { h, m } = partes(hora)
  const ini = new Date(); ini.setHours(h, m, 0, 0)
  const fim = new Date(ini.getTime() + duracaoMin * 60000)
  const f = (d) => `${d.getFullYear()}${dois(d.getMonth() + 1)}${dois(d.getDate())}T${dois(d.getHours())}${dois(d.getMinutes())}00`
  return { ini: f(ini), fim: f(fim) }
}

const textos = (nomeCrianca) => {
  const url = `${window.location.origin}/diario`
  return {
    titulo: nomeCrianca ? `PedDiário: registrar o dia de ${nomeCrianca}` : 'PedDiário: registrar o dia',
    descricao: `Um minuto para anotar alimentação, intestino, sintomas e sono.\n${url}`,
    url,
  }
}

export const linkGoogleAgenda = ({ hora, nomeCrianca }) => {
  const { ini, fim } = carimbos(hora)
  const { titulo, descricao } = textos(nomeCrianca)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    details: descricao,
    dates: `${ini}/${fim}`,
    recur: 'RRULE:FREQ=DAILY',
  })
  try {
    const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (fuso) p.set('ctz', fuso)
  } catch { /* sem fuso: o Google usa o da conta */ }
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

const escaparICS = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

export const arquivoICS = ({ hora, nomeCrianca }) => {
  const { ini, fim } = carimbos(hora)
  const { titulo, descricao, url } = textos(nomeCrianca)
  const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PedDiario//Lembrete diario//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:lembrete-diario-${Date.now()}@peddiario`,
    `DTSTAMP:${agora}`,
    `DTSTART:${ini}`,
    `DTEND:${fim}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escaparICS(titulo)}`,
    `DESCRIPTION:${escaparICS(descricao)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escaparICS(titulo)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export const baixarICS = (dados) => {
  const blob = new Blob([arquivoICS(dados)], { type: 'text/calendar;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = 'lembrete-peddiario.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 4000)
}
