import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from '@/components/ui/icons'
import type { SessionMessage } from '@/lib/types'
import { sendMessage, type Sender } from '@/lib/api/mutations'
import { useToast } from '@/components/ui/Toast'
import { cn, formatTime } from '@/lib/utils'

/** In-session chat (distinct from MyAfia async messaging). */
export function SessionChat({
  appointmentId,
  messages,
  sender,
  disabled,
}: {
  appointmentId: number
  messages: SessionMessage[]
  sender: Sender
  disabled?: boolean
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await sendMessage(sender, appointmentId, text)
      setText('')
    } catch (err) {
      toast.fail(err)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="scroll-thin flex-1 space-y-2.5 overflow-y-auto p-3">
        {messages.length === 0 && <p className="py-6 text-center text-sm text-ink-3">Aucun message dans cette session.</p>}
        {messages.map((m) => {
          const mine = m.sender_role === sender.role && m.sender_name === sender.fullname
          return (
            <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px]', mine ? 'bg-primary-soft text-ink' : 'border border-line-light bg-subtle text-ink')}>
                {m.body}
              </div>
              <span className="mt-1 text-[11px] text-ink-3">
                {mine ? 'Vous' : m.sender_name} · {formatTime(m.created_at)}
              </span>
            </div>
          )
        })}
      </div>
      <form onSubmit={onSubmit} className="flex gap-1.5 border-t border-line-light p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? 'Session non démarrée' : 'Écrire un message…'}
          className="h-10 flex-1 rounded-full border border-transparent bg-canvas px-4 text-sm focus:border-primary focus:bg-surface focus:outline-none disabled:bg-subtle disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
          aria-label="Envoyer"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  )
}
