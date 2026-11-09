# Banco de Dados — Supabase PostgreSQL

## Tabelas de Usuários / Autenticação

### `auth.users` (gerenciado pelo Supabase)
Não manipular diretamente. Usado como FK em `profiles` e `patient_requests`.

### `profiles`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | = auth.users.id |
| full_name | text | Nome completo |
| role | text | `'doctor'` ou `'parent'` |

Criado automaticamente no cadastro (AuthContext). RLS: cada usuário só lê/edita o próprio perfil.

---

## Tabelas de Pacientes

### `patients`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| name | text NOT NULL | Nome da criança |
| birthdate | date | Data de nascimento |
| gender | text | `'M'` ou `'F'` |
| blood_type | text | Tipo sanguíneo |
| allergies | text[] ou text | Alergias |
| notes | text | JSON-parseable em alguns casos |
| parent_id | uuid → auth.users | FK do responsável vinculado |
| parent_email | text | E-mail pendente (antes do vínculo) |
| last_activity_at | timestamptz | Última atividade do responsável |
| last_activity_label | text | Label da última atividade |
| last_doctor_seen_at | timestamptz | Última vez que médico abriu |
| created_at | timestamptz | |

**Vínculo responsável-paciente:**
1. Médico cadastra paciente com `parent_email` → `parent_id = null`
2. Quando responsável faz login/cadastro com esse e-mail, o AuthContext faz auto-vínculo: `parent_id = userId`, `parent_email = null`

### `patient_requests`
Responsável solicita cadastro do filho antes de o médico aprovar.
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | uuid PK | |
| parent_id | uuid → auth.users | |
| parent_name | text | |
| parent_email | text | |
| child_name | text NOT NULL | |
| child_birthdate | date | |
| child_gender | text | `'M'` ou `'F'` |
| notes | text | |
| status | text | `'pending'` / `'approved'` / `'rejected'` |
| created_at | timestamptz | |
| reviewed_at | timestamptz | |

---

## Tabelas de Registros Clínicos

Todas têm `patient_id uuid REFERENCES patients(id) ON DELETE CASCADE` e `created_by uuid` (= session.user.id).

### `meals` — Refeições
| Coluna | Tipo | Valores |
|--------|------|---------|
| meal_type | text | `breakfast` `morning_snack` `lunch` `afternoon_snack` `dinner` `supper` |
| eaten_at | timestamptz | |
| description | text | Alimentos consumidos |
| notes | text | |
| photo_url | text | URL do Storage (bucket `fotos-refeicoes`) |

### `stool_records` — Intestinal / Fezes
| Coluna | Tipo | Valores |
|--------|------|---------|
| recorded_at | timestamptz | |
| bristol_scale | integer | 1–7 (Escala de Bristol) |
| color | text | `amarela` `verde` `marrom` `preta` `vermelha` `bege_branca` |
| blood | boolean | |
| mucus | boolean | |
| quantity | text | `pequena` `media` `grande` |
| notes | text | |

### `symptom_records` — Sintomas
| Coluna | Tipo | Valores |
|--------|------|---------|
| recorded_at | timestamptz | |
| symptoms | text[] | array de strings |
| severity | integer | 1–3 |
| fever_temp | numeric(4,1) | temperatura se febre |
| notes | text | |

### `sleep_records` — Sono
| Coluna | Tipo | Valores |
|--------|------|---------|
| sleep_start | timestamptz | |
| sleep_end | timestamptz | |
| duration_minutes | integer | |
| quality | text | `bom` `regular` `ruim` |
| notes | text | |

### `breastfeeding_records` — Amamentação
| Coluna | Tipo | Valores |
|--------|------|---------|
| started_at | timestamptz | |
| duration_minutes | integer | |
| side | text | `esquerdo` `direito` `ambos` `formula` |
| notes | text | |

### `growth_records` — Medidas Antropométricas
| Coluna | Tipo | Notas |
|--------|------|-------|
| measured_at | date | |
| weight | numeric(5,2) | kg |
| height | numeric(5,1) | cm |
| head_circumference | numeric(5,1) | cm |
| notes | text | |

