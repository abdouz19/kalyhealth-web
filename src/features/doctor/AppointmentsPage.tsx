import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, Building2, Video } from '@/components/ui/icons'
import { useUser } from '@/lib/auth/AuthContext'
import { currentWeekDays, useDoctorAppointments, useDoctorWeek, type AppointmentRow } from '@/lib/api/queries'
import { markOfficeArrival, simulatePatientJoined, startConsultation } from '@/lib/api/mutations'
import type { AppointmentStatus, ConsultationMode } from '@/lib/types'
import { MODE_LABEL, MODE_SHORT, STATUS_LABEL, STATUS_TONE, isAssisted, type Tone } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ageFrom, cn, formatLongDate, todayIso } from '@/lib/utils'

type Filter = 'all' | 'in_person' | 'direct' | 'assisted'
type View = 'day' | 'week'

const FILTERS: Array<[Filter, string]> = [
  ['all', 'Tous'],
  ['in_person', 'Présentiel'],
  ['direct', 'Télé directe'],
  ['assisted', 'Assistée'],
]

const PREPARING = new Set<AppointmentStatus>(['arrived', 'triage', 'measuring'])

/** The patient is there and the doctor is the next step. */
function isWaitingForDoctor(row: AppointmentRow) {
  if (row.mode === 'in_person') return row.status === 'arrived'
  return row.status === 'waiting_room' || row.status === 'ready'
}

function matches(filter: Filter, mode: ConsultationMode) {
  if (filter === 'all') return true
  if (filter === 'assisted') return isAssisted(mode)
  return mode === filter
}

/** Left edge colour of a row = what the doctor needs to do. */
function rowEdge(row: AppointmentRow) {
  if (isWaitingForDoctor(row)) return row.status === 'ready' ? 'border-l-success' : 'border-l-warning'
  if (row.status === 'in_consultation') return 'border-l-primary'
  return undefined
}

/** Mode chip colours, shared by the day table and the week grid. */
const MODE_CHIP: Record<ConsultationMode, string> = {
  in_person: 'bg-canvas text-ink-2 border-transparent',
  direct: 'bg-primary-soft text-primary-dark border-transparent',
  assisted_cart: 'bg-success-soft text-olive-text border-transparent',
  assisted_go: 'bg-[#f1edfe] text-accent-violet border-transparent',
}

