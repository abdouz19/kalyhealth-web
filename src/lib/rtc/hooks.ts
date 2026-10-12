import { useEffect, useRef, useState } from 'react'
import { PeerRoom, type Participant, type RemotePeer } from '@/lib/rtc/PeerRoom'

export interface LocalMedia {
  stream: MediaStream | null
  hasVideo: boolean
  error: string | null
}

/**
 * Camera + microphone. If the camera is refused we fall back to microphone
 * only, then to an empty stream, so the user can still join and see the others.
 */
export function useLocalMedia(enabled: boolean): LocalMedia {
  const [media, setMedia] = useState<LocalMedia>({ stream: null, hasVideo: false, error: null })

  useEffect(() => {
    if (!enabled) {
      setMedia({ stream: null, hasVideo: false, error: null })
      return
    }
    let cancelled = false
    let acquired: MediaStream | null = null
    const audio = { echoCancellation: true, noiseSuppression: true }

    async function acquire() {
      const md = navigator.mediaDevices
      try {
        return { stream: await md.getUserMedia({ video: { width: 640, height: 360 }, audio }), hasVideo: true, error: null }
      } catch {
        try {
          return { stream: await md.getUserMedia({ audio }), hasVideo: false, error: 'Caméra indisponible — vous rejoignez en audio seul' }
        } catch {
          return { stream: new MediaStream(), hasVideo: false, error: 'Caméra et micro indisponibles — autorisez-les dans le navigateur' }
        }
      }
    }

    void acquire().then((m) => {
      if (cancelled) return m.stream.getTracks().forEach((t) => t.stop())
      acquired = m.stream
      setMedia(m)
    })

    return () => {
      cancelled = true
      acquired?.getTracks().forEach((t) => t.stop())
    }
  }, [enabled])

  return media
}

/** Joins the tab-to-tab room while `enabled`; returns the remote participants. */
export function usePeerRoom(room: string, me: Participant, local: MediaStream | null, enabled: boolean) {
  const [peers, setPeers] = useState<RemotePeer[]>([])
  const roomRef = useRef<PeerRoom | null>(null)

  useEffect(() => {
    if (!enabled || !local) {
      setPeers([])
      return
    }
    const r = new PeerRoom(room, me, local)
    roomRef.current = r
    const off = r.onChange(setPeers)
    r.join()
    return () => {
      off()
      r.leave()
      roomRef.current = null
      setPeers([])
    }
    // `me` is identified by name/role; avoid rejoining on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, me.name, me.role, local, enabled])

  return { peers, room: roomRef }
}

/** 0..1 microphone level, sampled ~12 times per second. */
export function useAudioLevel(stream: MediaStream | null, enabled = true) {
  const [level, setLevel] = useState(0)
  useEffect(() => {
    const track = stream?.getAudioTracks()[0]
    if (!track || !enabled) {
      setLevel(0)
      return
    }
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(new MediaStream([track]))
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (const v of buf) sum += ((v - 128) / 128) ** 2
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4))
    }, 80)
    return () => {
      window.clearInterval(timer)
      void ctx.close()
    }
  }, [stream, enabled])
  return level
}

/** Elapsed mm:ss since an ISO timestamp. */
export function useElapsed(since: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!since) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [since])
  if (!since) return '00:00'
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
