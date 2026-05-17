import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const EVENT_TYPES = {
  meal:          { label: 'Refeição',         emoji: '🍽️', color: 'bg-orange-100 text-orange-700'  },
  stool:         { label: 'Fezes',            emoji: '💧', color: 'bg-blue-100 text-blue-700'      },
  sleep:         { label: 'Sono',             emoji: '😴', color: 'bg-purple-100 text-purple-700'  },
  symptom:       { label: 'Sintoma',          emoji: '⚠️', color: 'bg-yellow-100 text-yellow-700'  },
  breastfeeding: { label: 'Amamentação',      emoji: '🤱', color: 'bg-pink-100 text-pink-700'      },
  document:      { label: 'Documento',        emoji: '📄', color: 'bg-slate-100 text-slate-600'    },
  medication:    { label: 'Medicamento',      emoji: '💊', color: 'bg-teal-100 text-teal-700'      },
  crying:        { label: 'Choro/Cólica',     emoji: '😢', color: 'bg-red-100 text-red-700'        },
  food:          { label: 'Introdução Alim.', emoji: '🥣', color: 'bg-green-100 text-green-700'    },
}

const MEAL_LABELS = {
  cafe:    'Café da manhã',
  lanche:  'Lanche',
  almoco:  'Almoço',
  janta:   'Jantar',
  ceia:    'Ceia',
}

export default function TabTimeline({ patient }) {
  const [events,  setEvents]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState('all')

  useEffect(() => {
    const pid = patient.id
    Promise.all([
      supabase.from('meals').select('id,eaten_at,meal_type').eq('patient_id', pid).limit(50),
      supabase.from('stool_records').select('id,recorded_at,bristol_type').eq('patient_id', pid).limit(50),
      supabase.from('sleep_records').select('id,sleep_start,duration_minutes,quality').eq('patient_id', pid).limit(50),
      supabase.from('symptom_records').select('id,recorded_at,symptoms,severity').eq('patient_id', pid).limit(50),
      supabase.from('breastfeeding_records').select('id,started_at,duration_minutes').eq('patient_id', pid).limit(50),
      supabase.from('patient_documents').select('id,created_at,title,category').eq('patient_id', pid).limit(30),
      supabase.from('medications').select('id,start_date,name,dose').eq('patient_id', pid).limit(30),
      supabase.from('crying_records').select('id,recorded_at,duration_min,intensity').eq('patient_id', pid).limit(50),
      supabase.from('food_introductions').select('id,introduced_at,food_name,reaction').eq('patient_id', pid).limit(50),
    ]).then(([meals, stools, sleep, symptoms, bf, docs, meds, crying, foods]) => {
      const all = [
        ...(meals.data ?? []).map(e => ({
          id: `meal-${e.id}`, type: 'meal', date: e.eaten_at,
          desc: MEAL_LABELS[e.meal_type] ?? e.meal_type ?? 'Refeição',
        })),
        ...(stools.data ?? []).map(e => ({
          id: `stool-${e.id}`, type: 'stool', date: e.recorded_at,
          desc: `Tipo ${e.bristol_type}`,
        })),
        ...(sleep.data ?? []).map(e => ({
          id: `sleep-${e.id}`, type: 'sleep', date: e.sleep_start,
          desc: e.duration_minutes ? `${e.duration_minutes} min · ${e.quality ?? ''}` : e.quality ?? 'Sono',
        })),
        ...(symptoms.data ?? []).map(e => ({
          id: `symptom-${e.id}`, type: 'symptom', date: e.recorded_at,
          desc: Array.isArray(e.symptoms) ? e.symptoms.slice(0, 2).join(', ') : 'Sintoma',
        })),
        ...(bf.data ?? []).map(e => ({
          id: `bf-${e.id}`, type: 'breastfeeding', date: e.started_at,
          desc: e.duration_minutes ? `${e.duration_minutes} min` : 'Amamentação',
        })),
        ...(docs.data ?? []).map(e => ({
          id: `doc-${e.id}`, type: 'document', date: e.created_at,
          desc: e.title,
        })),
        ...(meds.data ?? []).map(e => ({
          id: `med-${e.id}`, type: 'medication', date: e.start_date + 'T00:00:00',
          desc: `${e.name} · ${e.dose}`,
        })),
        ...(crying.data ?? []).map(e => ({
          id: `cry-${e.id}`, type: 'crying', date: e.recorded_at,
          desc: `${e.duration_min}min · ${e.intensity}`,
        })),
        ...(foods.data ?? []).map(e => ({
          id: `food-${e.id}`, type: 'food', date: e.introduced_at + 'T12:00:00',
          desc: e.food_name + (e.reaction ? ` · ${e.reaction}` : ''),
        })),
      ]
      const sorted = all.filter(e => e.date).sort((a, b) => new Date(b.date) - new Date(a.date))
      setEvents(sorted)
      setLoading(false)
    })
  }, [patient.id])

  const visible = filtro === 'all' ? events : events.filter(e => e.type === filtro)

  const byDay = visible.reduce((acc, e) => {
    const day = format(new Date(e.date), 'yyyy-MM-dd')
    if (!acc[day]) acc[day] = []
    acc[day].push(e)
    return acc
  }, {})

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-blue-500" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFiltro('all')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all
            ${filtro === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
          Todos ({events.length})
        </button>
        {Object.entries(EVENT_TYPES).map(([key, meta]) => {
          const count = events.filter(e => e.type === key).length
          if (count === 0) return null
          return (
            <button key={key} onClick={() => setFiltro(key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${filtro === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
              {meta.emoji} {meta.label} ({count})
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <p className="font-medium">Nenhum evento no histórico</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDay).map(([day, dayEvents]) => (
            <div key={day}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                {format(parseISO(day), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-slate-200" />
                <div className="space-y-2">
                  {dayEvents.map(e => {
                    const meta = EVENT_TYPES[e.type]
                    const hasTime = e.date.length > 10
                    return (
                      <div key={e.id} className="relative">
                        <div className="absolute -left-3.5 top-3 w-2 h-2 rounded-full bg-white border-2 border-slate-300" />
                        <div className="card p-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                              {meta.emoji} {meta.label}
                            </span>
                            <span className="text-xs text-slate-600 flex-1 truncate">{e.desc}</span>
                            {hasTime && (
                              <span className="text-xs text-slate-400 shrink-0">
                                {format(new Date(e.date), 'HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
