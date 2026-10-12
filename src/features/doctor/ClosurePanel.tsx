import { useState } from 'react'
import { CalendarClock, CircleCheck, Database, FlaskConical, Pill, Plus, Trash } from '@/components/ui/icons'
import type { AppointmentDetail } from '@/lib/api/queries'
import { closeConsultation, type ClosurePayload } from '@/lib/api/mutations'
import type { BilanType, ConsultationMode, FollowUp, SyncLog } from '@/lib/types'
import { useUser } from '@/lib/auth/AuthContext'
import { BILAN_LABEL, FOLLOW_UP_DELAYS, MODE_LABEL } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, SectionLabel } from '@/components/ui/Card'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { cn, formatDate, formatTime } from '@/lib/utils'

const COMMON_DRUGS = [
  'Amlodipine 5 mg',
  'Aspirine 100 mg',
  'Atorvastatine 20 mg',
  'Bisoprolol 2,5 mg',
  'Furosémide 40 mg',
  'Metformine 1000 mg',
  'Paracétamol 1 g',
  'Périndopril 5 mg',
  'Trinitrine spray 0,15 mg',
]

type RxRow = ClosurePayload['prescriptions'][number] & { key: number }

const emptyRx = (key: number): RxRow => ({ key, drug: '', dosage: '1 comprimé', frequency: '1 fois par jour', duration: '30 jours', quantity: 30 })

/** Diagnosis / prescription / lab orders, then "sync to MyAfia". */
export function ClosurePanel({ detail, notes, live }: { detail: AppointmentDetail; notes: string; live: boolean }) {
  const { appointment } = detail
  if (appointment.status === 'completed' && detail.report) return <ClosedReport detail={detail} />
  return <ClosureForm detail={detail} notes={notes} live={live} />
}

