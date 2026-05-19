# Componentes e Abas

## Layout

### `Layout.jsx`
Shell da aplicação. Sidebar fixa no desktop, drawer deslizante no mobile (lg breakpoint).
- Sidebar: `w-60`, `fixed` no mobile, `relative` no desktop
- Mobile top bar com hambúrguer
- `<Outlet />` do React Router no `<main>`

### `Sidebar.jsx`
Navegação lateral com dois conjuntos de abas: `DOCTOR_TABS` e `PARENT_TABS`.

**Estrutura de item:**
```js
// Aba normal:
{ id: 'sintomas', label: 'Sintomas', icon: AlertTriangle }

// Aba com href externo (não usa ?tab=):
{ id: 'depoimentos', label: 'Depoimentos', icon: MessageSquareQuote, href: '/depoimentos' }

// Cabeçalho de seção:
H('Alimentação')  // retorna { type: 'header', label: 'Alimentação' }
```

**Blocos do médico (DOCTOR_TABS):**
- Dados do Paciente: cadastro
- Alimentação: diario, amamentacao, introducao
- Saúde & Registros: sintomas, fezes, sono, choro, medicamentos
- Acompanhamento Clínico: vacinas, receitas, alertas, documentos, graficos
- Ferramentas: calculadora, timeline
- Orientações: marcos, dicas, faq, idadecorrigida, depoimentos

**Blocos do responsável (PARENT_TABS):**
- Meu Filho(a): **resumo** (padrão), cadastro
- Alimentação: refeicoes, amamentacao, introducao
- Saúde & Registros: sintomas, fezes, sono, choro, medicamentos
- Acompanhamento: vacinas, receitas, alertas, documentos
- Ferramentas: calculadora, timeline
- Orientações: marcos, dicas, faq, idadecorrigida, depoimentos

**Detecção de contexto:**
```js
const patientMatch = location.pathname.match(/^\/dashboard\/pacientes\/([^/]+)$/)
const patientId    = patientMatch?.[1] ?? null
const isDiario     = location.pathname === '/diario'
const activeTab    = new URLSearchParams(location.search).get('tab') || 'resumo'
```

---

## Páginas Principais

### `PacienteDetailPage.jsx` (visão médico)
Rota: `/dashboard/pacientes/:id?tab=X`

**Props via `useParams`:** `id` do paciente  
**Estado local:** dados do paciente, medidas, tab ativo  
**Abas renderizadas:**

| tab | Componente |
|-----|-----------|
| `cadastro` | inline — formulário de dados do paciente |
| `diario` | `TabDiario` (inline) |
| `amamentacao` | `<TabAmamentacao>` |
| `introducao` | `<TabIntroducaoAlimentar>` |
| `sintomas` | `<TabSintomas>` |
| `fezes` | `TabIntestinal` (wrapper com sub-abas) |
| `sono` | `<TabSono>` |
| `choro` | `<TabChoro>` |
| `medicamentos` | `<TabMedicamentos>` |
| `vacinas` | `<TabVacinas patientId={patient.id} birthdate={patient.birthdate}>` |
| `receitas` | inline — lista de prescrições |
| `alertas` | `<TabAlertas>` |
| `documentos` | `<TabDocumentos>` |
| `graficos` | inline — gráficos OMS (Recharts) |
| `calculadora` | `<TabCalculadora>` |
| `timeline` | `<TabTimeline>` |
| `marcos` | `<TabMarcos>` |
| `dicas` | inline — lista de dicas |
| `faq` | `<TabFAQ>` |
| `idadecorrigida` | `<TabIdadeCorrigida>` |

### `DiarioPage.jsx` (visão responsável)
Rota: `/diario?tab=X`

Usa `useAuth().paciente` como objeto `patient`.  
Default tab: `'resumo'`

**Abas renderizadas:**

| tab | Componente |
|-----|-----------|
| `resumo` | `TabResumo` (inline) — dashboard com 8 cards |
| `cadastro` | inline — edição de dados do filho |
| `refeicoes` | `TabRefeicoes` (inline) |
| `amamentacao` | `<TabAmamentacao>` |
| `introducao` | `<TabIntroducaoAlimentar>` |
| `sintomas` | `<TabSintomas>` |
| `fezes` | `TabIntestinal` (wrapper) |
| `sono` | `<TabSono>` |
| `choro` | `<TabChoro>` |
| `medicamentos` | `<TabMedicamentos>` |
| `vacinas` | `<TabVacinas>` |
| `receitas` | inline — lista de prescrições (só leitura) |
| `alertas` | `<TabAlertas>` |
| `documentos` | `<TabDocumentos>` |
| `calculadora` | `<TabCalculadora>` |
| `timeline` | `<TabTimeline>` |
| `marcos` | `<TabMarcos>` |
| `dicas` | inline — dicas publicadas |
| `faq` | `<TabFAQ>` |
| `idadecorrigida` | `<TabIdadeCorrigida>` |

---

## Componentes de Aba (`src/components/paciente/`)

### `TabAmamentacao.jsx`
- Tabela: `breastfeeding_records`
- Props: `{ patient }`
- Registra: horário início, duração, lado (esquerdo/direito/ambos/fórmula)

### `TabAlertas.jsx`
- Tabela: `alerts`
- Props: `{ patient }`
- CRUD de alertas clínicos com severidade (baixa/média/alta)

### `TabCalculadora.jsx`
Sub-abas internas (`useState`):
1. **Dose de Medicamentos** (`CalcDose`) — cálculo por peso (mg/kg/dose)
2. **Altura-Alvo** (`CalcAlturaAlvo`) — Fórmula de Tanner:
   - Meninos: `(pai + mãe + 13) / 2`
   - Meninas: `(pai + mãe - 13) / 2`
   - Range: ±8.5 cm

