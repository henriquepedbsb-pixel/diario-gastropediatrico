import { differenceInCalendarDays, parseISO } from 'date-fns'
import { OMS_LMS, IG_PNG } from './curvasReferencia'

/* ─────────────────────────────────────────────────────────────
   Curvas de crescimento — regras clínicas
   • Prematuro (IG < 37 sem): INTERGROWTH-21st pós-natal enquanto a
     idade pós-menstrual (IPM) estiver entre 27 e 64 semanas.
   • Depois de 64 sem de IPM: OMS 2006 pela IDADE CORRIGIDA até
     24 meses de idade corrigida; a partir daí, idade cronológica.
   • A termo ou IG não informada: OMS 2006 pela idade cronológica.
   • OMS no app: 0–60 meses (padrão OMS 2006).
   Apoio à decisão: a interpretação é sempre do médico.
───────────────────────────────────────────────────────────── */

export const IG_TERMO_DIAS        = 280           // 40 semanas
export const PREMATURO_ABAIXO_DE  = 37 * 7        // < 37 semanas
export const IG_IPM_MIN           = 27
export const IG_IPM_MAX           = 64
export const CORRIGIR_ATE_MESES   = 24
export const OMS_MAX_MESES        = 60
export const DIAS_POR_MES         = 30.4375

export const MEDIDAS = {
  peso:        { campo: 'weight_kg',             rotulo: 'Peso',                unidade: 'kg', casas: 2 },
  comprimento: { campo: 'height_cm',             rotulo: 'Comprimento/Estatura', unidade: 'cm', casas: 1 },
  pc:          { campo: 'head_circumference_cm', rotulo: 'Perímetro cefálico',  unidade: 'cm', casas: 1 },
}

/* ── Idade gestacional do paciente em dias (ou null) ── */
export function igDias(patient) {
  const s = Number(patient?.gestational_age_weeks)
  if (!Number.isFinite(s) || s < 22 || s > 44) return null
  const d = Number(patient?.gestational_age_days)
  return s * 7 + (Number.isFinite(d) && d >= 0 && d <= 6 ? d : 0)
}

export const ehPrematuro = (patient) => {
  const ig = igDias(patient)
  return ig != null && ig < PREMATURO_ABAIXO_DE
}

export const sexoRef = (patient) => (patient?.gender === 'F' ? 'F' : patient?.gender === 'M' ? 'M' : null)

export function formatarIG(patient) {
  const ig = igDias(patient)
  if (ig == null) return null
  return `${Math.floor(ig / 7)}+${ig % 7} sem`
}

/* ── Onde cada medida entra em cada curva ── */
export function diasDeVida(patient, dataISO) {
  if (!patient?.birthdate || !dataISO) return null
  return differenceInCalendarDays(parseISO(dataISO.slice(0, 10)), parseISO(patient.birthdate))
}

/** IPM (semanas, fracionado) se a medida cabe na INTERGROWTH; senão null */
export function posicaoIG(patient, dataISO) {
  if (!ehPrematuro(patient)) return null
  const vida = diasDeVida(patient, dataISO)
  if (vida == null || vida < 0) return null
  const ipm = (igDias(patient) + vida) / 7
  return ipm >= IG_IPM_MIN && ipm <= IG_IPM_MAX ? ipm : null
}

/** { meses, corrigida } se a medida cabe na OMS (0–60 m); senão null */
export function posicaoOMS(patient, dataISO) {
  const vida = diasDeVida(patient, dataISO)
  if (vida == null || vida < 0) return null
  let dias = vida
  let corrigida = false
  if (ehPrematuro(patient)) {
    const corr = vida - (IG_TERMO_DIAS - igDias(patient))
    if (corr < 0) return null                                   // ainda antes do termo
    if (corr / DIAS_POR_MES < CORRIGIR_ATE_MESES) { dias = corr; corrigida = true }
  }
  const meses = dias / DIAS_POR_MES
  return meses <= OMS_MAX_MESES ? { meses, corrigida } : null
}

/** Curva sugerida para a medida mais recente */
export function curvaSugerida(patient, medidas) {
  if (!ehPrematuro(patient)) return 'oms'
  const ultima = [...(medidas ?? [])].sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1))[0]
  if (!ultima) return 'ig'
  return posicaoIG(patient, ultima.recorded_at) != null ? 'ig' : 'oms'
}