### `medications` — Medicamentos
| Coluna | Tipo | Notas |
|--------|------|-------|
| recorded_at | timestamptz | |
| name | text | Nome do medicamento |
| dose | text | |
| unit | text | |
| frequency | text | |
| notes | text | |

### `food_introductions` — Introdução Alimentar
| Coluna | Tipo | Notas |
|--------|------|-------|
| introduced_at | date | |
| food_name | text | |
| accepted | text | `sim` `nao` `parcial` |
| reaction | text | |
| notes | text | |

### `crying_records` — Choro / Cólica
| Coluna | Tipo | Notas |
|--------|------|-------|
| recorded_at | timestamptz | |
| duration_minutes | integer | |
| intensity | integer | 1–3 |
| possible_cause | text | |
| notes | text | |

### `diaper_records` — Fraldas
| Coluna | Tipo | Valores |
|--------|------|---------|
| recorded_at | timestamptz | |
| tipo | text | `seco` `urina` `fezes` `misto` |
| cor_urina | text | `amarelo-claro` `amarelo` `amarelo-escuro` `laranja` `rosado` |
| cor_fezes | text | `amarelo` `verde` `marrom` `preto` `vermelho` `branco` |
| photo_url | text | Storage: `fraldas/{patient_id}/{timestamp}.{ext}` |
| notes | text | |

---

## Tabelas Médicas / Administrativas

### `prescriptions` — Prescrições
| Coluna | Tipo | Notas |
|--------|------|-------|
| patient_id | uuid | |
| title | text | |
| content | text | |
| file_url | text | Storage: bucket `prescricoes` |
| is_active | boolean | default true |
| created_at | timestamptz | |

### `tips` — Dicas
| Coluna | Tipo | Valores |
|--------|------|---------|
| title | text | |
| content | text | Markdown/HTML |
| category | text | `nutrition` `growth` `sleep` `hygiene` `vaccines` `general` |
| is_published | boolean | |
| published_at | timestamptz | |

### `alerts` — Alertas Clínicos
| Coluna | Tipo | Notas |
|--------|------|-------|
| patient_id | uuid | |
| title | text | |
| message | text | |
| severity | text | `baixa` `media` `alta` |
| is_read | boolean | |
| created_at | timestamptz | |

### `patient_documents` — Documentos
| Coluna | Tipo | Valores |
|--------|------|---------|
| patient_id | uuid | |
| title | text | |
| file_url | text | Storage: bucket `patient-documents` |
| file_type | text | |
| category | text | `exame` `laudo` `receita` `outro` |
| notes | text | |
| uploaded_by | uuid | |

---

## Storage Buckets

| Bucket | Caminho | Usado por |
|--------|---------|-----------|
| `patient-documents` | `{categoria}/{patient_id}/{ts}.{ext}` | Documentos, fraldas |
| `fotos-refeicoes` | `{patient_id}/{ts}_{filename}` | Fotos de refeições |
| `prescricoes` | `{patient_id}/{ts}_{filename}` | Arquivos de prescrição |

**Fraldas especificamente:** `fraldas/{patient_id}/{timestamp}.{ext}`

---

## Row Level Security (RLS)

Todas as tabelas de registros clínicos usam o par de políticas abaixo
(**nunca** `USING (true)` — corrigido em `security-hardening-migration.sql`):
```sql
-- médico: tudo
CREATE POLICY tabela_doctor_all ON tabela FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));
-- família: só o próprio filho
CREATE POLICY tabela_parent_all ON tabela FOR ALL TO authenticated
  USING      (patient_id IN (SELECT id FROM patients WHERE parent_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE parent_id = auth.uid()));
```

`profiles.role` é protegido por trigger: perfil novo nasce `'parent'` e só vira
`'doctor'` pela função `redeem_doctor_invite(code)` (convite com hash no banco).

`patient_requests` tem políticas mais granulares:
- Responsável: INSERT próprio + SELECT próprio
- Médico: SELECT todos + UPDATE + DELETE

`patients`: médico acessa todos; responsável acessa apenas o vinculado (`parent_id = auth.uid()`).

---

## Triggers de Atividade

