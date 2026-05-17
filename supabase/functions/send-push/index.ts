// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  // O webhook do Supabase envia { type, table, record, old_record }
  const record = (body.record ?? body) as Record<string, unknown>

  if (!record?.id) {
    return new Response(JSON.stringify({ error: 'no record' }), { status: 400 })
  }

  // Só dispara se houve nova atividade
  if (!record.last_activity_at) {
    return new Response(JSON.stringify({ skipped: 'no activity' }), { status: 200 })
  }

  const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')           ?? ''
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')          ?? ''
  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')               ?? ''
  const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? ''

  webpush.setVapidDetails(
    'mailto:contato@gastropediatria.app',
    VAPID_PUBLIC,
    VAPID_PRIVATE,
  )

  const supa = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Busca IDs de todos os médicos
  const { data: doctors, error: docErr } = await supa
    .from('profiles')
    .select('id')
    .eq('role', 'doctor')

  if (docErr || !doctors?.length) {
    return new Response(JSON.stringify({ skipped: 'no doctors' }), { status: 200 })
  }

  const doctorIds = doctors.map((d: { id: string }) => d.id)

  // Busca subscriptions dos médicos
  const { data: subs, error: subErr } = await supa
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', doctorIds)

  if (subErr || !subs?.length) {
    return new Response(JSON.stringify({ skipped: 'no subscriptions' }), { status: 200 })
  }

  const patientName    = String(record.name             ?? 'Paciente')
  const activityLabel  = String(record.last_activity_label ?? 'Novo registro')
  const patientId      = String(record.id)

  const notification = JSON.stringify({
    title: '📋 Nova atividade no diário',
    body:  `${patientName}: ${activityLabel}`,
    url:   `/dashboard/pacientes/${patientId}`,
  })

  const results = await Promise.allSettled(
    subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification,
      )
    )
  )

  const failed  = results.filter(r => r.status === 'rejected')
  const success = results.length - failed.length

  if (failed.length) {
    console.error('[send-push] falhas:', failed.map((r: PromiseRejectedResult) => r.reason?.message))
  }

  // Remove subscriptions inválidas (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected') {
      const status = (r.reason as { statusCode?: number })?.statusCode
      if (status === 410 || status === 404) {
        await supa.from('push_subscriptions')
          .delete()
          .eq('endpoint', subs[i].endpoint)
      }
    }
  }

  return new Response(
    JSON.stringify({ sent: success, failed: failed.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