/* ── OMS: LMS ── */
function lmsNoMes(sexo, medida, meses) {
  const t = OMS_LMS[sexo]?.[medida]
  if (!t || meses < 0 || meses > OMS_MAX_MESES) return null
  const i = Math.min(Math.floor(meses), OMS_MAX_MESES - 1)
  const f = meses - i
  const [, L1, M1, S1] = t[i]
  const [, L2, M2, S2] = t[i + 1]
  return [L1 + (L2 - L1) * f, M1 + (M2 - M1) * f, S1 + (S2 - S1) * f]
}

const valorLMS = (L, M, S, z) => (Math.abs(L) < 1e-9 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L))

export const Z_CENTIS_OMS = { P3: -1.880794, P15: -1.036433, P50: 0, P85: 1.036433, P97: 1.880794 }

export function centisOMS(sexo, medida, meses) {
  const lms = lmsNoMes(sexo, medida, meses)
  if (!lms) return null
  const out = {}
  for (const [k, z] of Object.entries(Z_CENTIS_OMS)) out[k] = valorLMS(...lms, z)
  return out
}

/** Escore-z OMS (com o ajuste da OMS para |z| > 3 em medidas assimétricas) */
export function zOMS(sexo, medida, meses, valor) {
  const lms = lmsNoMes(sexo, medida, meses)
  if (!lms || !(valor > 0)) return null
  const [L, M, S] = lms
  let z = Math.abs(L) < 1e-9 ? Math.log(valor / M) / S : (Math.pow(valor / M, L) - 1) / (L * S)
  if (Math.abs(L - 1) > 1e-9) {
    if (z > 3) {
      const sd3 = valorLMS(L, M, S, 3), sd2 = valorLMS(L, M, S, 2)
      z = 3 + (valor - sd3) / (sd3 - sd2)
    } else if (z < -3) {
      const sd3 = valorLMS(L, M, S, -3), sd2 = valorLMS(L, M, S, -2)
      z = -3 + (valor - sd3) / (sd2 - sd3)
    }
  }
  return z
}

/* ── INTERGROWTH-21st pós-natal ── */
function linhaIG(tabela, ipm) {
  if (!tabela || ipm < IG_IPM_MIN || ipm > IG_IPM_MAX) return null
  const i = Math.min(Math.floor(ipm) - IG_IPM_MIN, tabela.length - 2)
  const f = ipm - (IG_IPM_MIN + i)
  return tabela[i].slice(1).map((v, k) => v + (tabela[i + 1][k + 1] - v) * f)
}

export const ROTULOS_CENTIS_IG = ['P3', 'P5', 'P10', 'P50', 'P90', 'P95', 'P97']

export function centisIG(sexo, medida, ipm) {
  const l = linhaIG(IG_PNG[sexo]?.[medida]?.centis, ipm)
  if (!l) return null
  return Object.fromEntries(ROTULOS_CENTIS_IG.map((k, i) => [k, l[i]]))
}

/** Escore-z INTERGROWTH aproximado (interpolação entre as linhas de -3 a +3 DP) */
export function zIG(sexo, medida, ipm, valor) {
  const l = linhaIG(IG_PNG[sexo]?.[medida]?.z, ipm)
  if (!l || !(valor > 0)) return null
  const zs = [-3, -2, -1, 0, 1, 2, 3]
  let i = l.findIndex(v => valor < v)
  if (i === -1) i = l.length - 1          // acima de +3: extrapola último intervalo
  if (i === 0) i = 1                      // abaixo de -3: extrapola primeiro intervalo
  const [a, b] = [l[i - 1], l[i]]
  return zs[i - 1] + (valor - a) / (b - a)
}

/* ── z → percentil (para o médico) ── */
export function percentilDeZ(z) {
  if (z == null || !Number.isFinite(z)) return null
  // Φ(z) por aproximação de Abramowitz-Stegun (erro < 1e-7)
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return (z > 0 ? 1 - p : p) * 100
}

export function formatarIdadeMeses(meses) {
  if (meses == null) return '—'
  // tolerância de ~1 dia: 365 dias = 12 m (e não 11,99 → 11 m)
  const mm = meses + 0.04
  if (meses < 1) return `${Math.round(meses * DIAS_POR_MES)} d`
  if (mm < 24) return `${Math.floor(mm)} m`
  const a = Math.floor(mm / 12), m = Math.floor(mm % 12)
  return m ? `${a} a ${m} m` : `${a} a`
}
