import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX, Wifi, WifiOff } from '@/components/ui/icons'
import { Avatar } from '@/components/ui/Avatar'
import { useAudioLevel, useElapsed, useLocalMedia, usePeerRoom } from '@/lib/rtc/hooks'
import type { Participant } from '@/lib/rtc/PeerRoom'
import { cn } from '@/lib/utils'

/**
 * Video area. Demo implementation (no server): real camera/mic on each side and
 * real WebRTC between tabs of the same browser. Until the other side joins, the
 * stage shows who is expected. With the server phase, `usePeerRoom` is replaced
 * by a LiveKit room.
 */
export function VideoStage({
  room,
  me,
  live,
  offline,
  startedAt,
  expected,
  idleText = 'La vidéo démarre quand la consultation commence',
  onHangup,
  hangupLabel = 'Terminer',
  compact,
  className,
}: {
  room: string
  me: Participant
  live: boolean
  offline?: boolean
  startedAt?: string | null
  /** Who is expected on the other side (shown until they join). */
  expected: { name: string; caption: string }
  idleText?: string
  onHangup?: () => void
  hangupLabel?: string
  compact?: boolean
  className?: string
}) {
  const active = live && !offline
  const local = useLocalMedia(active)
  const { peers, room: roomRef } = usePeerRoom(room, me, local.stream, active)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [speakerOn, setSpeakerOn] = useState(false)
  const elapsed = useElapsed(active ? startedAt : null)
  const micLevel = useAudioLevel(local.stream, active && micOn)

  useEffect(() => {
    roomRef.current?.setMedia(micOn, camOn)
  }, [micOn, camOn, roomRef, peers.length])

  const main = peers[0]
  const others = peers.slice(1)

  return (
    <div className={cn('relative flex flex-col overflow-hidden bg-night text-night-ink', compact ? 'rounded-md' : 'min-h-[320px] rounded-md border border-night-3', className)}>
      {/* Remote */}
      <div className="relative min-h-0 flex-1">
        {active && main ? (
          <>
            {/* Always mounted so the remote audio keeps playing when the camera is off. */}
            {main.stream && <MediaVideo stream={main.stream} muted={!speakerOn} className="absolute inset-0 size-full object-cover" />}
            {(!main.stream || !main.cam) && (
              <div className="absolute inset-0 bg-night">
                <CenteredPerson name={main.name} caption={main.stream ? 'Caméra coupée' : 'Connexion en cours…'} pulse />
              </div>
            )}
          </>
        ) : (
          <CenteredPerson
            name={expected.name}
            caption={offline ? 'Connexion perdue — les mesures restent enregistrées localement' : active ? `En attente de connexion · ${expected.caption}` : idleText}
            pulse={active}
          />
        )}

        {/* Extra participants (mesh of 3) */}
        {active && others.length > 0 && (
          <div className="absolute top-14 left-4 z-10 flex flex-col gap-2">
            {others.map((p) => (
              <div key={p.id} className="relative aspect-video w-36 overflow-hidden rounded-xl border border-night-3 bg-night-2">
                {p.stream && p.cam ? <MediaVideo stream={p.stream} muted={!speakerOn} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><Avatar name={p.name} size="sm" /></div>}
                <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold drop-shadow">{p.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
          <Chip>
            {active ? (
              <>
                <span className="size-2 animate-pulse rounded-full bg-danger" /> En direct · {elapsed}
              </>
            ) : offline ? (
              <>
                <WifiOff className="size-3.5" /> Hors ligne
              </>
            ) : (
              'Salle non démarrée'
            )}
          </Chip>
          {active && (
            <div className="flex items-center gap-1.5">
              {main && <Chip>{main.name}{!main.mic && <MicOff className="size-3 text-danger" />}</Chip>}
              <Chip title="Qualité réseau">
                <Wifi className="size-3.5 text-success" />
                {!compact && 'Bonne'}
              </Chip>
            </div>
          )}
        </div>

        {/* Local preview */}
        {active && local.stream && (
          <div className={cn('absolute right-3 z-10 overflow-hidden rounded-xl border border-night-3 bg-night-2 shadow-lg', compact ? 'bottom-3 aspect-[3/4] w-24' : 'bottom-3 aspect-video w-44')}>
            {camOn && local.hasVideo ? (
              <MediaVideo stream={local.stream} muted mirror className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Avatar name={me.name} size="sm" />
              </div>
            )}
            <div className="absolute inset-x-1.5 bottom-1.5 flex items-center gap-1">
              <span className="text-[10px] font-semibold text-white drop-shadow">Vous</span>
              {micOn && local.stream.getAudioTracks().length > 0 && (
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                  <span className="block h-full rounded-full bg-success transition-[width] duration-75" style={{ width: `${Math.round(micLevel * 100)}%` }} />
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {local.error && active && <p className="bg-warning/90 px-3 py-1 text-center text-[11px] font-semibold text-night">{local.error}</p>}

      {/* Controls */}
      <div className={cn('relative z-10 flex items-center justify-center gap-2.5 border-t border-night-2 bg-night/90', compact ? 'p-2.5' : 'p-3')}>
        <ControlButton active={micOn} onClick={() => setMicOn((v) => !v)} label={micOn ? 'Couper le micro' : 'Activer le micro'} disabled={!active}>
          {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
        </ControlButton>
        <ControlButton active={camOn} onClick={() => setCamOn((v) => !v)} label={camOn ? 'Couper la caméra' : 'Activer la caméra'} disabled={!active}>
          {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
        </ControlButton>
        <ControlButton
          active={speakerOn}
          onClick={() => setSpeakerOn((v) => !v)}
          label={speakerOn ? 'Couper le son' : 'Activer le son (casque conseillé sur un même ordinateur)'}
          disabled={!active || peers.length === 0}
        >
          {speakerOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </ControlButton>
        {onHangup && (
          <button
            onClick={onHangup}
            disabled={!live}
            className="flex h-11 items-center gap-2 rounded-full bg-danger px-5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-40"
          >
            <PhoneOff className="size-4" /> {!compact && hangupLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function MediaVideo({ stream, muted, mirror, className }: { stream: MediaStream; muted: boolean; mirror?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream
  }, [stream])
  return <video ref={ref} autoPlay playsInline muted={muted} className={cn(mirror && '-scale-x-100', className)} />
}

function CenteredPerson({ name, caption, pulse }: { name: string; caption: string; pulse?: boolean }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className={cn('rounded-full', pulse && 'pulse-ring')}>
        <Avatar name={name} size="xl" className="ring-4 ring-night-2" />
      </div>
      <div>
        <p className="text-base font-semibold">{name}</p>
        <p className="mt-1 text-sm text-night-ink-2">{caption}</p>
      </div>
    </div>
  )
}

function Chip({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <div title={title} className={cn('flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold whitespace-nowrap backdrop-blur', className)}>
      {children}
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'flex size-11 items-center justify-center rounded-full transition disabled:opacity-40',
        active ? 'bg-night-2 text-night-ink hover:bg-night-3' : 'bg-night-ink text-night',
      )}
    >
      {children}
    </button>
  )
}
