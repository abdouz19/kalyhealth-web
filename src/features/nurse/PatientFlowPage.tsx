import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bell, CircleCheck, ShieldCheck, ShieldX, TriangleAlert } from '@/components/ui/icons'
import { useUser } from '@/lib/auth/AuthContext'
import { useAppointmentDetail, type AppointmentDetail } from '@/lib/api/queries'
import { confirmIdentity, markReady, saveTriage } from '@/lib/api/mutations'
import type { AppointmentStatus, TriagePriority } from '@/lib/types'
import { MEASUREMENT_LABEL, MODE_LABEL, PRIORITY_LABEL, RELATION_LABEL, STATUS_LABEL, STATUS_TONE, SYMPTOMS } from '@/lib/labels'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { VideoStage } from '@/components/video/VideoStage'
import { SessionChat } from '@/components/clinical/SessionChat'
import { PatientBanner } from '@/components/clinical/PatientBanner'
import { useNetwork } from '@/lib/db/useDb'
import { CartHeader, DeviceGrid } from '@/features/nurse/DeviceGrid'
import { NetworkToggle } from '@/features/nurse/NetworkToggle'
import { useKalyCart, type CartHandle } from '@/features/nurse/useKalyCart'
import { ageFrom, cn, formatDate, formatTime } from '@/lib/utils'

type Step = 'identity' | 'triage' | 'measures' | 'consultation'

const STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 'identity', label: 'Identité & couverture', hint: 'Vérification CNSS' },
  { id: 'triage', label: 'Triage', hint: 'Motif, symptômes, urgence' },
  { id: 'measures', label: 'Mesures', hint: 'Dispositifs connectés' },
  { id: 'consultation', label: 'Téléconsultation', hint: 'Avec le médecin' },
]

function stepFromStatus(status: AppointmentStatus): Step {
  switch (status) {
    case 'scheduled':
    case 'arrived':
      return 'identity'
    case 'triage':
      return 'triage'
    case 'measuring':
      return 'measures'
    default:
      return 'consultation'
  }
}

const ORDER: Step[] = STEPS.map((s) => s.id)

export function PatientFlowPage() {
  const { id } = useParams()
  const detail = useAppointmentDetail(Number(id))
  if (!detail) {
    return (
      <div className="p-10">
        <p className="text-ink-2">Rendez-vous introuvable (peut-être pas encore synchronisé).</p>
        <Link to="/nurse/queue" className="mt-2 inline-block text-primary-dark underline">
          Retour à la file
        </Link>
      </div>
    )
  }
  return <Flow detail={detail} />
}