export function AppointmentsPage() {
  const user = useUser()
  const navigate = useNavigate()
  const toast = useToast()
  const rows = useDoctorAppointments(user.doctor_id!)
  const [filter, setFilter] = useState<Filter>('all')
  const [view, setView] = useState<View>('day')
  const [busy, setBusy] = useState<number | null>(null)

  const visible = rows.filter((r) => matches(filter, r.mode))
  const waiting = rows.filter(isWaitingForDoctor)

  async function run(row: AppointmentRow, action: () => Promise<void>) {
    setBusy(row.id)
    try {
      await action()
    } catch (err) {
      toast.fail(err)
    } finally {
      setBusy(null)
    }
  }

  const start = (row: AppointmentRow) =>
    run(row, async () => {
      await startConsultation(user, row.id)
      navigate(`/doctor/consultation/${row.id}`)
    })
  const arrive = (row: AppointmentRow) => run(row, () => markOfficeArrival(user, row.id))

  return (
    <div>
      <PageHeader
        title={view === 'day' ? 'Agenda du jour' : 'Agenda de la semaine'}
        meta={<span>{formatLongDate(new Date())}</span>}
        actions={
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <Segmented value={filter} onChange={setFilter} options={FILTERS} label="Filtrer par modalité" />
            <Segmented
              value={view}
              onChange={setView}
              label="Affichage"
              options={[
                ['day', 'Jour'],
                ['week', 'Semaine'],
              ]}
            />
          </div>
        }
      />

      {view === 'week' ? (
        <WeekView filter={filter} />
      ) : (
        <div className="space-y-3 p-3 sm:p-5">
          <div className="flex flex-wrap gap-2 text-[13px]">
            <Counter label="Rendez-vous" value={rows.length} />
            <Counter label="En attente" value={waiting.length} tone={waiting.length ? 'warning' : undefined} />
            <Counter label="Préparation infirmier" value={rows.filter((r) => isAssisted(r.mode) && PREPARING.has(r.status)).length} />
            <Counter label="En cours" value={rows.filter((r) => r.status === 'in_consultation').length} />
            <Counter label="Terminés" value={rows.filter((r) => r.status === 'completed').length} />
          </div>

          {waiting.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
              <BellRing className="size-4 text-warning" />
              <span>
                <strong>{w.patient.fullname}</strong>{' '}
                {w.mode === 'in_person'
                  ? 'est arrivé au cabinet'
                  : w.status === 'ready'
                    ? 'est prêt, constantes prises par l’infirmier'
                    : 'attend en salle d’attente virtuelle'}{' '}
                (RDV {w.time}).
              </span>
              <Button
                size="sm"
                className="ml-auto"
                loading={busy === w.id}
                icon={w.mode === 'in_person' ? <Building2 className="size-3.5" /> : <Video className="size-3.5" />}
                onClick={() => start(w)}
              >
                {w.mode === 'in_person' ? 'Recevoir le patient' : 'Démarrer la consultation'}
              </Button>
            </div>
          ))}

          {/* Phone: one card per appointment */}
          <ul className="space-y-2 sm:hidden">
            {visible.length === 0 && <li className="rounded-md border border-line bg-surface py-8 text-center text-sm text-ink-3">Aucun rendez-vous pour ce filtre aujourd’hui.</li>}
            {visible.map((row) => (
              <li
                key={row.id}
                onClick={() => navigate(`/doctor/consultation/${row.id}`)}
                className={cn('rounded-md border border-l-[3px] border-line border-l-transparent bg-surface p-3', rowEdge(row), row.status === 'completed' && 'opacity-70')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      <span className="tabular-nums">{row.time}</span> · {row.patient.fullname}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-2">{row.reason}</p>
                  </div>
                  <Badge tone={STATUS_TONE[row.status]} dot pulse={isWaitingForDoctor(row)}>
                    {row.mode === 'in_person' && row.status === 'arrived' ? 'Au cabinet' : STATUS_LABEL[row.status]}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <ModeChip mode={row.mode} />
                  <RowAction row={row} busy={busy === row.id} onStart={() => start(row)} onArrive={() => arrive(row)} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-md border border-line bg-surface sm:block">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle text-left text-xs text-ink-2">
                  <th className="w-16 py-2 pr-2 pl-4 font-medium">Heure</th>
                  <th className="py-2 pr-3 font-medium">Patient</th>
                  <th className="hidden py-2 pr-3 font-medium lg:table-cell">Motif</th>
                  <th className="py-2 pr-3 font-medium">Modalité</th>
                  <th className="py-2 pr-3 font-medium">Statut</th>
                  <th className="w-40 py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-ink-3">
                      Aucun rendez-vous pour ce filtre aujourd’hui.
                    </td>
                  </tr>
                )}
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => navigate(`/doctor/consultation/${row.id}`)}
                    className={cn(
                      'cursor-pointer border-b border-l-[3px] border-b-line-light border-l-transparent last:border-b-0 hover:bg-hover',
                      rowEdge(row),
                      row.status === 'completed' && 'text-ink-3',
                    )}
                  >
                    <td className="py-2.5 pr-2 pl-[13px] align-top font-semibold tabular-nums">{row.time}</td>
                    <td className="py-2.5 pr-3 align-top">
                      <p className="font-medium text-ink">{row.patient.fullname}</p>
                      <p className="text-xs text-ink-3">
                        {row.patient.gender === 'female' ? 'F' : 'M'}, {ageFrom(row.patient.birth)} ans, {row.patient.patient_number}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-2 lg:hidden">{row.reason}</p>
                    </td>
                    <td className="hidden max-w-[260px] py-2.5 pr-3 align-top text-ink-2 lg:table-cell">{row.reason ?? '—'}</td>
                    <td className="py-2.5 pr-3 align-top">
                      <ModeChip mode={row.mode} />
                      <p className="mt-0.5 text-xs text-ink-3">{row.mode === 'in_person' ? row.doctor.site : (row.site?.name ?? row.mission?.location)}</p>
                    </td>
                    <td className="py-2.5 pr-3 align-top">
                      <Badge tone={STATUS_TONE[row.status]} dot pulse={isWaitingForDoctor(row)}>
                        {row.mode === 'in_person' && row.status === 'arrived' ? 'Au cabinet' : STATUS_LABEL[row.status]}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
                      <RowAction row={row} busy={busy === row.id} onStart={() => start(row)} onArrive={() => arrive(row)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function RowAction({ row, busy, onStart, onArrive }: { row: AppointmentRow; busy: boolean; onStart: () => void; onArrive: () => void }) {
  const navigate = useNavigate()
  const open = () => navigate(`/doctor/consultation/${row.id}`)

  if (isWaitingForDoctor(row))
    return (
      <Button size="sm" loading={busy} onClick={onStart}>
        {row.mode === 'in_person' ? 'Recevoir' : 'Démarrer'}
      </Button>
    )
  if (row.status === 'in_consultation')
    return (
      <Button size="sm" variant="secondary" onClick={open}>
        Reprendre
      </Button>
    )
  if (row.status === 'completed')
    return (
      <Button size="sm" variant="ghost" onClick={open}>
        Compte rendu
      </Button>
    )
  if (row.status === 'scheduled' && row.mode === 'in_person')
    return (
      <Button size="sm" variant="secondary" loading={busy} onClick={onArrive} title="Le patient s’est présenté à l’accueil">
        Patient arrivé
      </Button>
    )
  if (row.status === 'scheduled' && row.mode === 'direct')
    return (
      <Button size="sm" variant="ghost" onClick={() => void simulatePatientJoined(row.id)} title="Confirmer l’arrivée du patient">
        Confirmer l’arrivée
      </Button>
    )
  return (
    <Button size="sm" variant="secondary" onClick={open}>
      Dossier
    </Button>
  )
}

const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const DAY_NUM = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** Shared agenda for the week: in-person and remote side by side (cahier §5.2). */
function WeekView({ filter }: { filter: Filter }) {
  const user = useUser()
  const navigate = useNavigate()
  const rows = useDoctorWeek(user.doctor_id!).filter((r) => matches(filter, r.mode))
  const days = currentWeekDays()
  const today = todayIso()
  const counts = (Object.keys(MODE_LABEL) as ConsultationMode[]).map((m) => [m, rows.filter((r) => r.mode === m).length] as const)

  return (
    <div className="space-y-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
        <span className="font-medium text-ink">{rows.length} rendez-vous cette semaine</span>
        {counts
          .filter(([, n]) => n > 0)
          .map(([m, n]) => (
            <span key={m} className="inline-flex items-center gap-1.5">
              <ModeChip mode={m} /> {n}
            </span>
          ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <div className="grid min-w-[840px] grid-cols-7 divide-x divide-line-light">
          {days.map((day) => {
            const date = new Date(`${day}T12:00:00`)
            const items = rows.filter((r) => r.date === day)
            const isToday = day === today
            return (
              <div key={day} className={cn('flex min-h-[340px] flex-col', isToday && 'bg-primary-soft/40')}>
                <div className={cn('border-b border-line-light px-2.5 py-2', isToday && 'border-b-primary/30')}>
                  <p className={cn('text-xs capitalize', isToday ? 'font-semibold text-primary-dark' : 'text-ink-3')}>
                    {WEEKDAY.format(date)}
                    {isToday && ' · aujourd’hui'}
                  </p>
                  <p className="text-sm font-semibold">{DAY_NUM.format(date)}</p>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-1.5">
                  {items.length === 0 && <p className="px-1 pt-2 text-xs text-ink-4">Aucun rendez-vous</p>}
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/doctor/consultation/${r.id}`)}
                      className={cn(
                        'rounded-2xl border px-3 py-2 text-left transition-colors hover:brightness-[0.97]',
                        MODE_CHIP[r.mode],
                        r.status === 'completed' && 'opacity-60',
                      )}
                    >
                      <span className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-semibold tabular-nums">{r.time}</span>
                        <span>{MODE_SHORT[r.mode]}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] font-medium text-ink">{r.patient.fullname}</span>
                      <span className="block truncate text-[11px] text-ink-3">{r.status === 'completed' ? 'Terminé' : r.reason}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ModeChip({ mode }: { mode: ConsultationMode }) {
  return <span className={cn('inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap', MODE_CHIP[mode])}>{MODE_LABEL[mode]}</span>
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<[T, string]>; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full overflow-x-auto rounded-full bg-surface p-1 [scrollbar-width:none]">
      {options.map(([key, text]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={cn('h-8 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors', value === key ? 'bg-primary text-white' : 'text-ink-2 hover:text-ink')}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function Counter({ label, value, tone }: { label: string; value: number; tone?: Extract<Tone, 'warning'> }) {
  return (
    <span className={cn('inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5', tone === 'warning' ? 'bg-warning-soft text-warning' : 'text-ink-2')}>
      {label}
      <strong className={cn('tabular-nums', tone === 'warning' ? 'text-warning' : 'text-ink')}>{value}</strong>
    </span>
  )
}