### `TabChoro.jsx`
- Tabela: `crying_records`
- Props: `{ patient }`
- Registra: horário, duração, intensidade (1–3), causa possível

### `TabDocumentos.jsx`
- Tabela: `patient_documents`
- Storage: `patient-documents`
- Props: `{ patient }`
- Categorias: exame, laudo, receita, outro
- Upload com preview + abertura em nova aba

### `TabFAQ.jsx`
- Conteúdo estático — perguntas frequentes sobre gastropediatria
- Sem banco de dados

### `TabFraldas.jsx`
- Tabela: `diaper_records`
- Storage: `patient-documents` (caminho: `fraldas/{patient_id}/{ts}.{ext}`)
- Props: `{ patient }`
- Tipos: seco ✅, urina 💛, fezes 💩, misto 🔀
- Seleção de cor de urina e cor de fezes
- Upload de foto com `capture="environment"` (abre câmera no celular)
- Lightbox ao clicar na thumbnail
- Agrupamento por dia
- Contém `DiaperIcon` SVG customizado (não usa emoji)

### `TabGraficoFezes.jsx`
- Tabela: `stool_records`
- Props: `{ patient }`
- Gráfico de evolução das fezes ao longo do tempo (Recharts)

### `TabIdadeCorrigida.jsx`
- Props: `{ patient }`
- Calcula idade corrigida para prematuros
- Sem banco de dados

### `TabIntroducaoAlimentar.jsx`
- Tabela: `food_introductions`
- Props: `{ patient }`
- Log de novos alimentos introduzidos com reação

### `TabMarcos.jsx`
- Conteúdo estático — marcos do desenvolvimento infantil por faixa etária
- Sem banco de dados

### `TabMedicamentos.jsx`
- Tabela: `medications`
- Props: `{ patient }`
- Registra: medicamento, dose, unidade, frequência

### `TabSintomas.jsx`
- Tabela: `symptom_records`
- Props: `{ patient }`
- Multi-seleção de sintomas + severidade + temperatura se febre

### `TabSono.jsx`
- Tabela: `sleep_records`
- Props: `{ patient }`
- Registra: horário início/fim, duração calculada, qualidade

### `TabTimeline.jsx`
- Props: `{ patient }`
- Linha do tempo de eventos clínicos
- Consulta múltiplas tabelas em paralelo

### `TabVacinas.jsx`
- Props: `{ patient, patientId, birthdate }`
- Calendário de vacinas do PNI (conteúdo estático)
- Estado de "feita" persistido em `localStorage`:
  - Chave: `vaccinesDone_${patientId ?? 'default'}`
  - Valor: JSON array de strings (chaves únicas por dose)
- Barra de progresso e badge "Concluída" por faixa etária
- Chave de vacina: `vacKey(faixaIdade, nomeVacina, dose)`

### `GraficosTab.jsx`
- Gráficos OMS de peso, altura, perímetro cefálico (Recharts)
- Dados de referência em `src/lib/whoData.js`
- Props: `{ patient }` — busca `growth_records` do Supabase

---

## Wrapper TabIntestinal (inline em ambas as páginas)

```jsx
function TabIntestinal({ patient }) {
  const SUBTABS = [
    { id: 'habito',   label: '📋 Hábito'    },
    { id: 'evolucao', label: '📊 Evolução'  },
    { id: 'fraldas',  label: '👶 Fraldas'   },
  ]
  const [sub, setSub] = useState('habito')

  return (
    <div className="space-y-4">
      {/* Switcher */}
      <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
        {SUBTABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${sub === t.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {sub === 'habito'   && <TabFezes patient={patient} />}
      {sub === 'evolucao' && <TabGraficoFezes patient={patient} />}
      {sub === 'fraldas'  && <TabFraldas patient={patient} />}
    </div>
  )
}
```

---

## TabResumo (inline em DiarioPage)

Dashboard do responsável. Busca os 8 tipos de dados em paralelo:
```js
const [meals, stool, symptoms, sleep, bf, meds, foods, crying] = await Promise.all([
  supabase.from('meals').select(...).eq('patient_id', id).order('eaten_at', {ascending:false}).limit(1),
  supabase.from('stool_records').select(...).limit(1),
  // ...
])
```

8 cards coloridos em grid 2 colunas, cada um com `onClick={() => onNavigate(tab)}`.
Cards: Refeições (laranja), Intestinal (âmbar), Sintomas (vermelho), Sono (índigo), Amamentação (rosa), Medicamentos (verde), Introdução Alimentar (ciano), Choro (roxo).

---

## Páginas Secundárias

### `HomePage.jsx` — Painel do Médico
- KPIs: total pacientes, prescrições ativas, dicas publicadas
- Lista de pacientes com busca, badge de nova atividade
- Aprovação/rejeição de `patient_requests`
- Dicas recentes
- Supabase Realtime para notificações browser

### `DicasPage.jsx`
- CRUD de dicas médicas
- Categorias: nutrition, growth, sleep, hygiene, vaccines, general
- Publicação/despublicação

### `NovoPacientePage.jsx`
- Formulário completo de cadastro de paciente
- Campos: nome, nascimento, gênero, tipo sanguíneo, alergias, dados do nascimento, e-mail do responsável

### `CurriculoPage.jsx` / `ClinicasPage.jsx` / `DepoimentosPage.jsx`
- Páginas institucionais públicas (sem autenticação necessária para leitura)
