/**
 * Synthesises heart sounds (S1 "lub", S2 "dub") with WebAudio so the demo can
 * "play" a stethoscope recording without shipping audio files. Demo only.
 */
export function playHeartSounds(heartRate: number, seconds = 8): () => void {
  const ctx = new AudioContext()
  const rr = 60 / heartRate
  const master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  function thump(at: number, freq: number, level: number, length: number) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, at)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, at + length)

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 260

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(level, at + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, at + length)

    osc.connect(env)
    noise.connect(lp).connect(env)
    env.connect(master)
    osc.start(at)
    noise.start(at)
    osc.stop(at + length + 0.02)
    noise.stop(at + length + 0.02)
  }

  const start = ctx.currentTime + 0.1
  for (let t = 0; t < seconds; t += rr) {
    thump(start + t, 120, 0.9, 0.11) // S1
    thump(start + t + Math.min(0.32, rr * 0.38), 150, 0.6, 0.08) // S2
  }

  const timer = window.setTimeout(() => void ctx.close(), (seconds + 0.5) * 1000)
  return () => {
    window.clearTimeout(timer)
    void ctx.close()
  }
}
