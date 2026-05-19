---
name: project-context
description: >
  Contexto completo do projeto diario-gastropediatrico. Use esta skill SEMPRE que
  trabalhar neste projeto — ao criar componentes, abas, rotas, tabelas, ou qualquer
  código novo. Contém arquitetura, stack, padrões de código, convenções e todos os
  detalhes do banco de dados. Se o usuário pedir para adicionar uma aba, um campo,
  uma nova página, corrigir um bug ou fazer qualquer mudança no projeto, consulte
  esta skill primeiro para garantir que o novo código siga exatamente os padrões
  estabelecidos.
---

# Diário Gastropediátrico — Contexto do Projeto

**Cliente:** Dr. Henrique Gomes — Gastroenterologista Pediátrico, Brasília  
**Produto:** PWA médica para acompanhamento clínico de pacientes gastropediátricos  
**Repositório:** `C:\Users\henri\diario-gastropediatrico`  
**Deploy:** Vercel → `https://diario-gastropediatrico.vercel.app`  
**Dev:** `npm run dev` → `localhost:5173`

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 + Vite 5 |
| Roteamento | React Router v6 |
| Estilo | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Backend/DB | Supabase (PostgreSQL + RLS + Storage + Realtime) |
| Ícones | lucide-react |
| Datas | date-fns v4 + locale `ptBR` |
| Gráficos | Recharts |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | xlsx |
| Formulários | react-hook-form (raramente usado — maioria usa useState) |
| Compatibilidade | `@vitejs/plugin-legacy` → iOS 13+ / Safari 13+ |

