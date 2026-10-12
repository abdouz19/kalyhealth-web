import { useEffect, useRef, useState } from 'react'
import { FileText, Paperclip } from '@/components/ui/icons'
import type { SessionFile } from '@/lib/types'
import { uploadSessionFile, type Sender } from '@/lib/api/mutations'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatBytes, formatTime } from '@/lib/utils'

export function SessionFiles({
  appointmentId,
  files,
  sender,
  disabled,
}: {
  appointmentId: number
  files: SessionFile[]
  sender: Sender
  disabled?: boolean
}) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<SessionFile | null>(null)

  async function onPick(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      await uploadSessionFile(sender, appointmentId, file)
      toast.success('Fichier partagé dans la session.')
    } catch (err) {
      toast.fail(err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scroll-thin flex-1 space-y-1.5 overflow-y-auto p-3">
        {files.length === 0 && <p className="py-6 text-center text-sm text-ink-3">Aucun fichier partagé.</p>}
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() => setPreview(f)}
            className="flex w-full items-center gap-3 rounded-md border border-line-light p-2 text-left transition-colors hover:bg-hover"
          >
            {f.mime.startsWith('image/') ? (
              <img src={f.data_url} alt="" className="size-9 shrink-0 rounded-lg border border-line-light bg-white object-cover" />
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle">
                <FileText className="size-5 text-ink-2" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{f.name}</p>
              <p className="text-xs text-ink-2">
                {f.uploaded_by_name} · {formatTime(f.created_at)} · {formatBytes(f.size)}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-line-light p-2">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" hidden onChange={(e) => onPick(e.target.files?.[0])} />
        <Button variant="secondary" className="w-full" icon={<Paperclip className="size-4" />} loading={uploading} disabled={disabled} onClick={() => inputRef.current?.click()}>
          Partager un document
        </Button>
      </div>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name ?? ''} className="max-w-2xl">
        {preview &&
          (preview.mime.startsWith('image/') ? (
            <img src={preview.data_url} alt={preview.name} className="mx-auto max-h-[70vh] rounded-lg" />
          ) : (
            <PdfPreview file={preview} />
          ))}
      </Modal>
    </div>
  )
}

/** Browsers block data: URLs in frames, so PDFs are shown through a blob URL. */
function PdfPreview({ file }: { file: SessionFile }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let objectUrl: string | null = null
    void fetch(file.data_url)
      .then((r) => r.blob())
      .then((b) => {
        objectUrl = URL.createObjectURL(b)
        setUrl(objectUrl)
      })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file.data_url])
  if (!url) return null
  return <iframe src={url} title={file.name} className="h-[70vh] w-full rounded-lg border border-line-light" />
}
