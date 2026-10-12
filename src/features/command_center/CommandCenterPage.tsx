import {
  ArrowRight,
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  HeartPulse,
  MapPin,
  RadioTower,
  Stethoscope,
  Timer,
  Video,
  Wifi,
  WifiOff,
} from '@/components/ui/icons'
import type { LucideIcon } from '@/components/ui/icons'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, PageHeader } from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { useDbView } from '@/lib/db/useDb'
import { CAMPAIGNS, formatCount, rate } from '@/lib/campaigns'
import { CoverageMap } from '@/features/command_center/CoverageMap'
import { formatLongDate, todayIso } from '@/lib/utils'

const WEEKLY_ACTIVITY = [
  { day: 'Lun', count: 19 },
  { day: 'Mar', count: 24 },
  { day: 'Mer', count: 21 },
  { day: 'Jeu', count: 30 },
  { day: 'Ven', count: 27 },
  { day: 'Sam', count: 13 },
  { day: 'Dim', count: 9 },
]

const KALYGO_DEMO = [
  { location: 'As Eyla', region: 'Dikhil', team: 'Équipe mobile n° 2', state: 'En mission' },
  { location: 'Randa', region: 'Tadjourah', team: 'Équipe mobile n° 1', state: 'Prête' },
  { location: 'Ali Sabieh', region: 'Ali Sabieh', team: 'Équipe mobile n° 3', state: 'Programmée' },
]

const CONNECTIVITY_BY_SITE: Record<number, 'online' | 'maintenance'> = {
  1: 'online',
  2: 'maintenance',
}

