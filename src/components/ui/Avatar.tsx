import { cn, initials } from '@/lib/utils'

/** Initials tile (stands in for the MyAfia photo). */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; round?: boolean; className?: string }) {
  const sizes = { sm: 'size-7 text-[11px]', md: 'size-9 text-xs', lg: 'size-12 text-sm', xl: 'size-20 text-xl' }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-dark',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}
