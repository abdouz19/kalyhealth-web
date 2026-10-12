import type { MeasurementKind } from '@/lib/types'
import { sleep } from '@/lib/utils'
import { generateEcg } from '@/devices/ecg'
import { deviceFor, type CartStatus, type KalyCartDriver, type MeasureContext, type MeasureResult, type Scenario, type ScenarioId } from '@/devices/types'

export const SCENARIOS: Scenario[] = [
  { id: 'normal', label: 'Constantes normales', description: 'Adulte sans anomalie' },
  { id: 'chest_pain', label: 'Douleur thoracique', description: 'HTA, tachycardie, sus-décalage ST' },
  { id: 'fever', label: 'Syndrome fébrile', description: 'Fièvre, tachycardie, SpO₂ limite' },
]

interface Profile {
  sys: [number, number]
  dia: [number, number]
  hr: [number, number]
  spo2: [number, number]
  temp: [number, number]
  stShift: number
  hint: string | null
}

const PROFILES: Record<ScenarioId, Profile> = {
  normal: { sys: [114, 128], dia: [72, 82], hr: [64, 78], spo2: [97, 99], temp: [36.5, 37.0], stShift: 0, hint: null },
  chest_pain: {
    sys: [150, 164],
    dia: [92, 100],
    hr: [92, 104],
    spo2: [94, 96],
    temp: [36.7, 37.1],
    stShift: 0.14,
    hint: 'Sus-décalage du segment ST — à interpréter par le médecin',
  },
  fever: { sys: [110, 122], dia: [68, 76], hr: [100, 112], spo2: [94, 96], temp: [38.4, 39.1], stShift: 0, hint: 'Tachycardie sinusale' },
}

function between([min, max]: [number, number], decimals = 0) {
  const v = min + Math.random() * (max - min)
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Demo implementation of the cart. Every value it produces is flagged `simulated`. */
export class SimulatedKalyCart implements KalyCartDriver {
  readonly simulated = true

  async connect(serial: string): Promise<CartStatus> {
    await sleep(900)
    return { connected: true, serial, battery: 82, signal: 'good' }
  }

  async measure(kind: MeasurementKind, ctx: MeasureContext): Promise<MeasureResult> {
    await sleep(deviceFor(kind).durationMs)
    const p = PROFILES[ctx.scenario]

    switch (kind) {
      case 'bp':
        return {
          kind: 'vitals',
          readings: [
            { type: 'bp', value: between(p.sys), value2: between(p.dia), unit: 'mmHg' },
            { type: 'hr', value: between(p.hr), value2: null, unit: 'bpm' },
          ],
        }
      case 'spo2':
        return {
          kind: 'vitals',
          readings: [
            { type: 'spo2', value: between(p.spo2), value2: null, unit: '%' },
            { type: 'hr', value: between(p.hr), value2: null, unit: 'bpm' },
          ],
        }
      case 'temp':
        return { kind: 'vitals', readings: [{ type: 'temp', value: between(p.temp, 1), value2: null, unit: '°C' }] }
      case 'height': {
        const h = ctx.patientHeight ?? 170
        return { kind: 'vitals', readings: [{ type: 'height', value: between([h - 0.5, h + 0.5], 1), value2: null, unit: 'cm' }] }
      }
      case 'weight': {
        const w = ctx.patientWeight ?? 70
        return { kind: 'vitals', readings: [{ type: 'weight', value: between([w - 0.6, w + 0.6], 1), value2: null, unit: 'kg' }] }
      }
      case 'ecg': {
        const hr = between(p.hr)
        return {
          kind: 'ecg',
          samples: generateEcg({ heartRate: hr, stShift: p.stShift }),
          sample_rate: 250,
          heart_rate: hr,
          duration_s: 10,
          hint: p.hint,
        }
      }
      case 'stethoscope':
        return { kind: 'media', media: 'stethoscope', label: 'Auscultation cardiaque — foyer aortique', params: { hr: between(p.hr) } }
      case 'scope':
        return { kind: 'media', media: 'scope', label: 'Examen otoscopique — oreille droite', params: { variant: Math.floor(Math.random() * 1000) } }
    }
  }
}

export const kalyCart: KalyCartDriver = new SimulatedKalyCart()
