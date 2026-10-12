import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio } from '@/components/ui/icons'
import { useUser } from '@/lib/auth/AuthContext'
import { useSiteQueue, useSites, type AppointmentRow } from '@/lib/api/queries'
import { checkIn } from '@/lib/api/mutations'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/labels'
import type { AppointmentStatus } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { ageFrom, cn, formatLongDate } from '@/lib/utils'

type Filter = 'todo' | 'active' | 'done' | 'all'

const FILTERS: Array<{ id: Filter; label: string; statuses: AppointmentStatus[] | null }> = [
  { id: 'todo', label: 'À accueillir', statuses: ['scheduled'] },
  { id: 'active', label: 'En cours', statuses: ['arrived', 'triage', 'measuring', 'ready', 'in_consultation'] },
  { id: 'done', label: 'Terminés', statuses: ['completed', 'cancelled'] },
  { id: 'all', label: 'Tous', statuses: null },
]

const ROW_EDGE: Partial<Record<AppointmentStatus, string>> = {
  arrived: 'border-l-primary',
  triage: 'border-l-primary',
  measuring: 'border-l-primary',
  ready: 'border-l-success',
  in_consultation: 'border-l-success',
}

export function QueuePage() {
  const user = useUser()
  const sites = useSites().filter((s) => s.has_kalycart)
  const [siteId, setSiteId] = useState<number>(user.site_id ?? sites[0]!.id)
  const [filter, setFilter] = useState<Filter>('all')
  const site = sites.find((s) => s.id === siteId)!
  const rows = useSiteQueue(siteId)
  const statuses = FILTERS.find((f) => f.id === filter)!.statuses
  const visible = statuses ? rows.filter((r) => statuses.includes(r.status)) : rows

  return (
    <div>
      <PageHeader
        title="File du centre"
        meta={
          <>
            <span>{formatLongDate(new Date())}</span>
            <span className="flex items-center gap-1.5 text-success">
              <Radio className="size-3.5" />
              {site.kalycart_serial} disponible
            </span>
          </>
        }
        actions={
          <Select value={siteId} onChange={(e) => setSiteId(Number(e.target.value))} className="w-60">
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="space-y-3 p-5">
        <div className="flex gap-1 border-b border-line">
          {FILTERS.map((f) => {
            const count = f.statuses ? rows.filter((r) => f.statuses!.includes(r.status)).length : rows.length
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn('-mb-px border-b-2 px-3 py-1.5 text-sm', filter === f.id ? 'border-primary font-medium text-ink' : 'border-transparent text-ink-2 hover:text-ink')}
              >
                {f.label} <span className="ml-1 text-xs text-ink-3 tabular-nums">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-subtle text-left text-xs text-ink-2">
                <th className="w-16 py-2 pr-2 pl-4 font-medium">Heure</th>
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">Motif</th>
                <th className="py-2 pr-3 font-medium">Médecin à distance</th>
                <th className="py-2 pr-3 font-medium">Étape</th>
                <th className="w-36 py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ink-3">
                    Aucun patient dans cette liste.
                  </td>
                </tr>
              )}
              {visible.map((row) => (
                <QueueRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function QueueRow({ row }: { row: AppointmentRow }) {
  const user = useUser()
  const navigate = useNavigate()
  const toast = useToast()
  const open = () => navigate(`/nurse/patient/${row.id}`)

  async function arrive() {
    try {
      await checkIn(user, row.id)
      open()
    } catch (err) {
      toast.fail(err)
    }
  }

  return (
    <tr
      onClick={open}
      className={cn(
        'cursor-pointer border-b border-l-[3px] border-b-line-light border-l-transparent last:border-b-0 hover:bg-hover',
        ROW_EDGE[row.status],
        row.status === 'completed' && 'text-ink-3',
      )}
    >
      <td className="py-2.5 pr-2 pl-[13px] align-top font-semibold tabular-nums">{row.time}</td>
      <td className="py-2.5 pr-3 align-top">
        <p className="font-medium text-ink">{row.patient.fullname}</p>
        <p className="text-xs text-ink-3">
          {row.patient.gender === 'female' ? 'F' : 'M'}, {ageFrom(row.patient.birth)} ans, {row.patient.ssn}
        </p>
      </td>
      <td className="max-w-[240px] py-2.5 pr-3 align-top text-ink-2">{row.reason}</td>
      <td className="py-2.5 pr-3 align-top">
        <p className="text-ink">{row.doctor.fullname}</p>
        <p className="text-xs text-ink-3">{row.doctor.speciality}</p>
      </td>
      <td className="py-2.5 pr-3 align-top">
        <Badge tone={STATUS_TONE[row.status]} dot pulse={row.status === 'in_consultation'}>
          {STATUS_LABEL[row.status]}
        </Badge>
      </td>
      <td className="py-2 pr-4 text-right align-top" onClick={(e) => e.stopPropagation()}>
        {row.status === 'scheduled' ? (
          <Button size="sm" onClick={arrive}>
            Enregistrer l’arrivée
          </Button>
        ) : (
          <Button size="sm" variant={row.status === 'completed' ? 'ghost' : 'secondary'} onClick={open}>
            Ouvrir
          </Button>
        )}
      </td>
    </tr>
  )
}
