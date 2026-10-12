import type {
  AppointmentStatus,
  BilanType,
  ConsultationMode,
  MeasurementKind,
  TriagePriority,
  VitalType,
} from '@/lib/types'

export type Tone = 'neutral' | 'primary' | 'olive' | 'success' | 'warning' | 'danger' | 'info'

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Planifié',
  waiting_room: 'En salle d’attente',
  arrived: 'Arrivé',
  triage: 'Triage',
  measuring: 'Mesures en cours',
  ready: 'Prêt pour le médecin',
  in_consultation: 'En consultation',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

export const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  scheduled: 'neutral',
  waiting_room: 'warning',
  arrived: 'info',
  triage: 'info',
  measuring: 'info',
  ready: 'warning',
  in_consultation: 'primary',
  completed: 'success',
  cancelled: 'danger',
}

export const MODE_LABEL: Record<ConsultationMode, string> = {
  in_person: 'Présentiel',
  direct: 'Téléconsultation directe',
  assisted_cart: 'Assistée · KalyCart',
  assisted_go: 'Assistée · KalyGo',
}

export const MODE_TONE: Record<ConsultationMode, Tone> = {
  in_person: 'neutral',
  direct: 'primary',
  assisted_cart: 'olive',
  assisted_go: 'info',
}

/** Short label for dense views (week grid, chips). */
export const MODE_SHORT: Record<ConsultationMode, string> = {
  in_person: 'Présentiel',
  direct: 'Télé',
  assisted_cart: 'KalyCart',
  assisted_go: 'KalyGo',
}

export function isAssisted(mode: ConsultationMode) {
  return mode === 'assisted_cart' || mode === 'assisted_go'
}

export function isRemote(mode: ConsultationMode) {
  return mode !== 'in_person'
}

export const FOLLOW_UP_DELAYS: Array<[number, string]> = [
  [7, 'Dans 1 semaine'],
  [15, 'Dans 15 jours'],
  [30, 'Dans 1 mois'],
  [90, 'Dans 3 mois'],
  [180, 'Dans 6 mois'],
]

export const VITAL_LABEL: Record<VitalType, string> = {
  bp: 'Tension',
  hr: 'Fréquence cardiaque',
  spo2: 'SpO₂',
  temp: 'Température',
  height: 'Taille',
  weight: 'Poids',
}

export const MEASUREMENT_LABEL: Record<MeasurementKind, string> = {
  bp: 'Tension',
  spo2: 'SpO₂',
  temp: 'Température',
  height: 'Taille',
  weight: 'Poids',
  ecg: 'ECG',
  stethoscope: 'Auscultation',
  scope: 'Scope',
}

export const PRIORITY_LABEL: Record<TriagePriority, string> = {
  urgent: 'Urgent',
  semi_urgent: 'Semi-urgent',
  non_urgent: 'Non urgent',
}

export const PRIORITY_TONE: Record<TriagePriority, Tone> = {
  urgent: 'danger',
  semi_urgent: 'warning',
  non_urgent: 'success',
}

export const BILAN_LABEL: Record<BilanType, string> = {
  biologie: 'Biologie',
  radiologie: 'Radiologie',
  echographie: 'Échographie',
  ecg: 'ECG 12 dérivations',
}

export const SYMPTOMS = [
  'Douleur thoracique',
  'Essoufflement',
  'Palpitations',
  'Malaise / syncope',
  'Œdèmes des membres inférieurs',
  'Fièvre',
  'Toux',
  'Céphalées',
  'Vertiges',
  'Douleur abdominale',
]

export const RELATION_LABEL: Record<string, string> = {
  principal: 'Assuré principal',
  wife: 'Conjointe',
  husband: 'Conjoint',
  child: 'Enfant',
}

/** Rough normal ranges, used only to highlight values in the UI. */
export function vitalTone(type: VitalType, value: number, value2?: number | null): Tone {
  switch (type) {
    case 'bp':
      if (value >= 160 || (value2 ?? 0) >= 100 || value < 90) return 'danger'
      if (value >= 140 || (value2 ?? 0) >= 90) return 'warning'
      return 'success'
    case 'hr':
      if (value > 120 || value < 45) return 'danger'
      if (value > 100 || value < 55) return 'warning'
      return 'success'
    case 'spo2':
      if (value < 92) return 'danger'
      if (value < 95) return 'warning'
      return 'success'
    case 'temp':
      if (value >= 39 || value < 35.5) return 'danger'
      if (value >= 37.8) return 'warning'
      return 'success'
    case 'weight':
    case 'height':
      return 'neutral'
  }
}

export function formatVital(type: VitalType, value: number, value2?: number | null) {
  if (type === 'bp') return `${value}/${value2 ?? '–'}`
  if (type === 'temp' || type === 'height' || type === 'weight') return value.toFixed(1).replace('.', ',')
  return String(value)
}
