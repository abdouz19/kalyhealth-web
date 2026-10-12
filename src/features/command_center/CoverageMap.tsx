import { Briefcase, Building2, Map as MapIcon } from '@/components/ui/icons'
import type { Site } from '@/lib/types'
import { Card, CardHeader } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export interface MissionSummary {
  location: string
  region: string
  team: string
  state: string
}

/**
 * Schematic map of the six regions of Djibouti, roughly in their geographic
 * position (cahier §5.4 « couverture géographique des missions mobiles »).
 * Not to scale: a tile grid keeps it readable at any width.
 */
const REGIONS: Array<{ name: string; area: string }> = [
  { name: 'Tadjourah', area: '1 / 1 / 2 / 3' },
  { name: 'Obock', area: '1 / 3 / 2 / 4' },
  { name: 'Dikhil', area: '2 / 1 / 4 / 2' },
  { name: 'Arta', area: '2 / 2 / 3 / 3' },
  { name: 'Djibouti-ville', area: '2 / 3 / 3 / 4' },
  { name: 'Ali Sabieh', area: '3 / 2 / 4 / 4' },
]

export function CoverageMap({ sites, missions }: { sites: Site[]; missions: MissionSummary[] }) {
  const covered = REGIONS.filter((r) => sites.some((s) => s.region === r.name && s.has_kalycart) || missions.some((m) => m.region === r.name)).length

  return (
    <Card>
      <CardHeader
        title="Couverture géographique"
        subtitle={`${covered} régions sur ${REGIONS.length} couvertes · carte schématique`}
        icon={<MapIcon className="size-4" />}
        action={
          <span className="hidden items-center gap-3 text-xs text-ink-2 sm:flex">
            <span className="inline-flex items-center gap-1"><Building2 className="size-3.5 text-primary" /> Centre KalyCart</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="size-3.5 text-olive-text" /> Mission KalyGo</span>
          </span>
        }
      />
      <div className="grid grid-cols-3 grid-rows-[repeat(3,minmax(92px,auto))] gap-1.5 p-3">
        {REGIONS.map((region) => {
          const carts = sites.filter((s) => s.region === region.name)
          const go = missions.filter((m) => m.region === region.name)
          const empty = carts.every((c) => !c.has_kalycart) && go.length === 0
          return (
            <div
              key={region.name}
              style={{ gridArea: region.area }}
              className={cn('rounded-md border p-2.5', empty ? 'border-dashed border-line bg-surface' : 'border-primary/20 bg-primary-soft/50')}
            >
              <p className="text-[13px] font-semibold">{region.name}</p>
              {empty && <p className="mt-1 text-xs text-ink-3">Non couverte</p>}
              <ul className="mt-1.5 space-y-1">
                {carts.map((s) => (
                  <li key={s.id} className="flex items-center gap-1.5 text-xs">
                    <Building2 className={cn('size-3.5 shrink-0', s.has_kalycart ? 'text-primary' : 'text-ink-4')} />
                    <span className="truncate">{s.short_name}</span>
                    {!s.has_kalycart && <span className="text-ink-3">· sans chariot</span>}
                  </li>
                ))}
                {go.map((m) => (
                  <li key={`${m.location}-${m.team}`} className="flex items-center gap-1.5 text-xs">
                    <Briefcase className="size-3.5 shrink-0 text-olive-text" />
                    <span className="truncate">{m.location}</span>
                    <span className="text-ink-3">· {m.state.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
