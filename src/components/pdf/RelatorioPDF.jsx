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
  perValor:      { fontSize: 9.5, color: C.branco, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  perSep:        { fontSize: 7, color: C.azul200, textAlign: 'center', marginVertical: 2 },
  statsRow:      { flexDirection: 'row', marginBottom: 16 },
  statBox:       { flex: 1, marginRight: 8, backgroundColor: C.cinza50, borderWidth: 1, borderStyle: 'solid', borderColor: C.cinza200, borderRadius: 5, padding: 10, alignItems: 'center' },
  statNum:       { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.azul700, marginBottom: 2 },
  statLbl:       { fontSize: 6.5, color: C.cinza500, textAlign: 'center' },
  secSpacer:     { marginBottom: 14 },
  secHeader:     { backgroundColor: C.azul100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  secTitulo:     { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.azul700 },
  secCount:      { fontSize: 8, color: C.azul700, backgroundColor: C.branco, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tabela:        { borderWidth: 1, borderStyle: 'solid', borderColor: C.cinza200 },
  tblHead:       { flexDirection: 'row', backgroundColor: C.cinza100, borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: C.cinza200 },
  tblHCell:      { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.cinza600, paddingHorizontal: 8, paddingVertical: 6 },
  tblRow:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: C.cinza200 },
  tblRowPar:     { backgroundColor: C.cinza50 },
  tblCell:       { fontSize: 8.5, color: C.cinza800, paddingHorizontal: 8, paddingVertical: 6 },
  tblCellMut:    { fontSize: 8, color: C.cinza500, paddingHorizontal: 8, paddingVertical: 6 },
  badgeLeve:     { backgroundColor: C.verde100, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeLeveTxt:  { fontSize: 7, color: C.verde, fontFamily: 'Helvetica-Bold' },
  badgeMod:      { backgroundColor: C.laranja100, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeModTxt:   { fontSize: 7, color: C.laranja, fontFamily: 'Helvetica-Bold' },
  badgeGrave:    { backgroundColor: C.vermelho100, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeGraveTxt: { fontSize: 7, color: C.vermelho, fontFamily: 'Helvetica-Bold' },
  febreTag:      { backgroundColor: C.vermelho100, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, marginTop: 2, alignSelf: 'flex-start' },
  febreTagTxt:   { fontSize: 7, color: C.vermelho, fontFamily: 'Helvetica-Bold' },
  emptyRow:      { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderStyle: 'solid', borderColor: C.cinza200, backgroundColor: C.branco },
  emptyTxt:      { fontSize: 8.5, color: C.cinza500 },
  footer:        { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: C.cinza200, paddingHorizontal: 40, paddingVertical: 10, backgroundColor: C.branco },
  footerDisc:    { fontSize: 6.5, color: C.cinza500, textAlign: 'center', lineHeight: 1.5, marginBottom: 3 },
  footerInfo:    { fontSize: 7, color: C.cinza500, textAlign: 'center' },
  pageNum:       { position: 'absolute', bottom: 12, right: 40, fontSize: 7, color: C.cinza500 },
})

function BadgeSeveridade({ valor }) {
  const n = Number(valor)
  if (n === 3) return <View style={s.badgeGrave}><Text style={s.badgeGraveTxt}>Grave</Text></View>
  if (n === 2) return <View style={s.badgeMod}><Text style={s.badgeModTxt}>Moderada</Text></View>
  if (n === 1) return <View style={s.badgeLeve}><Text style={s.badgeLeveTxt}>Leve</Text></View>
  return <Text style={s.tblCellMut}>—</Text>
}

function EmptyTable() {
  return (
    <View style={s.emptyRow}>
      <Text style={s.emptyTxt}>Nenhum registro neste periodo.</Text>
    </View>
  )
}

function Secao({ titulo, contagem, children }) {
  return (
    <View style={s.secSpacer}>
      <View style={s.secHeader} wrap={false}>
        <Text style={s.secTitulo}>{titulo}</Text>
        <Text style={s.secCount}>{contagem} registro{contagem !== 1 ? 's' : ''}</Text>
      </View>
      {children}
    </View>
  )
}

function TabelaSintomas({ dados }) {
  if (!dados.length) return <EmptyTable />
  return (
    <View style={s.tabela}>
      <View style={s.tblHead}>
        <Text style={[s.tblHCell, { flex: 1.8 }]}>Data / Hora</Text>
        <Text style={[s.tblHCell, { flex: 3 }]}>Sintomas</Text>
        <Text style={[s.tblHCell, { flex: 1.5 }]}>Intensidade</Text>
        <Text style={[s.tblHCell, { flex: 1.2 }]}>Febre</Text>
        <Text style={[s.tblHCell, { flex: 3.5 }]}>Observacao</Text>
      </View>
      {dados.map((row, i) => {
        const febre = fmt.temp(row.fever_temp)
        return (
          <View key={row.id || i} style={[s.tblRow, i % 2 === 1 ? s.tblRowPar : null]}>
            <Text style={[s.tblCell, { flex: 1.8 }]}>{fmt.dataHora(row.recorded_at)}</Text>
            <Text style={[s.tblCell, { flex: 3, lineHeight: 1.4 }]}>{fmtSintomas(row.symptoms)}</Text>
            <View style={[s.tblCell, { flex: 1.5 }]}>
              <BadgeSeveridade valor={row.severity} />
            </View>
            <View style={[s.tblCell, { flex: 1.2 }]}>
              {febre
                ? <View style={s.febreTag}><Text style={s.febreTagTxt}>{febre}</Text></View>
                : <Text style={s.tblCellMut}>—</Text>
              }
            </View>
            {str(row.notes)
              ? <Text style={[s.tblCell,    { flex: 3.5 }]}>{str(row.notes)}</Text>
              : <Text style={[s.tblCellMut, { flex: 3.5 }]}>—</Text>
            }
          </View>
        )
      })}
    </View>
  )
}

function TabelaSono({ dados }) {
  if (!dados.length) return <EmptyTable />
  return (
    <View style={s.tabela}>
      <View style={s.tblHead}>
        <Text style={[s.tblHCell, { flex: 1.6 }]}>Data</Text>
        <Text style={[s.tblHCell, { flex: 1.4 }]}>Inicio</Text>
        <Text style={[s.tblHCell, { flex: 1.4 }]}>Fim</Text>
        <Text style={[s.tblHCell, { flex: 1.4 }]}>Duracao</Text>
        <Text style={[s.tblHCell, { flex: 1.4 }]}>Qualidade</Text>
        <Text style={[s.tblHCell, { flex: 3.8 }]}>Observacao</Text>
      </View>
      {dados.map((row, i) => (
        <View key={row.id || i} style={[s.tblRow, i % 2 === 1 ? s.tblRowPar : null]}>
          <Text style={[s.tblCell, { flex: 1.6 }]}>{fmt.data(row.sleep_start)}</Text>
          <Text style={[s.tblCell, { flex: 1.4 }]}>{fmt.hora(row.sleep_start)}</Text>
          <Text style={[s.tblCell, { flex: 1.4 }]}>{fmt.hora(row.sleep_end)}</Text>
          <Text style={[s.tblCell, { flex: 1.4 }]}>{fmt.duracao(row.duration_minutes)}</Text>
          <Text style={[s.tblCell, { flex: 1.4 }]}>{lbl(L.quality, row.quality)}</Text>
          {str(row.notes)
            ? <Text style={[s.tblCell,    { flex: 3.8 }]}>{str(row.notes)}</Text>
            : <Text style={[s.tblCellMut, { flex: 3.8 }]}>—</Text>
          }
        </View>
      ))}
    </View>
  )
}

function TabelaAmamentacao({ dados }) {
  if (!dados.length) return <EmptyTable />
  return (
    <View style={s.tabela}>
      <View style={s.tblHead}>
        <Text style={[s.tblHCell, { flex: 2 }]}>Data / Hora</Text>
        <Text style={[s.tblHCell, { flex: 1.5 }]}>Duracao</Text>
        <Text style={[s.tblHCell, { flex: 1.5 }]}>Lado</Text>
        <Text style={[s.tblHCell, { flex: 6 }]}>Observacao</Text>
      </View>
      {dados.map((row, i) => (
        <View key={row.id || i} style={[s.tblRow, i % 2 === 1 ? s.tblRowPar : null]}>
          <Text style={[s.tblCell, { flex: 2 }]}>{fmt.dataHora(row.started_at)}</Text>
          <Text style={[s.tblCell, { flex: 1.5 }]}>{fmt.duracao(row.duration_minutes)}</Text>
          <Text style={[s.tblCell, { flex: 1.5 }]}>{lbl(L.side, row.side)}</Text>
          {str(row.notes)
            ? <Text style={[s.tblCell,    { flex: 6 }]}>{str(row.notes)}</Text>
            : <Text style={[s.tblCellMut, { flex: 6 }]}>—</Text>
          }
        </View>
      ))}
    </View>
  )
}

function Rodape({ geradoEm }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerDisc}>
        Este relatorio e um instrumento de apoio a decisao clinica e nao substitui a avaliacao medica
        presencial. Dados registrados pela familia via PedDiario. Uso exclusivo do profissional de saude.
      </Text>
      <Text style={s.footerInfo}>
        PedDiario · Dr. Henrique Flavio G. Gomes (CRM-DF 14.611) · Gerado em {fmt.dataHora(geradoEm)}
      </Text>
    </View>
  )
}

export function RelatorioPDF({ dados }) {
  const { paciente, sintomas, sono, amamentacao, periodo, stats, geradoEm } = dados

  return (
    <Document
      title={`Relatorio Pre-Consulta - ${paciente.name || 'Paciente'}`}
      author="PedDiario"
      creator="PedDiario · PedSuite"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.hTitle}>Relatorio Pre-Consulta</Text>
            <Text style={s.hApp}>PedDiario · PedSuite</Text>
            <Text style={s.hDoc}>
              {'Dr. Henrique Flavio G. Gomes\n'}
              {'Pediatra e Gastropediatra · CRM-DF 14.611\n'}
              {'PedCare (Lago Sul) · PedStar (Noroeste)'}
            </Text>
          </View>
          <View style={s.hRight}>
            <Text style={s.hDataLabel}>Gerado em</Text>
            <Text style={s.hDataValor}>{fmt.data(geradoEm)}</Text>
            <Text style={s.hDataValor}>{fmt.hora(geradoEm)}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.pacCard}>
            <View style={s.pacLeft}>
              <Text style={s.pacNome}>{paciente.name || 'Paciente'}</Text>
              <Text style={s.pacLabel}>Idade</Text>
              <Text style={s.pacValor}>{fmt.idade(paciente.birthdate)}</Text>
              <Text style={s.pacLabel}>Nascimento</Text>
              <Text style={s.pacValor}>{fmt.data(paciente.birthdate)}</Text>
              {paciente.allergies?.length > 0 && (
                <>
                  <Text style={s.pacLabel}>Alergias</Text>
                  <Text style={s.pacValor}>
                    {Array.isArray(paciente.allergies)
                      ? paciente.allergies.join(', ')
                      : String(paciente.allergies)}
                  </Text>
                </>
              )}
            </View>
            <View style={s.pacRight}>
              <View style={s.periodoBox}>
                <Text style={s.perLabel}>Periodo analisado</Text>
                <Text style={s.perValor}>{fmt.data(periodo.inicio)}</Text>
                <Text style={s.perSep}>ate</Text>
                <Text style={s.perValor}>{fmt.data(periodo.fim)}</Text>
              </View>
            </View>
          </View>

          <View style={s.statsRow}>
            {[
              { num: stats.totalRegistros,  lbl: 'Registros no periodo' },
              { num: stats.diasComRegistro, lbl: 'Dias monitorados'      },
              { num: sintomas.length,       lbl: 'Entradas de sintomas'  },
              { num: sono.length,           lbl: 'Registros de sono'     },
            ].map((st, i) => (
              <View key={i} style={[s.statBox, i === 3 ? { marginRight: 0 } : null]}>
                <Text style={s.statNum}>{st.num}</Text>
                <Text style={s.statLbl}>{st.lbl}</Text>
              </View>
            ))}
          </View>

          <Secao titulo="Sintomas" contagem={sintomas.length}>
            <TabelaSintomas dados={sintomas} />
          </Secao>

          <Secao titulo="Diario do Sono" contagem={sono.length}>
            <TabelaSono dados={sono} />
          </Secao>

          <Secao titulo="Amamentacao / Alimentacao" contagem={amamentacao.length}>
            <TabelaAmamentacao dados={amamentacao} />
          </Secao>
        </View>

        <Text
          style={s.pageNum}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
        <Rodape geradoEm={geradoEm} />
      </Page>
    </Document>
  )
}
