import type { ReactNode } from 'react'
import type { Tone } from '@/lib/labels'
import { cn } from '@/lib/utils'

const TONES: Record<Tone, string> = {
  neutral: 'bg-canvas text-ink-2 border-transparent',
  primary: 'bg-primary-soft text-primary-dark border-transparent',
  olive: 'bg-success-soft text-olive-text border-transparent',
  success: 'bg-success-soft text-olive-text border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  info: 'bg-primary-soft text-primary-dark border-transparent',
}

const DOTS: Record<Tone, string> = {
  neutral: 'bg-ink-4',
  primary: 'bg-primary',
  olive: 'bg-success',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-primary',
}

/** Rectangular status tag, as in clinical systems. */
export function Badge({
  tone = 'neutral',
  dot,
  pulse,
  icon,
  className,
  children,
}: {
  tone?: Tone
  dot?: boolean
  pulse?: boolean
  icon?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5', TONES[tone], className)}>
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', DOTS[tone])} />}
          <span className={cn('relative size-1.5 rounded-full', DOTS[tone])} />
        </span>
      )}
      {icon}
      {children}
    </span>
  )
}
