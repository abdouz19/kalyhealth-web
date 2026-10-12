import { useEffect, useRef, useState } from 'react'

/**
 * Draws an ECG strip on ECG-paper grid. Animates a sweep when a new recording
 * arrives so the remote doctor "sees" the trace come in.
 */
export function EcgViewer({
  recordingId,
  samples,
  sampleRate,
  height = 150,
  animate = true,
}: {
  recordingId: string
  samples: number[]
  sampleRate: number
  height?: number
  animate?: boolean
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const duration = samples.length / sampleRate
    const pxPerSec = width / duration
    const mvRange = 2.4 // visible window: -0.8 … +1.6 mV
    const pxPerMv = height / mvRange
    const baseline = height * (1.6 / mvRange)

    function drawGrid() {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      const smallX = pxPerSec * 0.04
      const smallY = pxPerMv * 0.1
      ctx.lineWidth = 0.5
      ctx.strokeStyle = 'rgba(214,72,72,0.14)'
      ctx.beginPath()
      for (let x = 0; x < width; x += smallX) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let y = baseline % smallY; y < height; y += smallY) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(214,72,72,0.32)'
      ctx.beginPath()
      for (let x = 0; x < width; x += smallX * 5) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let y = baseline % (smallY * 5); y < height; y += smallY * 5) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()
    }

    function drawTrace(upTo: number) {
      ctx.lineWidth = 1.6
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#17212b'
      ctx.beginPath()
      for (let i = 0; i < upTo; i++) {
        const x = (i / sampleRate) * pxPerSec
        const y = baseline - samples[i]! * pxPerMv
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    if (!animate) {
      drawGrid()
      drawTrace(samples.length)
      return
    }

    let raf = 0
    const start = performance.now()
    const sweepMs = 2200
    const frame = (t: number) => {
      const p = Math.min(1, (t - start) / sweepMs)
      drawGrid()
      drawTrace(Math.floor(samples.length * p))
      if (p < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // Re-run on a new recording or resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId, width, height])

  return (
    <div ref={wrapRef} className="w-full overflow-hidden rounded-xl border border-line-light">
      <canvas ref={canvasRef} style={{ width: '100%', height }} />
    </div>
  )
}
