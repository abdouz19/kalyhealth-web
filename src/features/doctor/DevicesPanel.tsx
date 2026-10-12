import { useState } from 'react'
import { LoaderCircle } from '@/components/ui/icons'
import type { AppointmentDetail } from '@/lib/api/queries'
import { requestMeasurement } from '@/lib/api/mutations'
import type { MeasurementKind } from '@/lib/types'
import { useUser } from '@/lib/auth/AuthContext'
import { MEASUREMENT_LABEL } from '@/lib/labels'
import { VitalsFlowsheet } from '@/components/clinical/VitalsFlowsheet'
import { EcgViewer } from '@/components/clinical/EcgViewer'
import { ScopeImage } from '@/components/clinical/ScopeImage'
import { StethoscopePlayer } from '@/components/clinical/StethoscopePlayer'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { cn, formatTime } from '@/lib/utils'

const REQUESTABLE: MeasurementKind[] = ['bp', 'spo2', 'temp', 'weight', 'ecg', 'stethoscope', 'scope']

/** Right column: what the nurse captures with KalyCart / KalyGo, live. */
export function DevicesPanel({ detail, canRequest }: { detail: AppointmentDetail; canRequest: boolean }) {
  const user = useUser()
  const toast = useToast()
  const [sending, setSending] = useState<MeasurementKind | null>(null)
  const ecg = detail.ecgs[detail.ecgs.length - 1]
  const steth = [...detail.media].reverse().find((m) => m.kind === 'stethoscope')
  const scope = [...detail.media].reverse().find((m) => m.kind === 'scope')
  const pending = detail.requests.filter((r) => r.status === 'pending')
  const { appointment } = detail
  const source = appointment.mode === 'assisted_go' ? `KalyGo, ${appointment.mission?.location ?? 'mission'}` : `KalyCart ${appointment.site?.kalycart_serial ?? ''}`

  async function ask(kind: MeasurementKind) {
    setSending(kind)
    try {
      await requestMeasurement(user, appointment.id, kind)
      toast.info(`Demande envoyée à l’infirmier : ${MEASUREMENT_LABEL[kind]}`)
    } catch (err) {
      toast.fail(err)
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader title="Constantes" subtitle={source} action={<Badge tone="success" dot pulse>Temps réel</Badge>} />
        <VitalsFlowsheet vitals={detail.vitals} />
      </Card>

      <Card>
        <CardHeader
          title="ECG 1 dérivation"
          subtitle={ecg ? `${formatTime(ecg.captured_at)}, FC ${ecg.heart_rate} bpm, 25 mm/s` : undefined}
        />
        <div className="p-2">
          {ecg ? (
            <>
              <EcgViewer recordingId={ecg.id} samples={ecg.samples} sampleRate={ecg.sample_rate} height={120} />
              {ecg.interpretation_hint && <p className="mt-1.5 px-1 text-xs text-warning">{ecg.interpretation_hint}</p>}
            </>
          ) : (
            <Empty>Aucun tracé reçu</Empty>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader title="Auscultation" />
          <div className="p-2.5">
            {steth ? (
              <>
                <StethoscopePlayer heartRate={steth.params.hr ?? 75} />
                <p className="mt-1.5 text-[11px] text-ink-3">
                  {steth.label}, {formatTime(steth.captured_at)}
                </p>
              </>
            ) : (
              <Empty>Aucun enregistrement</Empty>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Caméra médicale" />
          <div className="p-2.5">
            {scope ? (
              <>
                <ScopeImage variant={scope.params.variant ?? 1} className="aspect-square w-full rounded-xl" />
                <p className="mt-1.5 text-[11px] text-ink-3">{scope.label}</p>
              </>
            ) : (
              <Empty>Aucune image</Empty>
            )}
          </div>
        </Card>
      </div>

      {canRequest && (
        <Card>
          <CardHeader title="Demander à l’infirmier" subtitle={pending.length ? `${pending.length} en attente` : undefined} />
          <div className="flex flex-wrap gap-1.5 p-2.5">
            {REQUESTABLE.map((k) => {
              const isPending = pending.some((p) => p.kind === k)
              return (
                <button
                  key={k}
                  onClick={() => ask(k)}
                  disabled={isPending || sending === k}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-colors',
                    isPending ? 'border-warning/40 bg-warning-soft text-warning' : 'border-line bg-surface hover:border-primary hover:text-primary-dark',
                  )}
                >
                  {(isPending || sending === k) && <LoaderCircle className="size-3 animate-spin" />}
                  {MEASUREMENT_LABEL[k]}
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-2xl border border-dashed border-line py-4 text-center text-xs text-ink-3">{children}</p>
}
