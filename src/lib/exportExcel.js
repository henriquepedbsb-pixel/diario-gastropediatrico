import * as XLSX from 'xlsx'
import { format, parseISO } from 'date-fns'

export function exportPatientExcel(patient, data = {}) {
  const wb = XLSX.utils.book_new()

  // ── Paciente ──
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valor'],
    ['Nome',               patient.name        ?? ''],
    ['Data de Nascimento', patient.birthdate    ?? ''],
    ['Sexo',               patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : ''],
    ['Tipo Sanguíneo',     patient.blood_type   ?? ''],
    ['Alergias',           Array.isArray(patient.allergies) ? patient.allergies.join(', ') : (patient.allergies ?? '')],
    ['Observações',        patient.notes        ?? ''],
  ]), 'Paciente')

  // ── Fezes ──
  if ((data.stools ?? []).length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Data/Hora', 'Tipo Bristol', 'Cor', 'Sangue', 'Muco', 'Observações'],
      ...data.stools.map(s => [
        format(parseISO(s.recorded_at), 'dd/MM/yyyy HH:mm'),
        s.bristol_type, s.color ?? '',
        s.has_blood ? 'Sim' : 'Não',
        s.has_mucus ? 'Sim' : 'Não',
        s.notes ?? '',
      ]),
    ]), 'Fezes')
  }

  // ── Refeições ──
  if ((data.meals ?? []).length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Data/Hora', 'Tipo', 'Descrição', 'Observações'],
      ...data.meals.map(m => [
        format(parseISO(m.eaten_at), 'dd/MM/yyyy HH:mm'),
        m.meal_type ?? '', m.description ?? '', m.notes ?? '',
      ]),
    ]), 'Refeições')
  }

  // ── Sintomas ──
  if ((data.symptoms ?? []).length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Data/Hora', 'Sintomas', 'Severidade', 'Temperatura', 'Observações'],
      ...data.symptoms.map(s => [
        format(parseISO(s.recorded_at), 'dd/MM/yyyy HH:mm'),
        Array.isArray(s.symptoms) ? s.symptoms.join(', ') : '',
        s.severity ?? '',
        s.fever_temp ?? '',
        s.notes ?? '',
      ]),
    ]), 'Sintomas')
  }

  // ── Sono ──
  if ((data.sleep ?? []).length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Início', 'Fim', 'Duração (min)', 'Qualidade', 'Observações'],
      ...data.sleep.map(s => [
        s.sleep_start ? format(parseISO(s.sleep_start), 'dd/MM/yyyy HH:mm') : '',
        s.sleep_end   ? format(parseISO(s.sleep_end),   'dd/MM/yyyy HH:mm') : '',
        s.duration_minutes ?? '',
        s.quality ?? '',
        s.notes   ?? '',
      ]),
    ]), 'Sono')
  }

  // ── Medicamentos ──
  if ((data.medications ?? []).length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Medicamento', 'Dose', 'Frequência', 'Início', 'Término', 'Ativo', 'Observações'],
      ...data.medications.map(m => [
        m.name, m.dose, m.frequency,
        m.start_date ?? '', m.end_date ?? '',
        m.is_active ? 'Sim' : 'Não',
        m.notes ?? '',
      ]),
    ]), 'Medicamentos')
  }

  // ── Introdução Alimentar ──
  if ((data.foods ?? []).length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Alimento', 'Data', 'Reação', 'Observações'],
      ...data.foods.map(f => [
        f.food_name,
        f.introduced_at ?? '',
        f.reaction ?? '',
        f.notes ?? '',
      ]),
    ]), 'Introdução Alimentar')
  }

  // ── Choro/Cólica ──
  if ((data.crying ?? []).length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Data/Hora', 'Duração (min)', 'Intensidade', 'Gatilho', 'Observações'],
      ...data.crying.map(c => [
        format(parseISO(c.recorded_at), 'dd/MM/yyyy HH:mm'),
        c.duration_min ?? '',
        c.intensity ?? '',
        c.possible_trigger ?? '',
        c.notes ?? '',
      ]),
    ]), 'Choro')
  }

  XLSX.writeFile(wb, `${(patient.name ?? 'paciente').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`)
}
