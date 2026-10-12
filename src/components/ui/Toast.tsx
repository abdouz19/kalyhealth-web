import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

type Kind = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  kind: Kind
  message: string
}

const ToastContext = createContext<(kind: Kind, message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((kind: Kind, message: string) => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs, { id, kind, message }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3800)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-5 bottom-5 z-[60] flex w-[360px] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-2xl bg-surface px-4 py-3 text-sm shadow-lg',
              t.kind === 'success' && 'border-line border-l-success',
              t.kind === 'error' && 'border-line border-l-danger',
              t.kind === 'info' && 'border-line border-l-primary',
            )}
          >
            {t.kind === 'success' && <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />}
            {t.kind === 'error' && <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />}
            {t.kind === 'info' && <Info className="mt-0.5 size-4 shrink-0 text-info" />}
            <span className="text-ink">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const push = useContext(ToastContext)
  return {
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m),
    info: (m: string) => push('info', m),
    /** Shows the error message of a rejected action. */
    fail: (err: unknown) => push('error', err instanceof Error ? err.message : 'Une erreur est survenue.'),
  }
}
