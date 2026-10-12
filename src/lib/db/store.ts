import type { DbState } from '@/lib/types'
import { applyOps, insert, type Op } from '@/lib/db/ops'
import { createSeed } from '@/lib/db/seed'
import { nowIso, shortRequestId, todayIso, uid } from '@/lib/utils'

/**
 * Client-side mock of the backend.
 *
 * - `db`      : shared "server" state, persisted in localStorage and broadcast
 *               to other tabs (stands in for Supabase Postgres + Realtime).
 * - `outbox`  : writes made while this tab is offline (KalyGo), persisted in
 *               IndexedDB and replayed on reconnect.
 * - `network` : per-tab simulated connectivity.
 *
 * Open the doctor space and the nurse space in two tabs: changes propagate live.
 */

// v2: in-person mode, week agenda and follow-up added to the seed.
const DB_KEY = 'kaly.db.v2'
const NETWORK_KEY = 'kaly.network.v1'
const OUTBOX_DB = 'kaly-offline-demo'
const OUTBOX_STORE = 'outbox'
const OUTBOX_TAB_KEY = 'kaly.outbox.tab.v1'
const outboxTabId = sessionStorage.getItem(OUTBOX_TAB_KEY) ?? uid()
sessionStorage.setItem(OUTBOX_TAB_KEY, outboxTabId)
const OUTBOX_RECORD = `pending:${outboxTabId}`

export interface OutboxEntry {
  client_id: string
  created_at: string
  label: string
  ops: Op[]
}

type Listener = () => void

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn('[store] persist failed', err)
  }
}

function loadDb(): DbState {
  const saved = readJson<DbState>(localStorage, DB_KEY)
  const fresh = createSeed()
  // Re-seed each day so demo appointments stay "today".
  if (saved && saved.seeded_for === todayIso()) {
    // Tables added after the data was saved start empty.
    for (const key of Object.keys(fresh) as Array<keyof DbState>) {
      if (saved[key] === undefined) (saved as unknown as Record<string, unknown>)[key] = fresh[key]
    }
    // Make newly added demo accounts available to existing same-day browser seeds.
    const knownStaffIds = new Set(saved.staff.map((member) => member.id))
    saved.staff = [...saved.staff, ...fresh.staff.filter((member) => !knownStaffIds.has(member.id))]
    return saved
  }
  writeJson(localStorage, DB_KEY, fresh)
  return fresh
}

let db: DbState = loadDb()
let outbox: OutboxEntry[] = []
let online: boolean = (sessionStorage.getItem(NETWORK_KEY) ?? 'online') === 'online'
let resetBeforeHydration = false

function openOutboxDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(OUTBOX_DB, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(OUTBOX_STORE)) {
          request.result.createObjectStore(OUTBOX_STORE)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      request.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function readPersistentOutbox(): Promise<OutboxEntry[] | null> {
  const database = await openOutboxDb()
  if (!database) return null
  return new Promise((resolve) => {
    try {
      const request = database.transaction(OUTBOX_STORE, 'readonly').objectStore(OUTBOX_STORE).get(OUTBOX_RECORD)
      request.onsuccess = () => {
        database.close()
        resolve(Array.isArray(request.result) ? request.result as OutboxEntry[] : [])
      }
      request.onerror = () => {
        database.close()
        resolve(null)
      }
    } catch {
      database.close()
      resolve(null)
    }
  })
}

async function persistOutbox(entries: OutboxEntry[]) {
  // Keep a small fallback for browsers where IndexedDB is unavailable.
  writeJson(sessionStorage, 'kaly.outbox.fallback.v1', entries)
  const database = await openOutboxDb()
  if (!database) return
  await new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(OUTBOX_STORE, 'readwrite')
      transaction.objectStore(OUTBOX_STORE).put(entries, OUTBOX_RECORD)
      transaction.oncomplete = () => { database.close(); resolve() }
      transaction.onerror = () => { database.close(); resolve() }
      transaction.onabort = () => { database.close(); resolve() }
    } catch {
      database.close()
      resolve()
    }
  })
}

let outboxPersistence = Promise.resolve()
function queueOutboxPersistence(entries: OutboxEntry[]) {
  outboxPersistence = outboxPersistence.catch(() => undefined).then(() => persistOutbox(entries))
  return outboxPersistence
}

const outboxReady = readPersistentOutbox().then((saved) => {
  if (resetBeforeHydration) {
    outbox = []
    void queueOutboxPersistence(outbox)
    emit()
    return
  }
  const fallback = readJson<OutboxEntry[]>(sessionStorage, 'kaly.outbox.fallback.v1') ?? []
  const merged = [...(saved ?? []), ...outbox, ...fallback]
  outbox = [...new Map(merged.map((entry) => [entry.client_id, entry])).values()]
  if (outbox.length > 0) void queueOutboxPersistence(outbox)
  emit()
})

const listeners = new Set<Listener>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kaly-db') : null

function emit() {
  view = null
  listeners.forEach((l) => l())
}

function persistDb() {
  writeJson(localStorage, DB_KEY, db)
  channel?.postMessage('db:changed')
}

channel?.addEventListener('message', () => {
  db = loadDb()
  emit()
})

// ─── Read side ──────────────────────────────────────────────────────────────

let view: DbState | null = null

/** Server state with this tab's pending offline writes layered on top. */
export function getView(): DbState {
  if (!view) view = applyOps(db, outbox.flatMap((e) => e.ops))
  return view
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// ─── Network ────────────────────────────────────────────────────────────────

export function isOnline() {
  return online
}

export function getOutbox() {
  return outbox
}

export async function setOnline(value: boolean) {
  online = value
  sessionStorage.setItem(NETWORK_KEY, value ? 'online' : 'offline')
  emit()
  if (value) await flushOutbox()
}

export class OfflineError extends Error {
  constructor() {
    super('Hors ligne — action impossible sans connexion.')
    this.name = 'OfflineError'
  }
}

// ─── Write side ─────────────────────────────────────────────────────────────

/**
 * Commits operations. When the tab is offline and the write is
 * `offlineCapable`, it is queued in the outbox instead (KalyGo).
 */
export function commit(ops: Op[], opts: { offlineCapable?: boolean; label?: string } = {}) {
  if (!online) {
    if (!opts.offlineCapable) throw new OfflineError()
    outbox = [...outbox, { client_id: uid(), created_at: nowIso(), label: opts.label ?? 'Écriture', ops }]
    void queueOutboxPersistence(outbox)
    emit()
    return
  }
  db = applyOps(db, ops)
  persistDb()
  emit()
}

let flushing = false

/** Replays the outbox in order. Inserts are idempotent, so a retry is safe. */
export async function flushOutbox() {
  await outboxReady
  await outboxPersistence
  if (flushing || outbox.length === 0 || !online) return
  flushing = true
  try {
    const pending = outbox
    const ops = pending.flatMap((e) => e.ops)
    db = applyOps(db, [
      ...ops,
      insert('sync_logs', {
        id: uid(),
        request_id: shortRequestId(),
        appointment_id: null,
        entity: 'offline_batch',
        action: `Synchronisation différée KalyGo — ${pending.length} élément(s)`,
        status: 'success',
        target: 'myafia_mock',
        error: null,
        created_at: nowIso(),
      }),
    ])
    outbox = []
    await persistOutbox(outbox)
    persistDb()
    emit()
  } finally {
    flushing = false
  }
}

export function resetDemo() {
  db = createSeed()
  outbox = []
  online = true
  resetBeforeHydration = true
  void queueOutboxPersistence(outbox)
  sessionStorage.setItem(NETWORK_KEY, 'online')
  persistDb()
  emit()
}
