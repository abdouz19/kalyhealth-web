import { useState, type FormEvent, type ReactNode } from 'react'
import { Activity, BatteryMedium, Droplet, HeartPulse, LoaderCircle, PencilLine, Plug, Ruler, ScanEye, Stethoscope, Thermometer, TriangleAlert, Weight } from '@/components/ui/icons'
import type { AppointmentDetail } from '@/lib/api/queries'
import { latestVitals } from '@/lib/api/queries'
import { manualVital, recordMeasurement } from '@/lib/api/mutations'
import type { MeasurementKind, VitalType } from '@/lib/types'
import { useUser } from '@/lib/auth/AuthContext'
import { formatVital, vitalTone } from '@/lib/labels'
import { checkVital, type QualityIssue } from '@/lib/vitalQuality'
import { AccessoryCheck } from '@/features/nurse/AccessoryCheck'
import { SCENARIOS } from '@/devices/simulatedKalyCart'
import { DEVICES, type ScenarioId } from '@/devices/types'
import { EcgViewer } from '@/components/clinical/EcgViewer'
import { ScopeImage } from '@/components/clinical/ScopeImage'
import { StethoscopePlayer } from '@/components/clinical/StethoscopePlayer'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn, formatTime } from '@/lib/utils'
import type { CartHandle } from '@/features/nurse/useKalyCart'

const ICONS: Record<MeasurementKind, ReactNode> = {
  bp: <Activity className="size-4" />,
  spo2: <Droplet className="size-4" />,
  temp: <Thermometer className="size-4" />,
  height: <Ruler className="size-4" />,
  weight: <Weight className="size-4" />,
  ecg: <HeartPulse className="size-4" />,
  stethoscope: <Stethoscope className="size-4" />,
  scope: <ScanEye className="size-4" />,
}

const MANUAL: Partial<Record<MeasurementKind, VitalType>> = { bp: 'bp', spo2: 'spo2', temp: 'temp', height: 'height', weight: 'weight' }

/** Device connection bar (cart serial, battery, demo scenario). */
export function CartHeader({ cart, mode }: { cart: CartHandle; mode: 'cart' | 'go' }) {
  const s = cart.status
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-t-xl border-b border-line-light px-3 py-2 text-[13px]">
      <span className="flex items-center gap-2 font-semibold">
        <Plug className="size-4 text-ink-3" />
        {mode === 'go' ? 'Valise KalyGo' : 'Chariot KalyCart'} {cart.serial}
      </span>
      {s?.connected ? (
        <>
          <span className="flex items-center gap-1.5 text-success">
            <span className="size-2 rounded-full bg-success" /> Connecté
          </span>
          <span className="flex items-center gap-1 text-ink-2">
            <BatteryMedium className="size-3.5" /> {s.battery} %
          </span>
        </>
      ) : (
        <span className="text-ink-3">Non connecté</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <AccessoryCheck serial={cart.serial} mode={mode} />
        {cart.simulated && (
          <Select value={cart.scenario} onChange={(e) => cart.setScenario(e.target.value as ScenarioId)} className="!h-8 !w-48 shrink-0 rounded-full text-[13px]" title="Choisir un scénario">
            {SCENARIOS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.label}
              </option>
            ))}
          </Select>
        )}
        {!s?.connected && (
          <Button size="sm" variant="olive" loading={cart.connecting} onClick={() => void cart.connect()}>
            Connecter
          </Button>
        )}
      </div>
    </div>
  )
}