**Variáveis de ambiente** (`.env`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Arquitetura

```
src/
├── main.jsx              — Entry point + ErrorBoundary global
├── App.jsx               — Rotas + guards de autenticação
├── index.css             — Classes utilitárias globais (card, btn-primary, input, label…)
├── contexts/
│   └── AuthContext.jsx   — Auth global (session, profile, paciente, signIn/Out/Up)
├── lib/
│   ├── supabase.js       — Cliente Supabase singleton
│   ├── utils.js          — markPatientActivity, isDoctor, isPai, normalizeRole
│   ├── whoData.js        — Dados OMS para gráficos de crescimento
│   ├── exportPDF.js      — Geração de PDF do paciente (jsPDF)
│   └── exportExcel.js    — Export Excel do paciente
├── pages/
│   ├── auth/             — Login, Registro, EsqueciSenha, RedefinirSenha
│   ├── HomePage.jsx      — Painel do médico (lista de pacientes + KPIs)
│   ├── PacienteDetailPage.jsx — Página do paciente (visão do MÉDICO)
│   ├── DiarioPage.jsx    — Diário do filho (visão do RESPONSÁVEL)
│   ├── DicasPage.jsx     — Gestão de dicas pelo médico
│   ├── CurriculoPage.jsx — Currículo público do médico
│   ├── ClinicasPage.jsx  — Clínicas de atendimento
│   └── DepoimentosPage.jsx — Depoimentos de pacientes
└── components/
    ├── layout/
    │   ├── Layout.jsx    — Shell: sidebar + main content
    │   └── Sidebar.jsx   — Navegação lateral (médico e responsável)
    ├── ui/
    │   └── LoadingScreen.jsx
    └── paciente/         — Todos os componentes de aba
        └── Tab*.jsx
```

---

## Sistema de Dois Papéis

O app tem **dois tipos de usuário** com experiências completamente separadas:

### Médico (`role: 'doctor'`)
- Rota base: `/dashboard`
- Vê **todos os pacientes**
- Acessa `PacienteDetailPage` → `/dashboard/pacientes/:id?tab=X`
- Pode cadastrar pacientes, publicar dicas, exportar PDF/Excel
- Recebe notificações de nova atividade (badge laranja + Supabase Realtime)
- Código de convite para cadastro: `GASTRO2024`

### Responsável (`role: 'parent'`)
- Rota base: `/diario`
- Vê **apenas o próprio filho** (vinculado por `parent_id` ou `parent_email`)
- Acessa `DiarioPage` → `/diario?tab=X`
- Pode registrar refeições, sintomas, sono, fraldas etc.
- Pode solicitar cadastro do filho via `patient_requests`

**Verificação de role** — sempre use os helpers de `src/lib/utils.js`:
```js
import { isDoctor, isPai } from '../lib/utils'
isDoctor(profile?.role)  // aceita 'doctor' e 'medico'
isPai(profile?.role)     // aceita 'parent', 'pai', 'mae', etc.
```

---

## Navegação por Abas

Ambas as páginas principais usam `?tab=` na URL para controlar qual aba está ativa:

```js
// leitura
const [searchParams] = useSearchParams()
const tab = searchParams.get('tab') || 'resumo'   // default: 'resumo'

// navegação
navigate(`/diario?tab=${tabId}`)
navigate(`/dashboard/pacientes/${id}?tab=${tabId}`)
```

A Sidebar lê `activeTab` da URL e destaca o item correto. Aba padrão ao abrir um paciente ou o diário é **`resumo`**.

### Sub-abas (padrão interno com useState)
Quando um ítem da sidebar agrupa múltiplas seções (ex: Calculadoras, Intestinal), usa-se `useState` local:
```jsx
const SUBTABS = [
  { id: 'habito',   label: '📋 Hábito'   },
  { id: 'evolucao', label: '📊 Evolução' },
  { id: 'fraldas',  label: '👶 Fraldas'  },
]
const [sub, setSub] = useState('habito')
// Renderiza switcher + componente correspondente
```

---

## Abas Disponíveis

Detalhes completos de cada aba e seus componentes estão em `references/components.md`.

**Médico (PacienteDetailPage):**
- `cadastro` `diario` `amamentacao` `introducao` `sintomas` `fezes` `sono` `choro` `medicamentos` `vacinas` `receitas` `alertas` `documentos` `graficos` `calculadora` `timeline` `marcos` `dicas` `faq` `idadecorrigida` `depoimentos`

**Responsável (DiarioPage):**
- `resumo` `cadastro` `refeicoes` `amamentacao` `introducao` `sintomas` `fezes` `sono` `choro` `medicamentos` `vacinas` `receitas` `alertas` `documentos` `calculadora` `timeline` `marcos` `dicas` `faq` `idadecorrigida` `depoimentos`

> A aba `fezes` em ambas as páginas renderiza `TabIntestinal` — um wrapper com sub-abas: Hábito (`TabFezes`) + Evolução (`TabGraficoFezes`) + Fraldas (`TabFraldas`).
> A aba `calculadora` renderiza `TabCalculadora` — wrapper com sub-abas: Dose de Medicamentos + Altura-Alvo.

---

## Banco de Dados (Supabase)

Detalhes completos das tabelas, colunas e RLS em `references/database.md`.

**Tabelas principais:**
```
profiles          — usuários (id, full_name, role)
patients          — pacientes (vinculados a parent_id)
patient_requests  — solicitações de cadastro pelo responsável
meals             — refeições
stool_records     — registros intestinais (Bristol)
symptom_records   — sintomas
sleep_records     — sono
breastfeeding_records — amamentação
growth_records    — medidas antropométricas
medications       — medicamentos
food_introductions — introdução alimentar
crying_records    — choro/cólica
prescriptions     — prescrições médicas
tips              — dicas publicadas pelo médico
alerts            — alertas clínicos
diaper_records    — registro de fraldas (com foto)
patient_documents — documentos/exames
```

**Storage buckets:**
- `patient-documents` — documentos, fotos de fraldas (`fraldas/{patient_id}/{ts}.ext`)
- `fotos-refeicoes` — fotos de refeições (`{patient_id}/{ts}_{name}`)
- `prescricoes` — arquivos de prescrições

---

## Padrões de Código

Detalhes completos em `references/conventions.md`.

### Componente Tab padrão
```jsx
export default function TabXxx({ patient }) {
  const { session } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [saveErro, setSaveErro] = useState('')

  const load = () => {
    supabase.from('tabela')
      .select('*').eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }
  useEffect(load, [patient.id])

  // save, del, render...
  // Chama markPatientActivity(patient.id, 'Label') após salvar
}
```

### Classes CSS globais (index.css)
```
.card          → bg-white rounded-xl border border-slate-200 shadow-sm
.btn-primary   → azul sólido (bg-blue-600)
.btn-secondary → branco com borda
.btn-danger    → vermelho leve
.input         → campo de formulário padrão
.label         → rótulo de campo
.section-header → cabeçalho de seção uppercase
.page-title    → título de página (text-2xl font-bold)
.badge         → pill badge genérico
```

### Modal padrão
```jsx
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
```

### Upload de arquivo para Storage
```js
const path = `pasta/${patient.id}/${Date.now()}.${ext}`
const { data: upData, error } = await supabase.storage
  .from('patient-documents')
  .upload(path, file, { contentType: file.type })
const { data: urlData } = supabase.storage.from('patient-documents').getPublicUrl(upData.path)
const url = urlData.publicUrl
```

---

## Referências Detalhadas

- **`references/database.md`** — todas as tabelas, colunas, tipos, RLS e políticas
- **`references/components.md`** — todas as abas com props, tabelas usadas e comportamentos
- **`references/conventions.md`** — convenções de código, padrões de UI e nomenclatura