function Flow({ detail }: { detail: AppointmentDetail }) {
  const { appointment } = detail
  const { patient } = appointment
  const current = stepFromStatus(appointment.status)
  const [viewed, setViewed] = useState<Step | null>(null)
  const step = viewed && ORDER.indexOf(viewed) <= ORDER.indexOf(current) ? viewed : current
  const cart = useKalyCart(detail)
  const isGo = appointment.mode === 'assisted_go'
  const backTo = isGo ? '/nurse/mission' : '/nurse/queue'
  const goTo = (s: Step) => setViewed(s)

  return (
    <div className="min-h-full">
      <PatientBanner
        patient={patient}
        backTo={backTo}
        context={
          <div className="text-right text-[13px]">
            <p className="font-medium">
              {MODE_LABEL[appointment.mode]}
              <span className="font-normal text-ink-2">, {appointment.site?.name ?? appointment.mission?.location}</span>
            </p>
            <p className="text-ink-3">
              RDV {appointment.time} avec {appointment.doctor.fullname}, {appointment.doctor.speciality.toLowerCase()}
            </p>
          </div>
        }
        actions={
          <>
            {isGo && <NetworkToggle compact />}
            <Badge tone={STATUS_TONE[appointment.status]} dot pulse={appointment.status === 'in_consultation'}>
              {STATUS_LABEL[appointment.status]}
            </Badge>
          </>
        }
      />

      {/* Workflow steps */}
      <nav className="flex flex-wrap gap-1 border-b border-line-light bg-surface px-3 py-2">
        {STEPS.map((s, i) => {
          const idx = ORDER.indexOf(s.id)
          const done = idx < ORDER.indexOf(current) || appointment.status === 'completed'
          const reachable = idx <= ORDER.indexOf(current)
          return (
            <button
              key={s.id}
              disabled={!reachable}
              onClick={() => goTo(s.id)}
              className={cn(
                'flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors',
                step === s.id ? 'bg-primary-soft text-primary-dark' : 'text-ink-2',
                reachable ? 'hover:text-ink' : 'cursor-not-allowed opacity-45',
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
                  done ? 'bg-success text-white' : step === s.id ? 'bg-primary text-white' : 'bg-line-light text-ink-2',
                )}
              >
                {done ? <CircleCheck className="size-3" /> : i + 1}
              </span>
              {s.label}
            </button>
          )
        })}
      </nav>

      <div className="space-y-3 p-4">
        <RequestsBanner detail={detail} cart={cart} />
        {step === 'identity' && <IdentityStep detail={detail} onDone={() => setViewed(null)} />}
        {step === 'triage' && <TriageStep detail={detail} onDone={() => setViewed(null)} />}
        {step === 'measures' && <MeasuresStep detail={detail} cart={cart} onDone={() => setViewed(null)} />}
        {step === 'consultation' && <ConsultationStep detail={detail} cart={cart} />}
      </div>
    </div>
  )
}

// ─── Requests from the doctor ───────────────────────────────────────────────

function RequestsBanner({ detail, cart }: { detail: AppointmentDetail; cart: CartHandle }) {
  const pending = detail.requests.filter((r) => r.status === 'pending')
  if (pending.length === 0) return null
  return (
    <div className="space-y-2">
      {pending.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 border-l-4 border-l-warning bg-warning-soft px-3 py-2">
          <Bell className="size-4 text-warning" />
          <p className="flex-1 text-sm">
            <strong>{r.requested_by}</strong> demande : <strong>{MEASUREMENT_LABEL[r.kind]}</strong>
            <span className="ml-2 text-xs text-ink-2">{formatTime(r.created_at)}</span>
          </p>
          <Button size="sm" loading={cart.busy === r.kind} disabled={!cart.status?.connected || (!!cart.busy && cart.busy !== r.kind)} onClick={() => void cart.measure(r.kind)}>
            {cart.status?.connected ? 'Lancer la mesure' : 'Connectez le dispositif'}
          </Button>
        </div>
      ))}
    </div>
  )
}

// ─── Step 1 — identity & coverage ───────────────────────────────────────────