/** One row per device: last result, time, measure / manual entry. */
export function DeviceGrid({ detail, cart }: { detail: AppointmentDetail; cart: CartHandle; columns?: 2 | 3 }) {
  const latest = latestVitals(detail.vitals)
  const ecg = detail.ecgs[detail.ecgs.length - 1]
  const steth = [...detail.media].reverse().find((m) => m.kind === 'stethoscope')
  const scope = [...detail.media].reverse().find((m) => m.kind === 'scope')
  const pendingKinds = new Set(detail.requests.filter((r) => r.status === 'pending').map((r) => r.kind))
  const connected = !!cart.status?.connected

  function vital(type: VitalType) {
    const r = latest[type]
    if (!r) return null
    const tone = vitalTone(type, r.value, r.value2)
    return (
      <span className={cn('font-semibold tabular-nums', tone === 'danger' && 'text-danger', tone === 'warning' && 'text-warning')}>
        {formatVital(type, r.value, r.value2)} <span className="text-xs font-normal text-ink-3">{r.unit}</span>
      </span>
    )
  }

  /** Plausibility check on the latest reading of a device (BP also checks heart rate). */
  function quality(kind: MeasurementKind): QualityIssue | null {
    const type = MANUAL[kind]
    const r = type ? latest[type] : undefined
    if (!r) return null
    const issue = checkVital(r.type, r.value, r.value2)
    if (issue || kind !== 'bp' || !latest.hr) return issue
    return checkVital('hr', latest.hr.value)
  }

  function result(kind: MeasurementKind): { node: ReactNode; at?: string } {
    switch (kind) {
      case 'bp':
        return {
          node: latest.bp ? (
            <span className="flex gap-4">
              {vital('bp')}
              {latest.hr && <span className="text-ink-2">FC {vital('hr')}</span>}
            </span>
          ) : null,
          at: latest.bp?.captured_at,
        }
      case 'spo2':
      case 'temp':
      case 'height':
      case 'weight':
        return { node: vital(kind), at: latest[kind]?.captured_at }
      case 'ecg':
        return { node: ecg ? <span className="text-ink-2">Tracé 10 s, FC {ecg.heart_rate} bpm</span> : null, at: ecg?.captured_at }
      case 'stethoscope':
        return { node: steth ? <span className="text-ink-2">{steth.label}</span> : null, at: steth?.captured_at }
      case 'scope':
        return { node: scope ? <span className="text-ink-2">{scope.label}</span> : null, at: scope?.captured_at }
    }
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line-light text-left text-xs text-ink-3">
          <th className="py-1.5 pl-3 font-medium">Dispositif</th>
          <th className="py-1.5 pr-3 font-medium">Dernier résultat</th>
          <th className="w-16 py-1.5 pr-3 font-medium">Heure</th>
          <th className="w-48 py-1.5 pr-3" />
        </tr>
      </thead>
      <tbody>
        {DEVICES.map((d) => {
          const busy = cart.busy === d.kind
          const requested = pendingKinds.has(d.kind)
          const { node, at } = result(d.kind)
          const issue = !busy ? quality(d.kind) : null
          const media =
            d.kind === 'ecg' && ecg ? (
              <EcgViewer recordingId={ecg.id} samples={ecg.samples} sampleRate={ecg.sample_rate} height={80} />
            ) : d.kind === 'stethoscope' && steth ? (
              <div className="max-w-md">
                <StethoscopePlayer heartRate={steth.params.hr ?? 75} />
              </div>
            ) : d.kind === 'scope' && scope ? (
              <ScopeImage variant={scope.params.variant ?? 1} className="size-24 rounded-xl" />
            ) : null
          return (
            <FragmentRows key={d.kind}>
              <tr className={cn('border-b border-line-light align-middle', requested && 'bg-warning-soft', media && 'border-b-0')}>
                <td className="py-2 pl-3">
                  <span className="flex items-center gap-2.5">
                    <span className={cn(at ? 'text-success' : 'text-ink-3')}>{ICONS[d.kind]}</span>
                    <span>
                      <span className="block font-medium">{d.label}</span>
                      <span className="block text-xs text-ink-3">{d.device}</span>
                    </span>
                    {requested && <span className="rounded-full bg-warning px-2 py-0.5 text-[11px] font-semibold text-white">Demandé</span>}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {busy ? (
                    <span className="flex items-center gap-2 text-ink-2">
                      <LoaderCircle className="size-3.5 animate-spin text-primary" /> Acquisition en cours…
                    </span>
                  ) : (
                    (node ?? <span className="text-ink-4">—</span>)
                  )}
                  {issue && (
                    <span className={cn('mt-0.5 flex items-start gap-1 text-xs', issue.level === 'error' ? 'text-danger' : 'text-warning')}>
                      <TriangleAlert className="mt-px size-3 shrink-0" /> {issue.message}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-xs text-ink-2 tabular-nums">{at ? formatTime(at) : ''}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center justify-end gap-1">
                    {MANUAL[d.kind] && <ManualEntry detail={detail} kind={d.kind} type={MANUAL[d.kind]!} />}
                    <Button size="sm" variant={requested ? 'primary' : 'secondary'} disabled={!connected || !!cart.busy} onClick={() => void cart.measure(d.kind)}>
                      {at ? 'Mesurer à nouveau' : 'Mesurer'}
                    </Button>
                  </div>
                </td>
              </tr>
              {media && (
                <tr className="border-b border-line-light">
                  <td colSpan={4} className="px-3 pb-2.5">
                    {media}
                  </td>
                </tr>
              )}
            </FragmentRows>
          )
        })}
      </tbody>
    </table>
  )
}

function FragmentRows({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/** Fallback when a device is unavailable: stored as manual entry, not simulated. */
function ManualEntry({ detail, kind, type }: { detail: AppointmentDetail; kind: MeasurementKind; type: VitalType }) {
  const user = useUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [issue, setIssue] = useState<QualityIssue | null>(null)

  function close() {
    setOpen(false)
    setA('')
    setB('')
    setIssue(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const v1 = Number(a.replace(',', '.'))
    const v2 = type === 'bp' ? Number(b.replace(',', '.')) : null
    const check = checkVital(type, v1, v2)
    if (check?.level === 'error') {
      setIssue(check)
      return
    }
    // A warning needs a second, explicit confirmation of the same values.
    if (check && issue?.message !== check.message) {
      setIssue(check)
      return
    }
    try {
      recordMeasurement(user, detail.appointment.id, kind, 'Saisie manuelle', manualVital(type, v1, v2), { source: 'manual', simulated: false })
      close()
    } catch (err) {
      toast.fail(err)
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="flex size-7 items-center justify-center rounded-md text-ink-3 hover:bg-hover hover:text-ink" title="Saisie manuelle (dispositif indisponible)" aria-label="Saisie manuelle">
        <PencilLine className="size-3.5" />
      </button>
    )

  const field = 'h-7 w-14 rounded-md border border-line px-1.5 text-[13px] tabular-nums focus:border-primary focus:outline-none'
  return (
    <form onSubmit={submit} onKeyDown={(e) => e.key === 'Escape' && close()} className="relative flex items-center gap-1">
      <input
        autoFocus
        inputMode="decimal"
        value={a}
        onChange={(e) => { setA(e.target.value); setIssue(null) }}
        placeholder={type === 'bp' ? 'Sys' : 'Valeur'}
        aria-label={type === 'bp' ? 'Systolique' : 'Valeur'}
        className={field}
      />
      {type === 'bp' && (
        <input inputMode="numeric" value={b} onChange={(e) => { setB(e.target.value); setIssue(null) }} placeholder="Dia" aria-label="Diastolique" className={field} />
      )}
      <Button size="sm" type="submit" variant={issue?.level === 'warning' ? 'secondary' : 'primary'}>
        {issue?.level === 'warning' ? 'Confirmer' : 'OK'}
      </Button>
      {issue && (
        <div role="alert" className={cn('absolute top-full right-0 z-20 mt-1 w-64 rounded-md border px-2.5 py-2 text-left text-xs shadow-md', issue.level === 'error' ? 'border-danger/30 bg-danger-soft text-danger' : 'border-warning/30 bg-warning-soft text-warning')}>
          <p className="flex items-start gap-1.5">
            <TriangleAlert className="mt-px size-3.5 shrink-0" />
            <span>
              {issue.message}
              {issue.level === 'warning' && <span className="mt-1 block text-ink-2">Vérifiez puis cliquez sur « Confirmer » pour enregistrer.</span>}
            </span>
          </p>
        </div>
      )}
    </form>
  )
}
