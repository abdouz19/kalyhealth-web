import type { VitalReading, VitalType } from '@/lib/types'
import { formatVital, vitalTone } from '@/lib/labels'
import { cn, formatTime } from '@/lib/utils'

const ROWS: Array<{ type: VitalType; label: string; unit: string; ref: string }> = [
  { type: 'bp', label: 'TA', unit: 'mmHg', ref: '< 140/90' },
  { type: 'hr', label: 'FC', unit: 'bpm', ref: '55–100' },
  { type: 'spo2', label: 'SpO₂', unit: '%', ref: '≥ 95' },
  { type: 'temp', label: 'T°', unit: '°C', ref: '35,5–37,7' },
  { type: 'height', label: 'Taille', unit: 'cm', ref: '' },
  { type: 'weight', label: 'Poids', unit: 'kg', ref: '' },
]

/** H (high) / L (low) flag, as printed on clinical results. */
function flag(type: VitalType, v: number, v2: number | null): 'H' | 'L' | null {
  switch (type) {
    case 'bp':
      if (v < 90) return 'L'
      return v >= 140 || (v2 ?? 0) >= 90 ? 'H' : null
    case 'hr':
      return v > 100 ? 'H' : v < 55 ? 'L' : null
    case 'spo2':
      return v < 95 ? 'L' : null
    case 'temp':
      return v >= 37.8 ? 'H' : v < 35.5 ? 'L' : null
    default:
      return null
  }
}

interface Column {
  at: string
  manual: boolean
  values: Partial<Record<VitalType, VitalReading>>
}

/** Rows = parameters, columns = capture times (most recent on the left). */
export function VitalsFlowsheet({ vitals, maxColumns = 4 }: { vitals: VitalReading[]; maxColumns?: number }) {
  const byTime = new Map<string, Column>()
  for (const v of vitals) {
    const col = byTime.get(v.captured_at) ?? { at: v.captured_at, manual: false, values: {} }
    col.values[v.type] = v
    col.manual ||= v.source === 'manual'
    byTime.set(v.captured_at, col)
  }
  const columns = [...byTime.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, maxColumns)

  if (columns.length === 0) {
    return <p className="px-3 py-6 text-center text-[13px] text-ink-3">Aucune constante reçue pour cette consultation.</p>
  }

  // Most recent value per parameter, wherever it was captured.
  const latest = (type: VitalType) => columns.find((c) => c.values[type])?.values[type]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-line-light text-xs text-ink-3">
            <th className="py-1.5 pl-3 text-left font-medium">Paramètre</th>
            <th className="px-2 py-1.5 text-right font-medium">Dernière</th>
            {columns.slice(1).map((c) => (
              <th key={c.at} className="px-2 py-1.5 text-right font-medium tabular-nums">
                {formatTime(c.at)}
              </th>
            ))}
            <th className="py-1.5 pr-3 text-right font-medium">Réf.</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const last = latest(row.type)
            return (
              <tr key={row.type} className="border-b border-line-light last:border-b-0">
                <td className="py-1.5 pl-3">
                  <span className="font-medium">{row.label}</span> <span className="text-xs text-ink-3">{row.unit}</span>
                </td>
                <td key={last?.id ?? 'none'} className={cn('px-2 py-1.5 text-right', last && 'flash-in')}>
                  {last ? <Value r={last} strong /> : <span className="text-ink-4">—</span>}
                </td>
                {columns.slice(1).map((c) => {
                  const r = c.values[row.type]
                  return (
                    <td key={c.at} className="px-2 py-1.5 text-right text-ink-2">
                      {r ? <Value r={r} /> : <span className="text-ink-4">·</span>}
                    </td>
                  )
                })}
                <td className="py-1.5 pr-3 text-right text-xs text-ink-3 tabular-nums">{row.ref}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-line-light px-3 py-1.5 text-[11px] text-ink-3">
        Dernière saisie {formatTime(columns[0]!.at)}, {columns[0]!.manual ? 'saisie manuelle' : 'dispositif connecté'}.
      </p>
    </div>
  )
}

function Value({ r, strong }: { r: VitalReading; strong?: boolean }) {
  const f = flag(r.type, r.value, r.value2)
  const tone = vitalTone(r.type, r.value, r.value2)
  return (
    <span className={cn('inline-flex items-baseline gap-1 tabular-nums', strong && 'font-semibold', f && (tone === 'danger' ? 'text-danger' : 'text-warning'))}>
      {formatVital(r.type, r.value, r.value2)}
      {f && <span className="text-[10px] font-bold">{f}</span>}
    </span>
  )
}
