import { CircleAlert, CircleCheck } from '@/components/ui/icons'
import { useSyncLogs } from '@/lib/api/queries'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/Card'
import { formatTime } from '@/lib/utils'

/** Integration journal: request id, operation, status, time. Never any clinical content. */
export function SyncLogPage() {
  const logs = useSyncLogs()
  return (
    <div>
      <PageHeader title="Journal MyAfia" meta={<Badge tone="warning">Cible : MyAfia</Badge>} />
      <div className="space-y-3 p-5">
        <p className="max-w-3xl text-[13px] text-ink-2">
          Chaque échange avec MyAfia via l’Integration Hub. Le journal ne contient aucune donnée clinique : identifiant de requête, opération, statut et heure uniquement.
        </p>
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-subtle text-left text-xs text-ink-2">
                <th className="py-2 pr-3 pl-4 font-medium">Heure</th>
                <th className="py-2 pr-3 font-medium">Opération</th>
                <th className="py-2 pr-3 font-medium">RDV</th>
                <th className="py-2 pr-3 font-medium">Identifiant de requête</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-line-light last:border-b-0">
                  <td className="py-2 pr-3 pl-4 text-ink-2 tabular-nums">{formatTime(l.created_at)}</td>
                  <td className="py-2 pr-3">{l.action}</td>
                  <td className="py-2 pr-3 text-ink-2 tabular-nums">{l.appointment_id ?? '—'}</td>
                  <td className="py-2 pr-3 text-xs text-ink-2 tabular-nums">{l.request_id}</td>
                  <td className="py-2 pr-4">
                    {l.status === 'success' ? (
                      <span className="flex items-center gap-1.5 text-success">
                        <CircleCheck className="size-3.5" /> Accepté
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-danger">
                        <CircleAlert className="size-3.5" /> {l.error}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