A tabela `patients` tem `last_activity_at` e `last_activity_label` atualizadas via:
- **Trigger no banco** (`fn_update_patient_activity`) nas tabelas: meals, stool_records, symptom_records, sleep_records, breastfeeding_records, patient_documents, growth_records
- **`markPatientActivity(patientId, label)`** (chamada manual no JS) para tabelas sem trigger: fraldas, medicamentos, amamentação, etc.

```js
// src/lib/utils.js
export const markPatientActivity = (patientId, label = 'Atividade registrada') => {
  supabase.from('patients')
    .update({ last_activity_at: new Date().toISOString(), last_activity_label: label })
    .eq('id', patientId)
    .then(() => {}) // fire and forget
}
```

---

## Realtime

O médico recebe notificações em tempo real via Supabase Realtime em `HomePage.jsx`:
```js
supabase.channel('realtime-activity')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, handler)
  .subscribe()
```
Exibe notificação do browser se `Notification.permission === 'granted'`.


---

## Multi-médico e planos (multi-medico-freemium-migration.sql)

- `patients.doctor_id` (NOT NULL, default `auth.uid()`): cada paciente pertence a um médico.
  Família e médico não conseguem trocar o dono (trigger `trg_patients_guard_doctor`).
- Funções: `is_doctor()`, `is_admin()`, `doctor_owns_patient(patient_id)`,
  `parent_owns_patient(patient_id)`, `storage_patient_id(path)`.
- **Toda política de médico em tabela por paciente usa `doctor_owns_patient(patient_id)`.**
  Nunca mais `EXISTS (... role = 'doctor')` sozinho.
- `profiles.is_admin`: dono do sistema (recebe pedidos de cadastro sem médico, gerencia depoimentos).
- `patient_requests.doctor_id`: médico de destino (nulo → administrador).
- `tips.doctor_id`: família vê só as dicas publicadas do médico dela.
- `doctor_subscriptions` (plan: free · starter · clinica · cortesia): só o servidor escreve
  (SQL Editor / webhook Hotmart com service_role). Limite em `doctor_patient_limit()`:
  free=1 · starter=30 · clinica/cortesia=ilimitado · pago vencido/cancelado → 1.
- Trigger `trg_patients_enforce_limit` bloqueia INSERT acima do limite (mensagem amigável).
- Front: `usePlano()` (rpc `my_plan`) + `PlanoCard`; checkout em `VITE_HOTMART_CHECKOUT_URL`.
- Storage: políticas `ps_*` por bucket, pasta = id do paciente (`fraldas/{id}/…` em patient-documents).


---

## Vínculo da família (somente-convite-migration.sql)

- A família é vinculada **só** por convite (`create_patient_invite` → link/QR →
  `accept_patient_invite`) ou por pedido de cadastro aprovado pelo médico (`patient_requests`).
- **Não existe mais vínculo automático por e-mail**: `patients_parent_select` é só
  `parent_id = auth.uid()`; `patients_parent_link` e `get_user_id_by_email` foram removidos.
  `patients.parent_email` fica apenas como anotação.
- Uma conta de responsável pode ter vários filhos (irmãos): `AuthContext` expõe
  `pacientes`, `paciente` (ativo) e `selecionarPaciente(id)`.


---

## Curvas de crescimento (curvas-migration.sql)

- `patients.gestational_age_weeks` (22–44) e `gestational_age_days` (0–6): só o médico altera
  (trigger `trg_patients_guard_ga`). Define prematuro (< 37 sem) e idade corrigida.
- Referências em `src/lib/curvasReferencia.js` (GERADO por `scripts/gerar-curvas-referencia.py`):
  OMS 2006 LMS mensal 0–60 m · INTERGROWTH-21st pós-natal prematuros 27–64 sem IPM.
- Regras em `src/lib/crescimento.js`: prematuro → INTERGROWTH até 64 sem IPM; depois OMS pela
  idade corrigida até 24 meses corrigidos; termo/IG ausente → OMS cronológica.
- Tela: `components/crescimento/CurvasCrescimento.jsx` (modo `medico` com z/P; modo `familia` sem
  interpretação). Família: aba `crescimento` (`TabCrescimentoFamilia`).
