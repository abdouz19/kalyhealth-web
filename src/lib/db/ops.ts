import type { DbState, TableName } from '@/lib/types'

type Row = { id: string | number }

/** A write operation. Same shape whether it is applied now or queued offline. */
export type Op =
  | { kind: 'insert'; table: TableName; row: Row }
  | { kind: 'update'; table: TableName; id: string | number; patch: Record<string, unknown> }

export function insert<T extends TableName>(table: T, row: DbState[T][number]): Op {
  return { kind: 'insert', table, row: row as Row }
}

export function update<T extends TableName>(
  table: T,
  id: string | number,
  patch: Partial<DbState[T][number]>,
): Op {
  return { kind: 'update', table, id, patch: patch as Record<string, unknown> }
}

/**
 * Applies operations immutably. Inserts are idempotent (a row whose id already
 * exists is skipped), which makes replaying an offline outbox safe.
 */
export function applyOps(state: DbState, ops: Op[]): DbState {
  if (ops.length === 0) return state
  const next: DbState = { ...state }
  const touched = new Set<TableName>()

  for (const op of ops) {
    if (!touched.has(op.table)) {
      ;(next as Record<TableName, Row[]>)[op.table] = [...(state[op.table] as Row[])]
      touched.add(op.table)
    }
    const rows = (next as Record<TableName, Row[]>)[op.table]

    if (op.kind === 'insert') {
      if (!rows.some((r) => r.id === op.row.id)) rows.push(op.row)
    } else {
      const i = rows.findIndex((r) => r.id === op.id)
      if (i >= 0) rows[i] = { ...rows[i]!, ...op.patch }
    }
  }
  return next
}
