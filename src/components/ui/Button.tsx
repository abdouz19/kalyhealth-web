import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoaderCircle } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'olive' | 'danger' | 'dark'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white border border-primary-dark/40 hover:bg-primary-dark',
  secondary: 'bg-surface text-ink border border-line hover:bg-subtle',
  ghost: 'text-ink-2 border border-transparent hover:bg-hover hover:text-ink',
  olive: 'bg-success text-white border border-success hover:brightness-95',
  danger: 'bg-danger text-white border border-danger hover:brightness-95',
  dark: 'bg-chrome-2 text-white border border-chrome-2 hover:bg-chrome',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[13px] gap-1.5 [&_svg]:size-4',
  md: 'h-9 px-4 text-sm gap-2 [&_svg]:size-4',
  lg: 'h-11 px-5 text-sm gap-2 [&_svg]:size-[18px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
})
