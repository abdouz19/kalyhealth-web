import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppointmentStatus } from '@/lib/types'
import { useAuth } from '@/lib/auth/AuthContext'
import { useDbView } from '@/lib/db/useDb'
import { MEASUREMENT_LABEL } from '@/lib/labels'
import { useToast } from '@/components/ui/Toast'

/** Short two-tone chime (no audio file needed). */
export function playChime() {
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime
    for (const [i, f] of [880, 1320].entries()) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + i * 0.16)
      g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.16 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.35)
      o.connect(g).connect(ctx.destination)
      o.start(t + i * 0.16)
      o.stop(t + i * 0.16 + 0.4)
    }
    setTimeout(() => void ctx.close(), 900)
  } catch {
    /* audio blocked until user interaction */
  }
}

/**
 * Watches the data stream and notifies the logged-in staff member:
 * - doctor: one of their patients enters the waiting room or is ready;
 * - nurse: the doctor requests a measurement.
 * (Supabase Realtime + push notifications later.)
 */
export function useLiveAlerts() {
  const { user } = useAuth()
  const db = useDbView()
  const toast = useToast()
  const navigate = useNavigate()
  const prevStatus = useRef<Map<number, AppointmentStatus> | null>(null)
  const seenRequests = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!user) return

    if (user.role === 'doctor') {
      const mine = db.appointments.filter((a) => a.doctor_id === user.doctor_id)
      const prev = prevStatus.current
      if (prev) {
        for (const a of mine) {
          const before = prev.get(a.id)
          if (before === a.status) continue
          const p = db.patients.find((x) => x.id === a.patient_id)
          if (a.status === 'waiting_room') {
            toast.info(`${p?.fullname} est en salle d’attente.`)
            playChime()
          } else if (a.status === 'ready') {
            toast.success(`${p?.fullname} est prêt — constantes disponibles.`)
            playChime()
          }
        }
      }
      prevStatus.current = new Map(mine.map((a) => [a.id, a.status]))
    }

    if (user.role === 'nurse') {
      const relevant = new Set(
        db.appointments
          .filter((a) => (user.site_id ? a.site_id === user.site_id : false) || db.missions.some((m) => m.id === a.mission_id && m.nurse_id === user.id))
          .map((a) => a.id),
      )
      const pending = db.measurement_requests.filter((r) => r.status === 'pending' && relevant.has(r.appointment_id))
      const seen = seenRequests.current
      if (seen) {
        for (const r of pending) {
          if (seen.has(r.id)) continue
          toast.info(`${r.requested_by} demande : ${MEASUREMENT_LABEL[r.kind]}`)
          playChime()
          // Jump to the patient only from the lists, never away from another patient.
          if (!window.location.pathname.startsWith('/nurse/patient/')) navigate(`/nurse/patient/${r.appointment_id}`)
        }
      }
      seenRequests.current = new Set(db.measurement_requests.map((r) => r.id))
    }
    // toast/navigate are stable enough for this watcher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, user])
}
