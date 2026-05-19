# Convenções de Código e Padrões de UI

## Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componente | PascalCase, prefixo `Tab` para abas | `TabSintomas`, `TabFraldas` |
| Arquivo de aba | `Tab{Nome}.jsx` em `src/components/paciente/` | `TabFraldas.jsx` |
| Página | `{Nome}Page.jsx` em `src/pages/` | `DiarioPage.jsx` |
| Contexto | `{Nome}Context.jsx` | `AuthContext.jsx` |
| Lib/util | camelCase | `exportPDF.js`, `utils.js` |
| Variáveis | camelCase, descritivas | `saveErro`, `isSaving` |
| Constantes estáticas | UPPER_SNAKE_CASE | `TIPOS`, `CORES_FEZES`, `REFEICOES` |
| IDs de tab | kebab-case | `'sono'`, `'idadecorrigida'` |

---

## Padrão de Componente Tab

Todo componente de aba segue esta estrutura mínima:

```jsx
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { markPatientActivity } from '../../lib/utils'

export default function TabXxx({ patient }) {
  const { session } = useAuth()

  // Estado base
  const [entries,  setEntries]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveErro, setSaveErro] = useState('')

  // Formulário vazio (função para reset)
  const emptyForm = () => ({ campo1: '', campo2: '' })
  const [form, setForm] = useState(emptyForm())

  // Load
  const load = () => {
    supabase.from('tabela')
      .select('*')
      .eq('patient_id', patient.id)
      .order('campo_data', { ascending: false })
      .limit(80)
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }
  useEffect(load, [patient.id])

  // Save
  const save = async () => {
    setSaving(true); setSaveErro('')
    const { error } = await supabase.from('tabela').insert({
      patient_id: patient.id,
      ...form,
      created_by: session?.user?.id ?? null,
    })
    setSaving(false)
    if (error) { setSaveErro(error.message); return }
    setModal(false)
    setForm(emptyForm())
    load()
    markPatientActivity(patient.id, 'Label da atividade')
  }

  // Delete
  const del = async (id) => {
    await supabase.from('tabela').delete().eq('id', id)
    setEntries(e => e.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com contador e botão */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{entries.length} registro{entries.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setForm(emptyForm()); setSaveErro(''); setModal(true) }}
          className="btn-primary">
          <Plus size={15} /> Novo registro
        </button>
      </div>

      {/* Lista com skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          {/* Ícone + texto vazio */}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className="card p-4">
              {/* Conteúdo do item */}
              <button onClick={() => del(e.id)} className="text-slate-300 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <Modal title="Novo registro" onClose={() => setModal(false)}>
          {/* Formulário */}
          {saveErro && <p className="text-sm text-red-500">{saveErro}</p>}
          <button onClick={save} disabled={saving} className="btn-primary w-full py-3">
            {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : 'Salvar'}
          </button>
        </Modal>
      )}
    </div>
  )
}
```

---

## Classes CSS Globais (index.css)

```css
/* Botões */
.btn-primary   → bg-blue-600 text-white hover:bg-blue-700 (ação principal)
.btn-secondary → bg-white border border-slate-200 hover:bg-slate-50 (ação secundária)
.btn-danger    → bg-red-50 text-red-600 border-red-200 (ação destrutiva)
.btn           → base sem cor (usado para variantes customizadas)

/* Formulário */
.input         → w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500
.label         → block text-sm font-medium text-slate-700 mb-1

/* Layout */
.card          → bg-white rounded-xl border border-slate-200 shadow-sm
.section-header → text-xs font-semibold text-slate-500 uppercase tracking-wider
.page-title    → text-2xl font-bold text-slate-800
.page-header   → flex items-center justify-between mb-6
.badge         → inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
```

---

## Padrão de Modal

Definição inline em cada arquivo que usa (não é componente global):

```jsx
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
```
- `items-end` no mobile (drawer bottom sheet), `items-center` no sm+
- Scroll interno: `max-h-[90vh] overflow-y-auto`
- Z-index: `z-50`

---

## Padrão de Skeleton Loading

```jsx
{loading ? (
  <div className="space-y-3">
    {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-slate-100" />)}
  </div>
) : ...}
```

---

## Padrão de Estado Vazio

```jsx
<div className="card p-12 text-center text-slate-400">
  <IconeRelevante size={36} className="mx-auto mb-3 opacity-30" />
  <p className="font-medium">Nenhum registro encontrado</p>
  <p className="text-xs mt-1">Toque em "Novo registro" para começar</p>
</div>
```

---

## Padrão de Upload de Arquivo

```jsx
const fileRef = useRef(null)

// Input oculto
<input ref={fileRef} type="file" accept="image/*" capture="environment"
  className="hidden" onChange={handleFile} />

// Botão que abre o seletor
<button onClick={() => fileRef.current?.click()} ...>
  <Camera size={24} /> Tirar foto ou escolher da galeria
</button>

// Handler
const handleFile = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  setForm(f => ({ ...f, file }))
  setPreview(URL.createObjectURL(file))
}

// Upload no save
const ext  = form.file.name.split('.').pop().toLowerCase()
const path = `pasta/${patient.id}/${Date.now()}.${ext}`
const { data: upData, error: upErr } = await supabase.storage
  .from('patient-documents')
  .upload(path, form.file, { contentType: form.file.type })
if (upErr) { setSaveErro(...); return }
const { data: urlData } = supabase.storage.from('patient-documents').getPublicUrl(upData.path)
const photo_url = urlData.publicUrl
```

