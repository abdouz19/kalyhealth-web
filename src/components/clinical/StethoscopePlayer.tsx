import { useEffect, useRef, useState } from 'react'
import { Play, Square } from '@/components/ui/icons'
import { playHeartSounds } from '@/devices/stethoscopeAudio'
import { cn } from '@/lib/utils'

const SECONDS = 8

export function StethoscopePlayer({ heartRate }: { heartRate: number }) {
  const [playing, setPlaying] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => () => stopRef.current?.(), [])

  function toggle() {
    if (playing) {
      stopRef.current?.()
      setPlaying(false)
      return
    }
    stopRef.current = playHeartSounds(heartRate, SECONDS)
    setPlaying(true)
    setTimeout(() => setPlaying(false), SECONDS * 1000)
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition',
          playing ? 'bg-ink text-bg' : 'bg-primary text-white hover:bg-primary-dark',
        )}
        aria-label={playing ? 'Arrêter' : 'Écouter'}
      >
        {playing ? <Square className="size-3.5" /> : <Play className="ml-0.5 size-4" />}
      </button>
      <div className="flex h-8 flex-1 items-center gap-[3px]">
        {Array.from({ length: 32 }, (_, i) => (
          <span
            key={i}
            className={cn('w-full rounded-full bg-primary/35', playing && 'animate-pulse')}
            style={{
              height: `${20 + Math.abs(Math.sin(i * 1.7)) * 80}%`,
              animationDelay: `${(i % 8) * 90}ms`,
            }}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-ink-2 tabular-nums">{heartRate} bpm</span>
    </div>
  )
}