function IdentityStep({ detail, onDone }: { detail: AppointmentDetail; onDone: () => void }) {
  const user = useUser()
  const toast = useToast()
  const { patient, status } = detail.appointment
  const covered = patient.active_status === 1
  const alreadyDone = !['scheduled', 'arrived'].includes(status)

  async function confirm() {
    try {
      await confirmIdentity(user, detail.appointment.id)
      onDone()
    } catch (err) {
      toast.fail(err)
    }
  }

  return (
    <Card>
      <CardHeader title="Vérification de l’identité et de la couverture CNSS" subtitle="Comparer avec la pièce d’identité ou la carte CNSS présentée" />
      <div className="grid gap-6 p-4 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <Avatar name={patient.fullname} size="xl" />
          <span className="text-xs text-ink-3">Photo MyAfia</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="Nom complet" value={patient.fullname} />
          <Field label="Date de naissance" value={`${formatDate(patient.birth)} (${ageFrom(patient.birth)} ans)`} />
          <Field label="N° d’assuré (SSN)" value={patient.ssn} mono />
          <Field label="N° patient MyAfia" value={patient.patient_number} mono />
          <Field label="Lien avec l’assuré" value={RELATION_LABEL[patient.relation_name] ?? patient.relation_name} />
          <Field label="Téléphone" value={patient.phone} />
          <Field label="Adresse" value={patient.address} />
          <Field label="Régime" value={patient.regime} />
        </dl>
      </div>
      <div className={cn('mx-4 mb-4 flex items-start gap-3 rounded-md border px-3 py-2.5', covered ? 'border-success/30 bg-success-soft text-success' : 'border-danger/30 bg-danger-soft text-danger')}>
        {covered ? <ShieldCheck className="mt-0.5 size-5" /> : <ShieldX className="mt-0.5 size-5" />}
        <div className="text-sm">
          <p className="font-semibold">{covered ? 'Couverture CNSS active' : 'Droits CNSS suspendus'}</p>
          <p className="mt-0.5 text-ink-2">
            {covered ? 'Le patient peut bénéficier de la téléconsultation.' : 'Orienter le patient vers le guichet CNSS. La prise en charge se poursuit selon le protocole du centre.'}
          </p>
        </div>
      </div>
      <div className="flex justify-end rounded-b-xl border-t border-line-light px-4 py-2.5">
        {alreadyDone ? (
          <Badge tone="success" icon={<CircleCheck className="size-3.5" />}>
            Identité vérifiée
          </Badge>
        ) : (
          <Button size="lg" onClick={confirm}>
            Valider l’identité et passer au triage
          </Button>
        )}
      </div>
    </Card>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={cn('mt-0.5 font-semibold', mono && 'font-mono text-[13px]')}>{value}</dd>
    </div>
  )
}

// ─── Step 2 — triage ────────────────────────────────────────────────────────

