import { useCallback, useState, useSyncExternalStore } from 'react'
import { kalyCart } from '@/devices/simulatedKalyCart'
import { deviceFor, type CartStatus, type ScenarioId } from '@/devices/types'
import type { AppointmentDetail } from '@/lib/api/queries'
import { recordMeasurement } from '@/lib/api/mutations'
import { isOnline } from '@/lib/db/store'
import type { MeasurementKind } from '@/lib/types'
import { useUser } from '@/lib/auth/AuthContext'
import { useToast } from '@/components/ui/Toast'

/** Cart connection survives navigation inside the tab (one cart per device). */
const cartStatuses = new Map<string, CartStatus>()
const cartListeners = new Set<() => void>()
function subscribeCart(l: () => void) {
  cartListeners.add(l)
  return () => {
    cartListeners.delete(l)
  }
}
function setCartStatus(serial: string, status: CartStatus) {
  cartStatuses.set(serial, status)
  cartListeners.forEach((l) => l())
}

function scenarioKey(appointmentId: number) {
  return `kaly.scenario.${appointmentId}`
}

/** Patients whose demo story calls for abnormal values. */
function defaultScenario(detail: AppointmentDetail): ScenarioId {
  const reason = (detail.appointment.reason ?? '').toLowerCase()
  if (reason.includes('thorac')) return 'chest_pain'
  return 'normal'
}

export function cartSerialFor(detail: AppointmentDetail) {
  return detail.appointment.mode === 'assisted_go' ? 'KG-MOBILE-02' : (detail.appointment.site?.kalycart_serial ?? 'KC-DEMO')
}

export function useKalyCart(detail: AppointmentDetail) {
  const user = useUser()
  const toast = useToast()
  const serial = cartSerialFor(detail)
  const status = useSyncExternalStore(subscribeCart, () => cartStatuses.get(serial) ?? null)
  const [connecting, setConnecting] = useState(false)
  const [busy, setBusy] = useState<MeasurementKind | null>(null)
  const [scenario, setScenarioState] = useState<ScenarioId>(
    () => (sessionStorage.getItem(scenarioKey(detail.appointment.id)) as ScenarioId | null) ?? defaultScenario(detail),
  )

  const setScenario = useCallback(
    (s: ScenarioId) => {
      sessionStorage.setItem(scenarioKey(detail.appointment.id), s)
      setScenarioState(s)
    },
    [detail.appointment.id],
  )

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      setCartStatus(serial, await kalyCart.connect(serial))
    } finally {
      setConnecting(false)
    }
  }, [serial])

  const measure = useCallback(
    async (kind: MeasurementKind) => {
      if (!status?.connected) {
        toast.error('Connectez d’abord le dispositif.')
        return
      }
      setBusy(kind)
      try {
        const result = await kalyCart.measure(kind, {
          scenario,
          patientHeight: detail.appointment.patient.height,
          patientWeight: detail.appointment.patient.weight,
        })
        recordMeasurement(user, detail.appointment.id, kind, deviceFor(kind).device, result, {
          source: 'device',
          simulated: kalyCart.simulated,
        })
        if (isOnline()) toast.success(`${deviceFor(kind).label} transmis au médecin.`)
        else toast.info(`${deviceFor(kind).label} enregistré localement — envoi au retour du réseau.`)
      } catch (err) {
        toast.fail(err)
      } finally {
        setBusy(null)
      }
    },
    [status, scenario, detail.appointment, user, toast],
  )

  return { serial, status, connecting, connect, busy, measure, scenario, setScenario, simulated: kalyCart.simulated }
}

export type CartHandle = ReturnType<typeof useKalyCart>
