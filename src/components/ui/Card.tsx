import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** White rounded card on the grey canvas — same surface as the patient app. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl bg-surface', className)} {...rest} />
}

/** Card header: title on the left, tools on the right, hairline below. */
export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-h-12 items-center justify-between gap-3 rounded-t-xl border-b border-line-light px-4 py-2.5', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-4">{icon}</span>}
        <h3 className="truncate text-sm font-bold text-ink">{title}</h3>
        {subtitle && <span className="truncate text-xs text-ink-3">{subtitle}</span>}
      </div>
      {action}
    </div>
  )
}

/** Small section heading inside a panel. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-xs font-semibold text-ink-2', className)}>{children}</p>
}

/** Page title bar under the top chrome. */
export function PageHeader({ title, meta, actions }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-5 pb-1">
      <h1 className="text-[22px] font-bold tracking-tight text-ink">{title}</h1>
      {meta && <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-2">{meta}</div>}
      {actions && <div className="ml-auto flex max-w-full min-w-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
