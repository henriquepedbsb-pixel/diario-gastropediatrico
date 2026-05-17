import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function calcAge(birthdate) {
  if (!birthdate) return '—'
  const birth = new Date(birthdate + 'T12:00:00')
  const today = new Date()
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
  if (months < 1)  return '< 1 mês'
  if (months < 24) return `${months} meses`
  return `${Math.floor(months / 12)} anos`
}

export async function exportPatientPDF(patient, data = {}) {
  const doc   = new jsPDF()
  const pageW = doc.internal.pageSize.getWidth()

  // ── Cabeçalho azul ──
  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageW, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Diário Gastropediátrico', 14, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Dr. Henrique Gomes — Gastroenterologista Pediátrico', 14, 20)
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 27)

  doc.setTextColor(0, 0, 0)

  // ── Dados do paciente ──
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Dados do Paciente', 14, 44)

  autoTable(doc, {
    startY: 48,
    body: [
      ['Nome',               patient.name        ?? '—'],
      ['Idade',              calcAge(patient.birthdate)],
      ['Data de nascimento', patient.birthdate ? format(new Date(patient.birthdate + 'T12:00'), 'dd/MM/yyyy') : '—'],
      ['Sexo',               patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : '—'],
      ['Tipo sanguíneo',     patient.blood_type  ?? '—'],
      ['Alergias',           Array.isArray(patient.allergies) ? patient.allergies.join(', ') : (patient.allergies ?? '—')],
      ['Observações',        patient.notes       ?? '—'],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52, fillColor: [248, 250, 252] } },
  })

  let y = doc.lastAutoTable.finalY + 10

  // ── Medicamentos ativos ──
  const activeMeds = (data.medications ?? []).filter(m => m.is_active)
  if (activeMeds.length > 0) {
    if (y > 230) { doc.addPage(); y = 16 }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Medicamentos em Uso', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Medicamento', 'Dose', 'Frequência', 'Início']],
      body: activeMeds.map(m => [
        m.name, m.dose, m.frequency,
        format(new Date(m.start_date + 'T12:00'), 'dd/MM/yyyy'),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // ── Fezes recentes ──
  if ((data.stools ?? []).length > 0) {
    if (y > 230) { doc.addPage(); y = 16 }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Últimos Registros de Fezes', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Data/Hora', 'Bristol', 'Cor', 'Sangue', 'Muco']],
      body: data.stools.slice(0, 15).map(s => [
        format(parseISO(s.recorded_at), 'dd/MM/yyyy HH:mm'),
        `Tipo ${s.bristol_type}`,
        s.color ?? '—',
        s.has_blood ? 'Sim' : 'Não',
        s.has_mucus ? 'Sim' : 'Não',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // ── Sintomas recentes ──
  if ((data.symptoms ?? []).length > 0) {
    if (y > 230) { doc.addPage(); y = 16 }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Últimos Sintomas', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Data/Hora', 'Sintomas', 'Severidade', 'Temperatura']],
      body: data.symptoms.slice(0, 10).map(s => [
        format(parseISO(s.recorded_at), 'dd/MM/yyyy HH:mm'),
        Array.isArray(s.symptoms) ? s.symptoms.join(', ') : '—',
        s.severity ?? '—',
        s.fever_temp ? `${s.fever_temp}°C` : '—',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  // ── Introdução alimentar ──
  if ((data.foods ?? []).length > 0) {
    if (y > 230) { doc.addPage(); y = 16 }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('Introdução Alimentar', 14, y + 6)
    autoTable(doc, {
      startY: y + 10,
      head: [['Alimento', 'Data', 'Reação', 'Observações']],
      body: data.foods.map(f => [
        f.food_name,
        format(new Date(f.introduced_at + 'T12:00'), 'dd/MM/yyyy'),
        f.reaction ?? '—',
        f.notes ?? '—',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    })
  }

  // ── Rodapé ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  doc.save(`Relatorio_${(patient.name ?? 'paciente').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`)
}
