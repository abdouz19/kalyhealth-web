import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-night/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn('relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-xl', className)}
      >
        <div className="flex items-center justify-between border-b border-line-light px-5 py-3.5">
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-3 hover:bg-canvas hover:text-ink" aria-label="Fermer">
            <X className="size-5" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line-light px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
