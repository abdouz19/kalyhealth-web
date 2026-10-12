import type { VitalType } from '@/lib/types'

/**
 * Simple quality control on a measurement (cahier §7.3 « contrôle qualité simple »).
 *
 * - `error`   : physiologically impossible or a typing mistake → the value is refused.
 * - `warning` : possible but unusual → the nurse is asked to re-check before relying on it.
 *
 * This is a plausibility guard for data entry, not a clinical interpretation.
 */
export interface QualityIssue {
  level: 'error' | 'warning'
  message: string
}

const LIMITS: Record<VitalType, { min: number; max: number; label: string; unit: string }> = {
  bp: { min: 50, max: 280, label: 'Systolique', unit: 'mmHg' },
  hr: { min: 25, max: 250, label: 'Fréquence cardiaque', unit: 'bpm' },
  spo2: { min: 50, max: 100, label: 'SpO₂', unit: '%' },
  temp: { min: 30, max: 43, label: 'Température', unit: '°C' },
  height: { min: 40, max: 230, label: 'Taille', unit: 'cm' },
  weight: { min: 2, max: 300, label: 'Poids', unit: 'kg' },
}

export function checkVital(type: VitalType, value: number, value2?: number | null): QualityIssue | null {
  const l = LIMITS[type]
  if (!Number.isFinite(value) || value < l.min || value > l.max) {
    return { level: 'error', message: `${l.label} hors des limites mesurables (${l.min}–${l.max} ${l.unit}).` }
  }

  if (type === 'bp') {
    if (value2 == null || !Number.isFinite(value2) || value2 < 30 || value2 > 160) {
      return { level: 'error', message: 'Diastolique hors des limites mesurables (30–160 mmHg).' }
    }
    if (value2 >= value) return { level: 'error', message: 'La diastolique doit être inférieure à la systolique.' }
    if (value - value2 < 20) return { level: 'warning', message: 'Pression différentielle très faible : vérifier la position du brassard.' }
    if (value >= 180 || value2 >= 110) return { level: 'warning', message: 'Tension très élevée : recontrôler après 5 min de repos.' }
    if (value < 90) return { level: 'warning', message: 'Tension basse : recontrôler, patient allongé si besoin.' }
  }
  if (type === 'spo2' && value < 90) return { level: 'warning', message: 'SpO₂ basse : vérifier le capteur (doigt froid, vernis) et recontrôler.' }
  if (type === 'temp' && (value < 35 || value >= 39.5)) return { level: 'warning', message: 'Température inhabituelle : recontrôler avec le thermomètre.' }
  if (type === 'hr' && (value < 40 || value > 140)) return { level: 'warning', message: 'Fréquence cardiaque inhabituelle : recontrôler au repos.' }
  return null
}

/** Worst issue among several readings (BP measurement also returns heart rate). */
export function checkReadings(readings: Array<{ type: VitalType; value: number; value2: number | null }>) {
  let worst: QualityIssue | null = null
  for (const r of readings) {
    const issue = checkVital(r.type, r.value, r.value2)
    if (issue && (!worst || (issue.level === 'error' && worst.level === 'warning'))) worst = issue
  }
  return worst
}
