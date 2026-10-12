import type { MeasurementKind, VitalType } from '@/lib/types'

/**
 * Hardware abstraction for KalyCart / KalyGo.
 * The demo uses `SimulatedKalyCart`; the real cart will provide another
 * implementation of `KalyCartDriver` without changing any screen.
 */

export type ScenarioId = 'normal' | 'chest_pain' | 'fever'

export interface Scenario {
  id: ScenarioId
  label: string
  description: string
}

export interface CartStatus {
  connected: boolean
  serial: string
  battery: number
  signal: 'good' | 'weak' | 'none'
}

export interface MeasureContext {
  scenario: ScenarioId
  patientHeight: number | null
  patientWeight: number | null
}

export type MeasureResult =
  | {
      kind: 'vitals'
      readings: Array<{ type: VitalType; value: number; value2: number | null; unit: string }>
    }
  | {
      kind: 'ecg'
      samples: number[]
      sample_rate: number
      heart_rate: number
      duration_s: number
      hint: string | null
    }
  | {
      kind: 'media'
      media: 'stethoscope' | 'scope'
      label: string
      params: Record<string, number>
    }

export interface KalyCartDriver {
  readonly simulated: boolean
  connect(serial: string): Promise<CartStatus>
  measure(kind: MeasurementKind, ctx: MeasureContext): Promise<MeasureResult>
}

export interface DeviceInfo {
  kind: MeasurementKind
  label: string
  device: string
  durationMs: number
}

export const DEVICES: DeviceInfo[] = [
  { kind: 'bp', label: 'Tension artérielle', device: 'Tensiomètre', durationMs: 2600 },
  { kind: 'spo2', label: 'SpO₂ / pouls', device: 'Oxymètre', durationMs: 1600 },
  { kind: 'temp', label: 'Température', device: 'Thermomètre', durationMs: 1100 },
  { kind: 'height', label: 'Taille', device: 'Toise', durationMs: 900 },
  { kind: 'weight', label: 'Poids', device: 'Balance', durationMs: 1100 },
  { kind: 'ecg', label: 'ECG', device: 'ECG 1 dérivation', durationMs: 3200 },
  { kind: 'stethoscope', label: 'Auscultation', device: 'Stéthoscope numérique', durationMs: 2200 },
  { kind: 'scope', label: 'Examen scope', device: 'Caméra médicale', durationMs: 1600 },
]

export function deviceFor(kind: MeasurementKind) {
  return DEVICES.find((d) => d.kind === kind)!
}