function ClosureForm({ detail, notes, live }: { detail: AppointmentDetail; notes: string; live: boolean }) {
  const user = useUser()
  const toast = useToast()
  const { appointment, triage } = detail
  const [complaint, setComplaint] = useState(triage?.chief_complaint ?? appointment.reason ?? '')
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [rx, setRx] = useState<RxRow[]>([])
  const [bilans, setBilans] = useState<Partial<Record<BilanType, string>>>({})
  const [followUp, setFollowUp] = useState<FollowUp | null>(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<SyncLog[] | null>(null)

  function setRow(key: number, patch: Partial<RxRow>) {
    setRx((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  async function submit() {
    setSaving(true)
    try {
      const logs = await closeConsultation(user, appointment.id, {
        chief_complaint: complaint,
        diagnosis,
        treatment,
        notes,
        prescriptions: rx.filter((r) => r.drug.trim()).map(({ key: _k, ...r }) => r),
        bilans: (Object.entries(bilans) as Array<[BilanType, string]>).map(([type, detail]) => ({ type, detail })),
        follow_up: followUp,
      })
      setResult(logs)
    } catch (err) {
      toast.fail(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Note de consultation"
        subtitle={live ? 'Signée par le médecin puis versée au dossier MyAfia du patient' : 'Disponible une fois la consultation démarrée'}
      />
      <div className={cn('grid gap-5 p-4 lg:grid-cols-2', !live && 'pointer-events-none opacity-50')}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="complaint">Motif de consultation</Label>
            <Input id="complaint" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="diagnosis" hint="obligatoire">
              Diagnostic
            </Label>
            <Textarea id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Ex. Angor d’effort probable, à confirmer par épreuve d’effort" />
          </div>
          <div>
            <Label htmlFor="treatment">Conduite à tenir</Label>
            <Textarea id="treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="Conseils, orientation, arrêt de travail…" />
          </div>
          <FollowUpField value={followUp} onChange={setFollowUp} defaultMode={detail.appointment.mode} />
        </div>

        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <SectionLabel className="flex items-center gap-1.5">
                <Pill className="size-3.5" /> Ordonnance
              </SectionLabel>
              <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => setRx((r) => [...r, emptyRx(Date.now())])}>
                Ajouter
              </Button>
            </div>
            {rx.length === 0 && <p className="rounded-md border border-dashed border-line py-3 text-center text-xs text-ink-3">Aucun médicament prescrit</p>}
            {rx.length > 0 && (
              <div className="grid grid-cols-[1.4fr_1fr_1fr_32px] gap-1.5 px-0.5 pb-1 text-[11px] text-ink-3">
                <span>Médicament</span>
                <span>Posologie</span>
                <span>Durée</span>
              </div>
            )}
            <datalist id="drugs">
              {COMMON_DRUGS.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            <div className="space-y-1.5">
              {rx.map((r) => (
                <div key={r.key} className="grid grid-cols-[1.4fr_1fr_1fr_32px] gap-1.5">
                  <Input list="drugs" placeholder="Médicament" value={r.drug} onChange={(e) => setRow(r.key, { drug: e.target.value })} />
                  <Input placeholder="Posologie" value={r.frequency} onChange={(e) => setRow(r.key, { frequency: e.target.value })} />
                  <Input placeholder="Durée" value={r.duration} onChange={(e) => setRow(r.key, { duration: e.target.value })} />
                  <button onClick={() => setRx((rows) => rows.filter((x) => x.key !== r.key))} className="flex items-center justify-center rounded-md text-ink-3 hover:bg-danger-soft hover:text-danger" aria-label="Retirer">
                    <Trash className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel className="mb-2 flex items-center gap-1.5">
              <FlaskConical className="size-3.5" /> Examens complémentaires
            </SectionLabel>
            <div className="space-y-1.5">
              {(Object.keys(BILAN_LABEL) as BilanType[]).map((type) => {
                const on = type in bilans
                return (
                  <div key={type} className="flex items-center gap-2">
                    <label className="flex w-44 cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setBilans((b) => {
                            const next = { ...b }
                            if (on) delete next[type]
                            else next[type] = ''
                            return next
                          })
                        }
                        className="size-4 accent-primary"
                      />
                      {BILAN_LABEL[type]}
                    </label>
                    {on && <Input placeholder="Précisions" value={bilans[type]} onChange={(e) => setBilans((b) => ({ ...b, [type]: e.target.value }))} className="h-8 flex-1 text-[13px]" />}
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-line-light px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs text-ink-2">
          <Database className="size-3.5" /> Envoi vers MyAfia : diagnostic, ordonnance, examens, constantes et suivi
        </p>
        <Button size="lg" loading={saving} disabled={!live || !diagnosis.trim()} onClick={submit} icon={<CircleCheck className="size-3.5" />}>
          Signer et envoyer à MyAfia
        </Button>
      </div>

      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title="Note envoyée à MyAfia"
        footer={<Button onClick={() => setResult(null)}>Fermer</Button>}
      >
        <p className="text-sm text-ink-2">Éléments versés au dossier MyAfia du patient par l’Integration Hub :</p>
        <SyncLogList logs={result ?? []} />
      </Modal>
    </Card>
  )
}

function ClosedReport({ detail }: { detail: AppointmentDetail }) {
  const r = detail.report!
  return (
    <Card>
      <CardHeader
        title="Compte rendu signé"
        subtitle={`${formatTime(r.created_at)}`}
        action={
          <Badge tone="success" icon={<CircleCheck className="size-3" />}>
            Versé au dossier MyAfia
          </Badge>
        }
      />
      <div className="grid gap-5 p-4 lg:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <Row label="Motif" value={r.chief_complaint} />
          <Row label="Diagnostic" value={r.diagnosis} />
          <Row label="Conduite à tenir" value={r.treatment || '—'} />
          <Row label="Suivi" value={r.follow_up ? followUpText(r.follow_up, r.created_at) : 'Pas de suivi programmé'} />
          {r.notes && <Row label="Notes" value={r.notes} />}
        </dl>
        <div className="space-y-4">
          <div>
            <SectionLabel className="mb-1.5">Ordonnance</SectionLabel>
            {detail.prescriptions.length === 0 ? (
              <p className="text-sm text-ink-3">Aucune</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.prescriptions.map((p) => (
                  <li key={p.id}>
                    <strong>{p.drug}</strong>, {p.frequency}, {p.duration}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel className="mb-1.5">Examens complémentaires</SectionLabel>
            {detail.bilans.length === 0 ? (
              <p className="text-sm text-ink-3">Aucun</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.bilans.map((b) => (
                  <li key={b.id}>
                    <strong>{BILAN_LABEL[b.type]}</strong>
                    {b.detail && `, ${b.detail}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel className="mb-1.5">Journal de synchronisation</SectionLabel>
            <SyncLogList logs={detail.syncLogs} />
          </div>
        </div>
      </div>
    </Card>
  )
}

const FOLLOW_UP_MODES: ConsultationMode[] = ['in_person', 'direct', 'assisted_cart']

function followUpText(f: FollowUp, signedAt: string) {
  const delay = FOLLOW_UP_DELAYS.find(([d]) => d === f.in_days)?.[1] ?? `Dans ${f.in_days} jours`
  const date = new Date(signedAt)
  date.setDate(date.getDate() + f.in_days)
  return `${delay} (${formatDate(date.toISOString())}), ${MODE_LABEL[f.mode].toLowerCase()}${f.note ? ` : ${f.note}` : ''}`
}

/** Next visit, booked in the agenda when the note is signed. */
function FollowUpField({ value, onChange, defaultMode }: { value: FollowUp | null; onChange: (f: FollowUp | null) => void; defaultMode: ConsultationMode }) {
  const on = value !== null
  const mode = defaultMode === 'assisted_go' ? 'assisted_cart' : defaultMode
  return (
    <section className={cn('rounded-md border px-3 py-2.5', on ? 'border-primary/30 bg-primary-soft/40' : 'border-line')}>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={on}
          onChange={() => onChange(on ? null : { mode, in_days: 30, note: '' })}
          className="size-4 accent-primary"
        />
        <CalendarClock className="size-3.5 text-ink-3" /> Programmer un suivi
      </label>
      {value && (
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="fu-delay">Échéance</Label>
            <Select id="fu-delay" value={value.in_days} onChange={(e) => onChange({ ...value, in_days: Number(e.target.value) })}>
              {FOLLOW_UP_DELAYS.map(([days, label]) => (
                <option key={days} value={days}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="fu-mode">Modalité</Label>
            <Select id="fu-mode" value={value.mode} onChange={(e) => onChange({ ...value, mode: e.target.value as ConsultationMode })}>
              {FOLLOW_UP_MODES.map((m) => (
                <option key={m} value={m}>
                  {MODE_LABEL[m]}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="fu-note">Objet</Label>
            <Input id="fu-note" value={value.note} onChange={(e) => onChange({ ...value, note: e.target.value })} placeholder="Ex. Résultats épreuve d’effort" />
          </div>
          <p className="text-xs text-ink-3 sm:col-span-2">Le rendez-vous est créé dans votre agenda et visible par le patient dans MyAfia.</p>
        </div>
      )}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-3">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

export function SyncLogList({ logs }: { logs: SyncLog[] }) {
  return (
    <ul className="mt-2 divide-y divide-line-light rounded-md border border-line">
      {logs.map((l) => (
        <li key={l.id} className="flex items-center gap-2.5 px-3 py-1.5 text-[13px]">
          <CircleCheck className={cn('size-4 shrink-0', l.status === 'success' ? 'text-success' : 'text-danger')} />
          <span className="flex-1 font-medium">{l.action}</span>
          <code className="text-[11px] text-ink-3">{l.request_id}</code>
        </li>
      ))}
    </ul>
  )
}
