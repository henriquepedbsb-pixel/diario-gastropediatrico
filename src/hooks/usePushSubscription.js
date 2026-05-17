import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Chave pública VAPID
const VAPID_PUBLIC_KEY = 'BNVnZQ0wF2fdE8gFIWSBxCke3B4bhuWTtgwHf0jiOn-T8mXx5QId3dF2BBWeUH1M70qVRqqBcTorOHw4Wj12s6s'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushSubscription(userId) {
  const subscribed = useRef(false)

  useEffect(() => {
    if (!userId || subscribed.current) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function subscribe() {
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const registration = await navigator.serviceWorker.ready

        // Verifica se já existe uma subscription
        let sub = await registration.pushManager.getSubscription()

        if (!sub) {
          sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
        }

        const subJson = sub.toJSON()

        // Salva no Supabase (upsert por endpoint)
        await supabase.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: subJson.endpoint,
          p256dh:   subJson.keys?.p256dh  ?? '',
          auth:     subJson.keys?.auth    ?? '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'endpoint' })

        subscribed.current = true
      } catch (err) {
        console.warn('[Push] Erro ao subscrever:', err)
      }
    }

    subscribe()
  }, [userId])
}
