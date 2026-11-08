import { useEffect, useState, createElement } from 'react'
import { supabase } from './supabase'

/* ─────────────────────────────────────────────────────────────
   Arquivos em buckets PRIVADOS — acesso por URL assinada (temporária).

   O banco pode guardar dois formatos (compatibilidade):
     • caminho puro:  "fraldas/<patient>/123.jpg"           (novo)
     • URL pública antiga: "https://…/object/public/<bucket>/<caminho>"
   caminhoNoBucket() converte qualquer um dos dois para o caminho.
───────────────────────────────────────────────────────────── */

const VALIDADE_S = 3600                    // 1 hora
const MARGEM_MS  = 5 * 60 * 1000           // renova 5 min antes de vencer
const cache      = new Map()               // "bucket|caminho" → { url, expira }

export function caminhoNoBucket(bucket, valor) {
  if (!valor || typeof valor !== 'string') return null
  if (!/^https?:\/\//i.test(valor)) return valor.replace(/^\/+/, '')
  const esc = bucket.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = valor.match(new RegExp(`/storage/v1/object/(?:public|sign|authenticated)/${esc}/([^?#]+)`))
  if (!m) return null
  try { return decodeURIComponent(m[1]) } catch { return m[1] }
}

function doCache(bucket, caminho) {
  const item = cache.get(`${bucket}|${caminho}`)
  return item && item.expira - MARGEM_MS > Date.now() ? item.url : null
}

/* Assina vários arquivos de uma vez. Retorna { valorOriginal: urlAssinada } */
export async function urlsAssinadas(bucket, valores) {
  const resultado = {}
  const faltando  = new Map()   // caminho → [valores originais]

  for (const valor of new Set((valores ?? []).filter(Boolean))) {
    const caminho = caminhoNoBucket(bucket, valor)
    if (!caminho) continue
    const emCache = doCache(bucket, caminho)
    if (emCache) { resultado[valor] = emCache; continue }
    if (!faltando.has(caminho)) faltando.set(caminho, [])
    faltando.get(caminho).push(valor)
  }

  if (faltando.size) {
    const { data } = await supabase.storage
      .from(bucket)
      .createSignedUrls([...faltando.keys()], VALIDADE_S)
    const expira = Date.now() + VALIDADE_S * 1000
    for (const item of data ?? []) {
      if (!item?.signedUrl || !item.path) continue
      cache.set(`${bucket}|${item.path}`, { url: item.signedUrl, expira })
      for (const valor of faltando.get(item.path) ?? []) resultado[valor] = item.signedUrl
    }
  }
  return resultado
}

export async function urlAssinada(bucket, valor) {
  const mapa = await urlsAssinadas(bucket, [valor])
  return mapa[valor] ?? null
}

/* Hook: assina uma lista de arquivos e devolve { valor: url } */
export function useUrlsAssinadas(bucket, valores) {
  const [mapa, setMapa] = useState({})
  const chave = (valores ?? []).filter(Boolean).join('|')

  useEffect(() => {
    let ativo = true
    if (!chave) { setMapa({}); return }
    urlsAssinadas(bucket, chave.split('|'))
      .then(m => { if (ativo) setMapa(m) })
      .catch(() => { if (ativo) setMapa({}) })
    return () => { ativo = false }
  }, [bucket, chave])

  return mapa
}

/* Junta pedidos feitos no mesmo instante (ex.: 30 fotos de uma lista)
   numa única chamada ao Supabase por bucket. */
const filas = new Map()   // bucket → { valores: Set, esperando: [] }
function urlEmLote(bucket, valor) {
  return new Promise((resolve) => {
    let fila = filas.get(bucket)
    if (!fila) {
      fila = { valores: new Set(), esperando: [] }
      filas.set(bucket, fila)
      setTimeout(async () => {
        filas.delete(bucket)
        let mapa = {}
        try { mapa = await urlsAssinadas(bucket, [...fila.valores]) } catch { /* sem URL */ }
        fila.esperando.forEach(([v, r]) => r(mapa[v] ?? null))
      }, 0)
    }
    fila.valores.add(valor)
    fila.esperando.push([valor, resolve])
  })
}

/* <img> de arquivo privado. Enquanto assina, mostra um bloco cinza. */
export function ImagemPrivada({ bucket, valor, className = '', alt = '', ...props }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let ativo = true
    setUrl(null)
    if (valor) urlEmLote(bucket, valor).then(u => { if (ativo) setUrl(u) })
    return () => { ativo = false }
  }, [bucket, valor])
  if (!url) return createElement('div', { className: `${className} bg-slate-100 animate-pulse`, 'aria-hidden': true })
  return createElement('img', { src: url, alt, className, ...props })
}

/* Abre arquivo privado em nova aba. A aba é aberta já no clique
   (antes da espera), senão o Safari do iPhone bloqueia como pop-up. */
export async function abrirArquivoPrivado(bucket, valor) {
  const aba = window.open('', '_blank')
  try {
    const url = await urlAssinada(bucket, valor)
    if (!url) throw new Error('Arquivo não encontrado.')
    if (aba) aba.location.href = url
    else window.location.href = url
  } catch (err) {
    if (aba) aba.close()
    throw err
  }
}
