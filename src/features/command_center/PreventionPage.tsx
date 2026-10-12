import { useState } from 'react'
import { CircleCheck, Clock3, Languages, Megaphone, Send, Target } from '@/components/ui/icons'
import { ACTION_LABEL, CAMPAIGNS, FUNNEL_STEPS, LANGUAGE_LABEL, formatCount, rate, type Campaign, type CampaignStatus } from '@/lib/campaigns'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, PageHeader } from '@/components/ui/Card'
import { cn, formatLongDate } from '@/lib/utils'

const STATUS: Record<CampaignStatus, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  active: { label: 'En cours', tone: 'success' },
  scheduled: { label: 'Programmée', tone: 'info' },
  ended: { label: 'Terminée', tone: 'neutral' },
}

/** Campaign dashboard (cahier §7.4 « Dashboard de campagne », §13 mesure de l’engagement). */
export function PreventionPage() {
  const [selectedId, setSelectedId] = useState(CAMPAIGNS[0]!.id)
  const selected = CAMPAIGNS.find((c) => c.id === selectedId) ?? CAMPAIGNS[0]!
  const totals = CAMPAIGNS.reduce(
    (acc, c) => ({ sent: acc.sent + c.funnel.sent, completed: acc.completed + c.funnel.completed, actions: acc.actions + c.funnel.actions }),
    { sent: 0, completed: 0, actions: 0 },
  )

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader title="Prévention & engagement" meta={<span>{formatLongDate(new Date())}</span>} />

      <div className="space-y-4 p-3 sm:p-5">
        <section aria-label="Totaux" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Campagnes en cours" value={String(CAMPAIGNS.filter((c) => c.status === 'active').length)} detail={`${CAMPAIGNS.length} au total`} />
          <Tile label="Messages envoyés" value={formatCount(totals.sent)} detail="Notifications MyAfia et SMS" />
          <Tile label="Contenus complétés" value={formatCount(totals.completed)} detail={`${rate(totals.completed, totals.sent)} % des envois`} />
          <Tile label="Actions entreprises" value={formatCount(totals.actions)} detail="FINDRISC, RDV, vaccination, suivi" />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <Card className="self-start">
            <CardHeader title="Campagnes" subtitle="Sélectionnez une campagne" icon={<Megaphone className="size-4" />} />
            <ul className="divide-y divide-line-light">
              {CAMPAIGNS.map((c) => {
                const Icon = c.icon
                const active = c.id === selected.id
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      aria-current={active}
                      className={cn('flex w-full items-center gap-3 border-l-[3px] px-3 py-3 text-left transition-colors', active ? 'border-l-primary bg-primary-soft/50' : 'border-l-transparent hover:bg-hover')}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{c.title}</span>
                          <Badge tone={STATUS[c.status].tone} dot>{STATUS[c.status].label}</Badge>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-3">
                          {c.theme} · {c.period}
                        </span>
                      </span>
                      <span className="hidden text-right sm:block">
                        <span className="block text-sm font-semibold tabular-nums">{c.funnel.sent ? `${rate(c.funnel.actions, c.funnel.sent)} %` : '—'}</span>
                        <span className="block text-[11px] text-ink-3">conversion</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          <CampaignDetail campaign={selected} />
        </div>

      </div>
    </div>
  )
}

function CampaignDetail({ campaign: c }: { campaign: Campaign }) {
  const max = c.funnel.sent
  return (
    <Card>
      <CardHeader title={c.title} subtitle={c.period} action={<Badge tone={STATUS[c.status].tone} dot>{STATUS[c.status].label}</Badge>} />
      <div className="space-y-5 p-4">
        <section>
          <h3 className="mb-3 text-[13px] font-semibold">Entonnoir d’engagement</h3>
          {max === 0 ? (
            <p className="flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-6 text-sm text-ink-3">
              <Clock3 className="size-4" /> Campagne programmée : aucun envoi pour l’instant.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {FUNNEL_STEPS.map(([key, label], i) => {
                const value = c.funnel[key]
                const prev = i > 0 ? c.funnel[FUNNEL_STEPS[i - 1]![0]] : value
                return (
                  <li key={key} className="group grid grid-cols-[120px_minmax(0,1fr)_92px] items-center gap-3 text-sm" title={`${label} : ${formatCount(value)} (${rate(value, max)} % des envois, ${rate(value, prev)} % de l’étape précédente)`}>
                    <span className="text-ink-2">{label}</span>
                    <span className="h-3 rounded-full bg-subtle">
                      <span className="block h-full rounded-full bg-primary transition-[width] group-hover:bg-primary-dark" style={{ width: `${Math.max(rate(value, max), 1)}%` }} />
                    </span>
                    <span className="text-right">
                      <span className="font-semibold tabular-nums">{formatCount(value)}</span>
                      {i > 0 && <span className="ml-1.5 text-xs text-ink-3 tabular-nums">{rate(value, prev)} %</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          {max > 0 && <p className="mt-2 text-xs text-ink-3">Le pourcentage indique la part conservée depuis l’étape précédente.</p>}
        </section>

        <dl className="grid gap-4 border-t border-line-light pt-4 text-sm sm:grid-cols-2">
          <Info icon={<Target className="size-3.5" />} label="Ciblage (règle CNSS)" value={c.targeting} />
          <Info icon={<CircleCheck className="size-3.5" />} label="Appel à l’action" value={ACTION_LABEL[c.cta]} />
          <Info icon={<Send className="size-3.5" />} label="Canaux" value={c.channels.join(', ')} />
          <Info icon={<Megaphone className="size-3.5" />} label="Formats" value={c.formats.join(', ')} />
          <div className="sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
              <Languages className="size-3.5" /> Langues
            </dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {c.languages.map((l) => (
                <Badge key={l.code} tone={l.ready ? 'success' : 'neutral'} icon={l.ready ? <CircleCheck className="size-3" /> : undefined}>
                  {LANGUAGE_LABEL[l.code]}
                  {!l.ready && ' · à traduire'}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
        {icon} {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  )
}

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="p-3.5">
      <p className="text-xs text-ink-2">{label}</p>
      <p className="mt-1.5 text-[28px] leading-tight font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] text-ink-3">{detail}</p>
    </Card>
  )
}