export function CommandCenterPage() {
  const db = useDbView()
  const today = todayIso()
  const appointments = db.appointments.filter((appointment) => appointment.date === today)
  const waiting = appointments.filter((appointment) =>
    ['waiting_room', 'arrived', 'triage', 'measuring', 'ready'].includes(appointment.status),
  )
  const liveSessions = db.tele_sessions.filter((session) => session.status === 'live').length
  const activeCarts = db.sites.filter(
    (site) => site.has_kalycart && CONNECTIVITY_BY_SITE[site.id] === 'online',
  ).length
  const cartCount = db.sites.filter((site) => site.has_kalycart).length
  const specialities = new Set(db.doctors.map((doctor) => doctor.speciality)).size

  const metrics: Metric[] = [
    {
      label: 'Téléconsultations aujourd’hui',
      value: String(appointments.filter((appointment) => appointment.mode !== 'in_person').length),
      detail: `${appointments.filter((appointment) => appointment.mode === 'direct').length} directes · ${appointments.filter((appointment) => appointment.mode === 'assisted_cart' || appointment.mode === 'assisted_go').length} assistées · ${appointments.filter((appointment) => appointment.mode === 'in_person').length} en présentiel`,
      icon: Video,
      tone: 'blue',
    },
    {
      label: 'Centres actifs',
      value: String(db.sites.length),
      detail: `${db.sites.filter((site) => site.has_kalycart).length} équipés d’un KalyCart`,
      icon: Building2,
      tone: 'green',
    },
    {
      label: 'Spécialistes référencés',
      value: String(db.doctors.length),
      detail: `${specialities} spécialités représentées`,
      icon: Stethoscope,
      tone: 'blue',
    },
    {
      label: 'Patients en attente',
      value: String(waiting.length),
      detail: `${liveSessions} session${liveSessions > 1 ? 's' : ''} en cours`,
      icon: Clock3,
      tone: waiting.length ? 'amber' : 'green',
    },
    {
      label: 'Temps d’attente moyen',
      value: '12 min',
      detail: 'estimation',
      icon: Timer,
      tone: 'amber',
    },
  ]

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader
        title="Command Center"
        meta={<span>Supervision nationale · {formatLongDate(new Date())}</span>}
      />

      <div className="space-y-4 p-4 lg:p-5">
        <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-3xl bg-primary px-6 py-5 text-white">
          <Activity size={140} className="pointer-events-none absolute -right-4 -bottom-8 text-white/10" />
          <div className="relative">
            <p className="text-lg font-bold">Vue nationale du réseau Connected Care</p>
          </div>
          <span className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
            <span className="size-1.5 rounded-full bg-white" /> Mis à jour à l’instant
          </span>
        </div>

        <section aria-label="Indicateurs nationaux" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </section>

        <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
          <Card>
            <CardHeader title="Activité téléconsultation" subtitle="7 derniers jours" icon={<Video className="size-4" />} />
            <div className="p-4">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold tabular-nums">143</p>
                  <p className="text-xs text-ink-2">sessions initiées sur la période</p>
                </div>
                <Badge tone="success" icon={<ArrowRight className="size-3" />}>Tendance</Badge>
              </div>
              <div className="flex h-40 items-end gap-2 border-b border-line-light px-1 sm:gap-4" role="img" aria-label="Téléconsultations par jour sur sept jours">
                {WEEKLY_ACTIVITY.map((item) => (
                  <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-[11px] tabular-nums text-ink-3">{item.count}</span>
                    <div className="w-full max-w-12 rounded-t-sm bg-primary/80" style={{ height: `${(item.count / 32) * 100}%` }} />
                    <span className="pb-2 text-[11px] text-ink-3">{item.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-2">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-primary" />Téléconsultations</span>
                <span>{appointments.length} rendez-vous prévus aujourd’hui</span>
                <span>{waiting.length} patients en attente ou en préparation</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Réseau de soins" subtitle={`${db.sites.length} sites`} icon={<MapPin className="size-4" />} />
            <div className="divide-y divide-line-light">
              {db.sites.map((site) => {
                const connection = site.has_kalycart ? CONNECTIVITY_BY_SITE[site.id] ?? 'online' : null
                const siteAppointments = appointments.filter((appointment) => appointment.site_id === site.id).length
                return (
                  <div key={site.id} className="flex items-center gap-3 px-3 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2"><Building2 className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{site.name}</p>
                      <p className="mt-0.5 text-xs text-ink-3">{site.region} · {siteAppointments} rendez-vous</p>
                    </div>
                    {site.has_kalycart ? (
                      <Badge tone={connection === 'online' ? 'success' : 'warning'} dot>
                        {connection === 'online' ? 'KalyCart connecté' : 'Maintenance'}
                      </Badge>
                    ) : <Badge tone="neutral">Sans KalyCart</Badge>}
                  </div>
                )
              })}
              <div className="flex items-center justify-between px-3 py-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-ink-2"><RadioTower className="size-3.5" />KalyCart disponibles</span>
                <span className="font-semibold tabular-nums">{activeCarts} / {cartCount}</span>
              </div>
            </div>
          </Card>
        </section>

        <CoverageMap sites={db.sites} missions={[...KALYGO_DEMO, ...db.missions.filter((m) => m.status === 'active').map((m) => ({ location: m.location, region: m.region, team: m.team, state: 'En mission' }))]} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader title="Missions mobiles KalyGo" subtitle="État des équipes" icon={<RadioTower className="size-4" />} />
            <div className="divide-y divide-line-light">
              {KALYGO_DEMO.map((mission) => (
                <div key={mission.location} className="flex items-center gap-3 px-3 py-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><MapPin className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{mission.location}<span className="font-normal text-ink-3"> · {mission.region}</span></p>
                    <p className="mt-0.5 text-xs text-ink-3">{mission.team}</p>
                  </div>
                  <Badge tone={mission.state === 'En mission' ? 'primary' : mission.state === 'Prête' ? 'success' : 'neutral'} dot>{mission.state}</Badge>
                  <Wifi className="hidden size-4 text-success sm:block" aria-label="Connexion disponible" />
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2.5 text-xs text-ink-2">
                <span>Disponibilité des équipements</span>
                <span className="inline-flex items-center gap-1.5"><WifiOff className="size-3.5" />1 équipement en veille</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Campagnes de prévention" subtitle="Engagement des campagnes" icon={<HeartPulse className="size-4" />} />
            <div className="divide-y divide-line-light">
              {CAMPAIGNS.filter((c) => c.status === 'active').map((campaign) => {
                const Icon = campaign.icon
                const progress = rate(campaign.funnel.completed, campaign.funnel.viewed)
                return (
                  <div key={campaign.id} className="px-3 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Icon className="size-4" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{campaign.title}</p>
                          <Badge tone="primary">{progress} % complété</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-3">{campaign.formats.join(' · ')}</p>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
                          <span>{formatCount(campaign.funnel.viewed)} contenus vus</span>
                          <span>{formatCount(campaign.funnel.completed)} complétés</span>
                          <span>{formatCount(campaign.funnel.actions)} actions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <Link to="/command-center/prevention" className="flex items-center justify-between px-3 py-2.5 text-[13px] font-medium text-primary-dark hover:bg-hover">
                Voir toutes les campagnes et l’entonnoir d’engagement <ArrowRight className="size-3.5" />
              </Link>
              <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-ink-2">
                <CheckCircle2 className="size-3.5 text-success" />Français actif · arabe, somali et afar à préparer
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}

interface Metric {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: 'blue' | 'green' | 'amber'
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon
  const tone = {
    blue: 'bg-primary-soft text-primary',
    green: 'bg-success-soft text-success',
    amber: 'bg-warning-soft text-warning',
  }[metric.tone]
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-ink-2">{metric.label}</p>
          <p className="mt-1.5 text-[28px] leading-tight font-bold tabular-nums">{metric.value}</p>
          <p className="mt-1 text-[11px] text-ink-3">{metric.detail}</p>
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="size-4" /></div>
      </div>
    </Card>
  )
}