function TriageStep({ detail, onDone }: { detail: AppointmentDetail; onDone: () => void }) {
  const user = useUser()
  const toast = useToast()
  const prev = detail.triage
  const [complaint, setComplaint] = useState(prev?.chief_complaint ?? detail.appointment.reason ?? '')
  const [symptoms, setSymptoms] = useState<string[]>(prev?.symptoms ?? [])
  const [priority, setPriority] = useState<TriagePriority>(prev?.priority ?? 'semi_urgent')
  const [notes, setNotes] = useState(prev?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveTriage(user, detail.appointment.id, { chief_complaint: complaint, symptoms, priority, notes })
      toast.success('Triage enregistré — visible par le médecin.')
      onDone()
    } catch (err) {
      toast.fail(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Triage" subtitle="Transmis au médecin avant la consultation" />
      <form onSubmit={submit}>
        <div className="space-y-4 p-4">
          <div>
            <Label htmlFor="complaint">Motif principal</Label>
            <Input id="complaint" value={complaint} onChange={(e) => setComplaint(e.target.value)} required />
          </div>
          <div>
            <Label>Symptômes</Label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => {
                const on = symptoms.includes(s)
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSymptoms((xs) => (on ? xs.filter((x) => x !== s) : [...xs, s]))}
                    className={cn('h-7 rounded-md border px-2.5 text-[13px] transition-colors', on ? 'border-primary bg-primary-soft font-medium text-primary-dark' : 'border-line bg-surface hover:border-ink-4')}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label>Niveau d’urgence</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRIORITY_LABEL) as TriagePriority[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'h-8 rounded-md border px-3 text-sm font-medium transition-colors',
                    priority === p
                      ? p === 'urgent'
                        ? 'border-danger bg-danger-soft text-danger'
                        : p === 'semi_urgent'
                          ? 'border-warning bg-warning-soft text-warning'
                          : 'border-success bg-success-soft text-success'
                      : 'border-line bg-surface text-ink-2',
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
            {priority === 'urgent' && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
                <TriangleAlert className="size-3.5" /> Urgence : appliquer le protocole d’urgence du centre en parallèle de la téléconsultation.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="tnotes">Observations</Label>
            <Textarea id="tnotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Début des symptômes, contexte, traitements pris…" />
          </div>
        </div>
        <div className="flex justify-end rounded-b-xl border-t border-line-light px-4 py-2.5">
          <Button size="lg" type="submit" loading={saving}>
            {prev ? 'Mettre à jour le triage' : 'Enregistrer et passer aux mesures'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Step 3 — measures ──────────────────────────────────────────────────────

function MeasuresStep({ detail, cart, onDone }: { detail: AppointmentDetail; cart: CartHandle; onDone: () => void }) {
  const user = useUser()
  const toast = useToast()
  const { online } = useNetwork()
  const count = detail.vitals.length + detail.ecgs.length + detail.media.length
  const alreadyReady = ['ready', 'in_consultation', 'completed'].includes(detail.appointment.status)

  async function ready() {
    try {
      await markReady(user, detail.appointment.id)
      toast.success(online ? 'Le médecin a été notifié.' : 'Patient prêt — le médecin sera notifié au retour du réseau.')
      onDone()
    } catch (err) {
      toast.fail(err)
    }
  }

  return (
    <Card>
      <CartHeader cart={cart} mode={detail.appointment.mode === 'assisted_go' ? 'go' : 'cart'} />
      <DeviceGrid detail={detail} cart={cart} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-line-light px-4 py-2.5">
        <p className="text-sm text-ink-2">
          {count === 0 ? 'Minimum requis : tension, SpO₂ et température.' : `${count} mesure(s) transmise(s) au médecin.`}
        </p>
        {alreadyReady ? (
          <Badge tone="success" icon={<CircleCheck className="size-3.5" />}>
            Patient signalé prêt
          </Badge>
        ) : (
          <Button size="lg" variant="olive" disabled={count === 0} onClick={ready}>
            Patient prêt, prévenir le médecin
          </Button>
        )}
      </div>
    </Card>
  )
}

// ─── Step 4 — teleconsultation ──────────────────────────────────────────────

function ConsultationStep({ detail, cart }: { detail: AppointmentDetail; cart: CartHandle }) {
  const user = useUser()
  const navigate = useNavigate()
  const { online } = useNetwork()
  const { appointment, session } = detail
  const live = appointment.status === 'in_consultation'

  if (appointment.status === 'completed') {
    return (
      <Card className="p-8 text-center">
        <CircleCheck className="mx-auto size-8 text-success" />
        <h2 className="mt-3 text-lg font-semibold">Consultation terminée</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">
          Le médecin a clôturé la consultation. Diagnostic, prescription et constantes ont été synchronisés vers le dossier MyAfia du patient.
        </p>
        <Button className="mt-6" onClick={() => navigate(appointment.mode === 'assisted_go' ? '/nurse/mission' : '/nurse/queue')}>
          Patient suivant
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {!live && (
        <div className="flex items-center gap-3 rounded-md border border-primary/25 bg-primary-soft px-3 py-2 text-[13px] text-primary-dark">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative size-2.5 rounded-full bg-primary" />
          </span>
          <span>
            En attente de {appointment.doctor.fullname}. {online ? 'Le médecin est prévenu que le patient est prêt.' : 'Hors ligne : il sera prévenu au retour du réseau.'} Les mesures restent possibles.
          </span>
        </div>
      )}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <VideoStage
          room={`appt-${appointment.id}`}
          me={{ name: `${user.fullname} (${appointment.mode === 'assisted_go' ? 'KalyGo' : 'KalyCart'})`, role: 'nurse' }}
          live={live}
          offline={!online}
          startedAt={session?.started_at}
          expected={{ name: appointment.doctor.fullname, caption: `${appointment.doctor.speciality}, MyAfia Web` }}
          idleText="Le médecin rejoindra la salle depuis MyAfia Web"
          className="h-[380px]"
        />
        <Card className="flex h-[380px] flex-col overflow-hidden">
          <CardHeader title="Messages de la session" />
          <div className="min-h-0 flex-1">
            <SessionChat appointmentId={appointment.id} messages={detail.messages} sender={user} disabled={!live || !online} />
          </div>
        </Card>
      </div>
      <Card>
        <CartHeader cart={cart} mode={appointment.mode === 'assisted_go' ? 'go' : 'cart'} />
        <DeviceGrid detail={detail} cart={cart} />
      </Card>
    </div>
  )
}
