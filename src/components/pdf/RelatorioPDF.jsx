import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const C = {
  azul700: '#0369A1', azul200: '#BAE6FD', azul100: '#E0F2FE', azul50: '#F0F9FF',
  cinza50: '#F8FAFC', cinza100: '#F1F5F9', cinza200: '#E2E8F0',
  cinza500: '#64748B', cinza600: '#475569', cinza800: '#1E293B', branco: '#FFFFFF',
  verde: '#059669', verde100: '#D1FAE5',
  laranja: '#D97706', laranja100: '#FEF3C7',
  vermelho: '#DC2626', vermelho100: '#FEE2E2',
}

const fmt = {
  data(iso) {
    if (!iso) return '—'
    try {
      if (iso.includes('T') || iso.includes(' ')) {
        const d = new Date(iso)
        if (isNaN(d.getTime())) return '—'
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
      }
      const [y, m, d] = iso.slice(0, 10).split('-')
      return `${d}/${m}/${y}`
    } catch { return '—' }
  },
  hora(iso) {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return '—'
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    } catch { return '—' }
  },
  dataHora(iso) {
    if (!iso) return '—'
    return `${fmt.data(iso)} ${fmt.hora(iso)}`
  },
  duracao(min) {
    const n = Number(min)
    if (!min || isNaN(n) || n <= 0) return '—'
    const h = Math.floor(n / 60); const m = n % 60
    if (h === 0) return `${m}min`
    return m > 0 ? `${h}h ${m}min` : `${h}h`
  },
  idade(birthdate) {
    if (!birthdate) return '—'
    try {
      const nasc = new Date(birthdate + 'T12:00:00')
      const hoje = new Date()
      const meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth())
      if (meses < 2) { const dias = Math.floor((hoje - nasc) / 86400000); return `${dias} dia${dias !== 1 ? 's' : ''}` }
      if (meses < 24) return `${meses} mes${meses !== 1 ? 'es' : ''}`
      const a = Math.floor(meses / 12); const mr = meses % 12
      return mr > 0 ? `${a}a ${mr}m` : `${a} ano${a !== 1 ? 's' : ''}`
    } catch { return '—' }
  },
  temp(val) {
    if (val == null || val === '') return null
    return `${Number(val).toFixed(1)} C`
  },
}

const L = {
  sintoma: {
    excessive_crying: 'Choro excessivo', regurgitation: 'Regurgitacao',
    vomiting: 'Vomito', feeding_refusal: 'Recusa alimentar',
    stool: 'Evacuacao', abdominal_distension: 'Distensao abd.',
    blood_stool: 'Sangue nas fezes', gas: 'Gases', fever: 'Febre',
    diarrhea: 'Diarreia', constipation: 'Constipacao',
    reflux: 'Refluxo', colic: 'Colica', crying: 'Choro', other: 'Outros',
    choro_excessivo: 'Choro excessivo', regurgitacao: 'Regurgitacao',
    vomito: 'Vomito', recusa_alimentar: 'Recusa alimentar',
    evacuacao: 'Evacuacao', distensao_abdominal: 'Distensao abd.',
    sangue_fezes: 'Sangue nas fezes', gases: 'Gases', outros: 'Outros',
  },
  side: {
    left: 'Esq.', right: 'Dir.', both: 'Ambos',
    esquerdo: 'Esq.', esquerda: 'Esq.', direito: 'Dir.', direita: 'Dir.', ambos: 'Ambos',
  },
  quality: {
    good: 'Boa', regular: 'Regular', bad: 'Ruim', poor: 'Ruim',
    bom: 'Boa', ruim: 'Ruim',
  },
}

function lbl(dict, key) {
  if (key == null || key === '') return '—'
  return dict[String(key).toLowerCase()] || String(key)
}

function str(v) { return (v != null && v !== '') ? String(v) : null }

function fmtSintomas(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '—'
  return arr.map(s => lbl(L.sintoma, s)).join(' · ')
}

const s = StyleSheet.create({
  page:          { fontFamily: 'Helvetica', fontSize: 9, color: C.cinza800, backgroundColor: C.branco, paddingBottom: 54 },
  header:        { backgroundColor: C.azul700, paddingHorizontal: 40, paddingTop: 22, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  hTitle:        { fontSize: 19, fontFamily: 'Helvetica-Bold', color: C.branco, marginBottom: 2 },
  hApp:          { fontSize: 8.5, color: C.azul200, marginBottom: 8 },
  hDoc:          { fontSize: 8, color: C.azul200, lineHeight: 1.5 },
  hRight:        { alignItems: 'flex-end' },
  hDataLabel:    { fontSize: 7, color: C.azul200, letterSpacing: 0.5, marginBottom: 3, textAlign: 'right' },
  hDataValor:    { fontSize: 8.5, color: C.branco, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  body:          { paddingHorizontal: 40, paddingTop: 18 },
  pacCard:       { backgroundColor: C.azul50, borderWidth: 1, borderStyle: 'solid', borderColor: C.azul200, borderRadius: 6, padding: 14, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between' },
  pacLeft:       { flex: 3 },
  pacRight:      { flex: 2, alignItems: 'flex-end' },
  pacNome:       { fontSize: 15, fontFamily: 'Helvetica-Bold', color: C.azul700, marginBottom: 6 },
  pacLabel:      { fontSize: 7, color: C.cinza500, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3, marginBottom: 1 },
  pacValor:      { fontSize: 9, color: C.cinza800, marginBottom: 5 },
  periodoBox:    { backgroundColor: C.azul700, borderRadius: 5, paddingHorizontal: 14, paddingVertical: 10 },
  perLabel:      { fontSize: 7, color: C.azul200, letterSpacing: 0.5, marginBottom: 2, textAlign: 'center' },
  perValor:      { fontSize: 9.5,
