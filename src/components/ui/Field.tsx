import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const base =
  'w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-4 transition-colors hover:border-ink-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-subtle disabled:opacity-70'

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: ReactNode }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {children}
      </label>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(base, 'h-10', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(base, 'min-h-20 py-2.5 leading-relaxed', className)} {...rest} />
})

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, 'h-10 cursor-pointer pr-8', className)} {...rest}>
      {children}
    </select>
  )
}