---

## Padrão de Sub-abas Internas

Usado quando um item da sidebar agrupa múltiplas seções:

```jsx
const SUBTABS = [
  { id: 'aba1', label: '📋 Nome 1' },
  { id: 'aba2', label: '📊 Nome 2' },
]
const [sub, setSub] = useState('aba1')

// Switcher
<div className="bg-slate-100 p-1 rounded-xl flex gap-1">
  {SUBTABS.map(t => (
    <button key={t.id} onClick={() => setSub(t.id)}
      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
        ${sub === t.id
          ? 'bg-white shadow-sm text-slate-800'
          : 'text-slate-500 hover:text-slate-700'}`}>
      {t.label}
    </button>
  ))}
</div>

{sub === 'aba1' && <ComponenteUm patient={patient} />}
{sub === 'aba2' && <ComponenteDois patient={patient} />}
```

---

## Padrão de Datas

```js
// Sempre usar date-fns com locale ptBR
import { format, parseISO, formatDistanceToNow,
         differenceInMonths, differenceInYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Exibição
format(parseISO(entry.created_at), 'dd/MM/yyyy HH:mm')
format(parseISO(entry.created_at), "EEEE, dd 'de' MMMM", { locale: ptBR })
formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })

// Input datetime-local
format(new Date(), "yyyy-MM-dd'T'HH:mm")

// Envio ao banco
new Date(form.recorded_at).toISOString()

// Cálculo de idade
const months = differenceInMonths(new Date(), parseISO(birthdate))
const years  = differenceInYears(new Date(), parseISO(birthdate))
```

---

## Padrão de Consulta Supabase

```js
// Carregar lista
supabase.from('tabela')
  .select('*')
  .eq('patient_id', patient.id)
  .order('created_at', { ascending: false })
  .limit(80)
  .then(({ data }) => { setEntries(data ?? []); setLoading(false) })

// Inserir
const { error } = await supabase.from('tabela').insert({ ... })

// Atualizar
await supabase.from('tabela').update({ campo: valor }).eq('id', id)

// Deletar
await supabase.from('tabela').delete().eq('id', id)

// Count
supabase.from('tabela').select('id', { count: 'exact', head: true }).eq('is_active', true)

// Carregar múltiplos em paralelo
const [{ data: a }, { data: b }] = await Promise.all([
  supabase.from('tabela_a').select('*').eq('patient_id', id),
  supabase.from('tabela_b').select('*').eq('patient_id', id),
])
```

---

## Padrão de Formulário com setForm

Preferência: `useState` com função de atualização parcial:
```js
setForm(f => ({ ...f, campo: valor }))
```
Não usar `react-hook-form` nos componentes de aba — usar `useState` puro.

---

## Ícones

Sempre importar de `lucide-react`. Tamanhos padrão:
- Botões e itens de lista: `size={15}` ou `size={16}`
- Sidebar: `size={17}`
- Cards de destaque: `size={20}`
- Ícones de estado vazio: `size={36}` com `className="mx-auto mb-3 opacity-30"`
- Ícones grandes decorativos: `size={48}`

---

## Cores Semânticas

| Contexto | Cor Tailwind |
|----------|-------------|
| Ação principal | `blue-600` |
| Sucesso / confirmação | `green-600` |
| Aviso / atividade nova | `orange-400` / `amber-500` |
| Erro / perigo | `red-500` / `red-600` |
| Neutro / secundário | `slate-*` |
| Médico / clínico | `teal-600` |
| Localização / clínica | `green-600` |

---

## Responsividade

- Mobile-first com breakpoints `sm:` e `lg:`
- Grid tipicamente: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Sidebar: drawer no mobile, fixa no `lg:` (≥1024px)
- Modal: bottom sheet no mobile (`items-end`), centralizado no `sm:` (`items-center`)
- Formulários: `max-w-md` ou `max-w-lg` centralizados

---

## Acessibilidade e Mobile

- `capture="environment"` em inputs de foto (abre câmera traseira no celular)
- `-webkit-tap-highlight-color: transparent` no html (index.css)
- `active:scale-95` nos botões interativos
- `truncate` em textos que podem ultrapassar o container
- `shrink-0` em ícones dentro de flex containers

---

## Build e Deploy

```bash
npm run dev      # desenvolvimento local (localhost:5173)
npm run build    # build de produção (dist/)
git push origin main  # dispara deploy automático na Vercel
```

Vite gera dois bundles: moderno (ES modules) + legado (transpilado para iOS 13+/Safari 13+) via `@vitejs/plugin-legacy`.

O `index.html` inclui `ErrorBoundary` no `main.jsx` — erros React mostram mensagem amigável em vez de tela branca.
