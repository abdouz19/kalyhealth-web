import { Activity, Apple, Baby, HeartPulse, Syringe, type LucideIcon } from '@/components/ui/icons'

/**
 * Prevention campaigns (cahier §7.4 and §13).
 * Same content catalogue as the patient app (`kalyhealth/lib/features/prevention`).
 */

export type CampaignStatus = 'active' | 'scheduled' | 'ended'
export type CampaignAction = 'findrisc' | 'appointment' | 'vaccination' | 'follow_up' | 'education'

export interface CampaignFunnel {
  sent: number
  opened: number
  viewed: number
  completed: number
  actions: number
}

export interface Campaign {
  id: string
  title: string
  theme: string
  icon: LucideIcon
  status: CampaignStatus
  period: string
  /** Targeting rule, validated by the CNSS before launch. */
  targeting: string
  channels: string[]
  formats: string[]
  cta: CampaignAction
  languages: Array<{ code: 'fr' | 'ar' | 'so' | 'aa'; ready: boolean }>
  funnel: CampaignFunnel
}

export const ACTION_LABEL: Record<CampaignAction, string> = {
  findrisc: 'Questionnaire FINDRISC',
  appointment: 'Prise de rendez-vous',
  vaccination: 'Rendez-vous vaccination',
  follow_up: 'Suivi programmé',
  education: 'Éducation thérapeutique',
}

export const LANGUAGE_LABEL = { fr: 'Français', ar: 'Arabe', so: 'Somali', aa: 'Afar' } as const

export const FUNNEL_STEPS: Array<[keyof CampaignFunnel, string]> = [
  ['sent', 'Envois'],
  ['opened', 'Ouvertures'],
  ['viewed', 'Contenus vus'],
  ['completed', 'Complétés'],
  ['actions', 'Actions entreprises'],
]

const FR_ONLY = [
  { code: 'fr', ready: true },
  { code: 'ar', ready: false },
  { code: 'so', ready: false },
  { code: 'aa', ready: false },
] as Campaign['languages']

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'diabete',
    title: 'Dépistage du diabète',
    theme: 'Diabète',
    icon: Activity,
    status: 'active',
    period: '1er sept. → 30 nov.',
    targeting: 'Assurés de 40 ans et plus, sans diabète connu',
    channels: ['Notification MyAfia', 'SMS'],
    formats: ['Vidéo 2 min', 'Questionnaire FINDRISC'],
    cta: 'findrisc',
    languages: [
      { code: 'fr', ready: true },
      { code: 'ar', ready: true },
      { code: 'so', ready: false },
      { code: 'aa', ready: false },
    ],
    funnel: { sent: 4820, opened: 2950, viewed: 1284, completed: 642, actions: 86 },
  },
  {
    id: 'hta',
    title: 'Prévenir l’hypertension',
    theme: 'Hypertension',
    icon: HeartPulse,
    status: 'active',
    period: '15 sept. → 15 déc.',
    targeting: 'Assurés de 35 ans et plus',
    channels: ['Notification MyAfia'],
    formats: ['Vidéo 2 min', 'Article', 'Fiche « 3 gestes »'],
    cta: 'appointment',
    languages: FR_ONLY,
    funnel: { sent: 3610, opened: 2105, viewed: 936, completed: 418, actions: 53 },
  },
  {
    id: 'vaccination',
    title: 'Rappels vaccinaux enfants',
    theme: 'Vaccination',
    icon: Syringe,
    status: 'active',
    period: '1er oct. → 31 déc.',
    targeting: 'Ayants droit de 0 à 6 ans, rappel dû dans les 30 jours',
    channels: ['Notification MyAfia', 'SMS'],
    formats: ['Carte calendrier vaccinal'],
    cta: 'vaccination',
    languages: FR_ONLY,
    funnel: { sent: 1240, opened: 980, viewed: 812, completed: 655, actions: 301 },
  },
  {
    id: 'nutrition',
    title: 'Bien manger au quotidien',
    theme: 'Nutrition',
    icon: Apple,
    status: 'scheduled',
    period: 'Démarre le 1er nov.',
    targeting: 'Tous les assurés ayant activé les notifications',
    channels: ['Notification MyAfia'],
    formats: ['Série de 4 cartes', 'Quiz'],
    cta: 'education',
    languages: FR_ONLY,
    funnel: { sent: 0, opened: 0, viewed: 0, completed: 0, actions: 0 },
  },
  {
    id: 'maternite',
    title: 'Suivi de grossesse',
    theme: 'Santé maternelle',
    icon: Baby,
    status: 'ended',
    period: '1er juin → 31 août',
    targeting: 'Assurées enceintes déclarées (ayants droit inclus)',
    channels: ['Notification MyAfia', 'Agent de santé'],
    formats: ['Vidéo', 'Article'],
    cta: 'follow_up',
    languages: FR_ONLY,
    funnel: { sent: 640, opened: 512, viewed: 430, completed: 301, actions: 188 },
  },
]

export function rate(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function formatCount(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n)
}
