import { useState } from 'react'
import { CloudOff, CloudUpload, Wifi, WifiOff } from '@/components/ui/icons'
import { setOnline } from '@/lib/db/store'
import { useNetwork } from '@/lib/db/useDb'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

/**
 * Demo control for KalyGo: simulates losing the network. While offline, nurse
 * writes are kept in the local outbox and replayed on reconnect.
 */
export function NetworkToggle({ compact }: { compact?: boolean }) {
  const { online, outbox } = useNetwork()
  const toast = useToast()
  const [syncing, setSyncing] = useState(false)

  async function toggle() {
    if (online) {
      await setOnline(false)
      toast.info('Réseau coupé. Les données sont conservées localement.')
      return
    }
    const n = outbox.length
    setSyncing(true)
    await setOnline(true)
    setSyncing(false)
    toast.success(n > 0 ? `Réseau rétabli — ${n} élément(s) synchronisé(s) vers MyAfia.` : 'Réseau rétabli.')
  }

  return (
    <button
      onClick={toggle}
      title="Changer l’état du réseau"
      className={cn(
        'flex items-center gap-2 rounded-full border text-sm font-semibold transition',
        compact ? 'h-9 px-3' : 'h-11 px-4',
        online ? 'border-success/30 bg-success-soft text-success' : 'border-danger/30 bg-danger-soft text-danger',
      )}
    >
      {syncing ? <CloudUpload className="size-4 animate-pulse" /> : online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
      {online ? 'En ligne' : 'Hors ligne'}
      {!online && outbox.length > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-xs text-white">
          <CloudOff className="size-3" />
          {outbox.length}
        </span>
      )}
      <span className="text-xs font-medium opacity-70">· {online ? 'couper' : 'rétablir'}</span>
    </button>
  )
}
