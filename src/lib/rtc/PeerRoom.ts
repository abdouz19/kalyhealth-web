import { uid } from '@/lib/utils'

/**
 * Serverless video room for the demo: real WebRTC peer connections between
 * tabs of the same browser, with BroadcastChannel as the signalling channel.
 *
 * Same contract the LiveKit room will have later (join / leave / participants /
 * mic-cam state), so `VideoStage` will only swap the implementation.
 *
 * Topology: full mesh. The newcomer announces itself (`hello`); every peer
 * already in the room sends it an offer — so there is never offer glare.
 */

type SignalType = 'hello' | 'offer' | 'answer' | 'ice' | 'bye' | 'state'

interface Signal {
  room: string
  from: string
  to?: string
  type: SignalType
  name?: string
  role?: string
  mic?: boolean
  cam?: boolean
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

export interface Participant {
  name: string
  role: string
}

export interface RemotePeer extends Participant {
  id: string
  stream: MediaStream | null
  state: RTCPeerConnectionState
  mic: boolean
  cam: boolean
}

interface PeerEntry {
  pc: RTCPeerConnection
  info: RemotePeer
  pendingIce: RTCIceCandidateInit[]
}

export class PeerRoom {
  readonly id = uid()
  private readonly room: string
  private readonly me: Participant
  private readonly local: MediaStream
  private readonly channel: BroadcastChannel
  private readonly peers = new Map<string, PeerEntry>()
  private readonly listeners = new Set<(peers: RemotePeer[]) => void>()
  private mic = true
  private cam = true
  private closed = false

  constructor(room: string, me: Participant, local: MediaStream) {
    this.room = room
    this.me = me
    this.local = local
    this.channel = new BroadcastChannel('kaly-rtc')
    this.channel.onmessage = (e: MessageEvent<Signal>) => void this.handle(e.data)
    window.addEventListener('beforeunload', this.leave)
  }

  join() {
    this.send({ type: 'hello' })
  }

  leave = () => {
    if (this.closed) return
    this.closed = true
    this.send({ type: 'bye' })
    for (const { pc } of this.peers.values()) pc.close()
    this.peers.clear()
    this.channel.close()
    window.removeEventListener('beforeunload', this.leave)
    this.emit()
  }

  setMedia(mic: boolean, cam: boolean) {
    this.mic = mic
    this.cam = cam
    this.local.getAudioTracks().forEach((t) => (t.enabled = mic))
    this.local.getVideoTracks().forEach((t) => (t.enabled = cam))
    this.send({ type: 'state' })
  }

  onChange(cb: (peers: RemotePeer[]) => void) {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  // ─── internals ──────────────────────────────────────────────────────────

  private send(msg: Omit<Signal, 'room' | 'from' | 'name' | 'role' | 'mic' | 'cam'>) {
    if (this.closed && msg.type !== 'bye') return
    try {
      this.channel.postMessage({ ...msg, room: this.room, from: this.id, name: this.me.name, role: this.me.role, mic: this.mic, cam: this.cam } satisfies Signal)
    } catch {
      /* channel already closed */
    }
  }

  private emit() {
    const list = [...this.peers.values()].map((p) => ({ ...p.info }))
    this.listeners.forEach((l) => l(list))
  }

  private createPeer(remoteId: string, msg: Signal): PeerEntry {
    this.peers.get(remoteId)?.pc.close()
    const pc = new RTCPeerConnection({ iceServers: [] })
    const entry: PeerEntry = {
      pc,
      pendingIce: [],
      info: {
        id: remoteId,
        name: msg.name ?? 'Participant',
        role: msg.role ?? '',
        stream: null,
        state: 'new',
        mic: msg.mic ?? true,
        cam: msg.cam ?? true,
      },
    }
    this.local.getTracks().forEach((t) => pc.addTrack(t, this.local))
    pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ type: 'ice', to: remoteId, candidate: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      entry.info.stream = e.streams[0] ?? new MediaStream([e.track])
      this.emit()
    }
    pc.onconnectionstatechange = () => {
      entry.info.state = pc.connectionState
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        if (this.peers.get(remoteId) === entry) this.peers.delete(remoteId)
      }
      this.emit()
    }
    this.peers.set(remoteId, entry)
    this.emit()
    return entry
  }

  private async flushIce(entry: PeerEntry) {
    for (const c of entry.pendingIce.splice(0)) {
      try {
        await entry.pc.addIceCandidate(c)
      } catch {
        /* stale candidate */
      }
    }
  }

  private async handle(msg: Signal) {
    if (this.closed || msg.room !== this.room || msg.from === this.id) return
    if (msg.to && msg.to !== this.id) return

    try {
      switch (msg.type) {
        case 'hello': {
          const entry = this.createPeer(msg.from, msg)
          const offer = await entry.pc.createOffer()
          await entry.pc.setLocalDescription(offer)
          this.send({ type: 'offer', to: msg.from, sdp: entry.pc.localDescription!.toJSON() })
          break
        }
        case 'offer': {
          const entry = this.createPeer(msg.from, msg)
          await entry.pc.setRemoteDescription(msg.sdp!)
          await this.flushIce(entry)
          const answer = await entry.pc.createAnswer()
          await entry.pc.setLocalDescription(answer)
          this.send({ type: 'answer', to: msg.from, sdp: entry.pc.localDescription!.toJSON() })
          break
        }
        case 'answer': {
          const entry = this.peers.get(msg.from)
          if (!entry) return
          await entry.pc.setRemoteDescription(msg.sdp!)
          await this.flushIce(entry)
          break
        }
        case 'ice': {
          const entry = this.peers.get(msg.from)
          if (!entry || !msg.candidate) return
          if (entry.pc.remoteDescription) await entry.pc.addIceCandidate(msg.candidate)
          else entry.pendingIce.push(msg.candidate)
          break
        }
        case 'state': {
          const entry = this.peers.get(msg.from)
          if (!entry) return
          entry.info.mic = msg.mic ?? true
          entry.info.cam = msg.cam ?? true
          this.emit()
          break
        }
        case 'bye': {
          this.peers.get(msg.from)?.pc.close()
          this.peers.delete(msg.from)
          this.emit()
          break
        }
      }
    } catch (err) {
      console.warn('[rtc] signalling error', msg.type, err)
    }
  }
}
