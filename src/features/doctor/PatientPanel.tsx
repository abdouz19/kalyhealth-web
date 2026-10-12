import type { ReactNode } from 'react'
import type { AppointmentDetail } from '@/lib/api/queries'
import { usePatientContext } from '@/lib/api/queries'
import type { Patient } from '@/lib/types'
import { PRIORITY_LABEL, PRIORITY_TONE, RELATION_LABEL } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { formatTime } from '@/lib/utils'

const ANTECEDENTS: Array<[keyof Patient, string]> = [
  ['personal_blood_pressure', 'Hypertension artérielle'],
  ['personal_diabetes_type_2', 'Diabète de type 2'],
  ['personal_heart_disease', 'Cardiopathie'],
  ['personal_asthmatic', 'Asthme'],
]

const FAMILY: Array<[keyof Patient, string]> = [
  ['family_heart_disease', 'Cardiopathie'],
  ['family_diabetes', 'Diabète'],
]

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Left column of the workspace: clinical summary read from MyAfia (mock). */
export function PatientPanel({ detail }: { detail: AppointmentDetail }) {
  const { patient } = detail.appointment
  const ctx = usePatientContext(patient.id)
  const personal = ANTECEDENTS.filter(([k]) => patient[k])
  const family = FAMILY.filter(([k]) => patient[k])
  const triage = detail.triage

  return (
    <div className="space-y-3">
      {triage && (
        <Card className="border-l-[3px] border-l-success">
          <CardHeader title="Triage infirmier" subtitle={formatTime(triage.created_at)} action={<Badge tone={PRIORITY_TONE[triage.priority]}>{PRIORITY_LABEL[triage.priority]}</Badge>} />
          <div className="space-y-1.5 px-3 py-2.5 text-[13px]">
            <p className="font-medium">{triage.chief_complaint}</p>
            {triage.symptoms.length > 0 && <p className="text-ink-2">{triage.symptoms.join(', ')}</p>}
            {triage.notes && <p className="text-ink-2">{triage.notes}</p>}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Motif du rendez-vous" />
        <p className="px-3 py-2.5 text-[13px]">{detail.appointment.reason ?? '—'}</p>
      </Card>

      <Card>
        <CardHeader title="Antécédents" />
        <List>
          {personal.length === 0 && !patient.personal_surgery_details && <Empty>Aucun antécédent personnel</Empty>}
          {personal.map(([k, label]) => (
            <Row key={k}>{label}</Row>
          ))}
          {patient.personal_surgery_details && <Row>Chirurgie : {patient.personal_surgery_details}</Row>}
          {family.map(([k, label]) => (
            <Row key={k} muted>
              Familial : {label}
            </Row>
          ))}
        </List>
      </Card>

      <Card>
        <CardHeader title="Traitement en cours" />
        <List>
          {ctx.chronic.length === 0 && <Empty>Aucun traitement chronique</Empty>}
          {ctx.chronic.map((m) => (
            <Row key={m.id}>
              <span className="font-medium">{m.drug_name}</span>
              <span className="block text-xs text-ink-3">
                {m.dosage}, {m.frequency}
              </span>
            </Row>
          ))}
        </List>
      </Card>

      <Card>
        <CardHeader title="Consultations antérieures" subtitle={String(ctx.history.length)} />
        <List>
          {ctx.history.length === 0 && <Empty>Aucune consultation dans MyAfia</Empty>}
          {ctx.history.map((c) => (
            <Row key={c.id}>
              <span className="flex justify-between gap-2 text-xs text-ink-3">
                <span className="tabular-nums">{formatShortDate(c.date)}</span>
                <span>{c.speciality}</span>
              </span>
              {c.summary}
            </Row>
          ))}
        </List>
      </Card>

      {ctx.family.length > 0 && (
        <Card>
          <CardHeader title="Ayants droit" subtitle="même n° assuré" />
          <List>
            {ctx.family.map((f) => (
              <Row key={f.id}>
                <span className="flex justify-between gap-2">
                  {f.fullname}
                  <span className="text-xs text-ink-3">{RELATION_LABEL[f.relation_name]}</span>
                </span>
              </Row>
            ))}
          </List>
        </Card>
      )}
    </div>
  )
}

function List({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line-light text-[13px]">{children}</ul>
}

function Row({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <li className={muted ? 'px-3 py-1.5 text-ink-2' : 'px-3 py-1.5'}>{children}</li>
}

function Empty({ children }: { children: ReactNode }) {
  return <li className="px-3 py-2 text-ink-3">{children}</li>
}
