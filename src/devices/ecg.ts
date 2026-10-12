/**
 * Synthetic single-lead ECG (sum-of-Gaussians model). Demo only — never a
 * clinical signal. Amplitudes in mV.
 */

interface Wave {
  /** Centre, as a fraction of a 1 s beat (scaled by RR). */
  at: number
  amp: number
  width: number
  /** T wave: position and width follow the RR interval. */
  isT?: boolean
}

const BASE_WAVES: Wave[] = [
  { at: 0.12, amp: 0.15, width: 0.025 }, // P
  { at: 0.235, amp: -0.12, width: 0.01 }, // Q
  { at: 0.26, amp: 1.2, width: 0.012 }, // R
  { at: 0.285, amp: -0.25, width: 0.012 }, // S
  { at: 0.5, amp: 0.3, width: 0.05, isT: true }, // T
]

function gauss(x: number, mu: number, sigma: number) {
  const d = (x - mu) / sigma
  return Math.exp(-0.5 * d * d)
}

export interface EcgOptions {
  heartRate: number
  durationS?: number
  sampleRate?: number
  /** ST-segment shift in mV (positive = elevation). */
  stShift?: number
}

export function generateEcg({ heartRate, durationS = 10, sampleRate = 250, stShift = 0 }: EcgOptions) {
  const n = Math.round(durationS * sampleRate)
  const samples = new Array<number>(n).fill(0)

  // Beat start times with mild heart-rate variability.
  const beats: Array<{ start: number; rr: number }> = []
  let t = 0.1
  while (t < durationS + 1) {
    const rr = (60 / heartRate) * (1 + (Math.random() - 0.5) * 0.06)
    beats.push({ start: t, rr })
    t += rr
  }

  for (const { start, rr } of beats) {
    const qtScale = Math.sqrt(rr) // T wave follows Bazett-ish scaling
    const from = Math.max(0, Math.floor((start - 0.05) * sampleRate))
    const to = Math.min(n, Math.ceil((start + rr + 0.3) * sampleRate))
    for (let i = from; i < to; i++) {
      const x = i / sampleRate - start
      let v = 0
      for (const w of BASE_WAVES) {
        const scale = w.isT ? qtScale : 1
        v += w.amp * gauss(x, w.at * scale, w.width * scale)
      }
      if (stShift) v += stShift * gauss(x, 0.36 * qtScale, 0.06)
      samples[i]! += v
    }
  }

  for (let i = 0; i < n; i++) {
    const s = i / sampleRate
    samples[i] = +(samples[i]! + 0.05 * Math.sin(2 * Math.PI * 0.25 * s) + (Math.random() - 0.5) * 0.02).toFixed(3)
  }
  return samples
}
