import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldAlert, ShieldCheck, TriangleAlert } from '@/components/ui/icons'
import type { Patient } from '@/lib/types'
import { RELATION_LABEL } from '@/lib/labels'
import { Avatar } from '@/components/ui/Avatar'
import { ageFrom, cn } from '@/lib/utils'

function formatBirth(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Patient identification banner, always visible on clinical screens:
 * identity, identifiers, coverage and allergies first, then the encounter context.
 */
export function PatientBanner({ patient, backTo, context, actions }: { patient: Patient; backTo: string; context?: ReactNode; actions?: ReactNode }) {
  const covered = patient.active_status === 1
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link to={backTo} className="flex size-10 items-center justify-center rounded-full bg-canvas text-ink-2 hover:bg-hover hover:text-ink" aria-label="Retour à la liste">
            <ArrowLeft className="size-4" />
          </Link>
          <Avatar name={patient.fullname} size="lg" />
          <div>
            <p className="text-[17px] leading-tight font-semibold">{patient.fullname}</p>
            <p className="text-[13px] text-ink-2">
              {patient.gender === 'female' ? 'Femme' : 'Homme'}, {ageFrom(patient.birth)} ans, né{patient.gender === 'female' ? 'e' : ''} le {formatBirth(patient.birth)}
            </p>
          </div>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
          <Field label="N° patient" value={patient.patient_number} />
          <Field label="N° assuré" value={patient.ssn} />
          <Field label="Lien" value={RELATION_LABEL[patient.relation_name] ?? patient.relation_name} />
          <Field label="Groupe" value={patient.blood_type ?? '—'} />
          <div>
            <dt className="text-[11px] text-ink-3">Couverture CNSS</dt>
            <dd className={cn('flex items-center gap-1 font-medium', covered ? 'text-success' : 'text-danger')}>
              {covered ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
              {covered ? 'Active' : 'Droits suspendus'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-3">Allergies</dt>
            <dd>
              {patient.personal_allergies ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                  <TriangleAlert className="size-3" />
                  {patient.personal_allergies}
                </span>
              ) : (
                <span className="font-medium text-ink-2">Aucune connue</span>
              )}
            </dd>
          </div>
        </dl>

        {(context || actions) && (
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {context}
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-ink-3">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
