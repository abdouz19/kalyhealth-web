import { useMemo, useSyncExternalStore } from 'react'
import type { DbState } from '@/lib/types'
import { getOutbox, getView, isOnline, subscribe } from '@/lib/db/store'

export function useDbView(): DbState {
  return useSyncExternalStore(subscribe, getView)
}

/** Selects derived data from the current view; recomputed only when the view changes. */
export function useDb<T>(selector: (db: DbState) => T, deps: unknown[] = []): T {
  const view = useDbView()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selector(view), [view, ...deps])
}

export function useNetwork() {
  const online = useSyncExternalStore(subscribe, isOnline)
  const outbox = useSyncExternalStore(subscribe, getOutbox)
  return { online, outbox }
}
