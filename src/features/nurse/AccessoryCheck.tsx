import { useState } from 'react'
import { CircleCheck, PackageCheck, TriangleAlert } from '@/components/ui/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, todayIso } from '@/lib/utils'

/**
 * Pre-session check of the cart / case accessories (cahier §5.3 « vérifier la
 * disponibilité du dispositif et des accessoires connectés »).
 * Stock levels are simulated; the nurse's ticks are kept for the day in this tab.
 */

type Level = 'ok' | 'low' | 'missing'

interface Accessory {
  id: string
  label: string
  detail: string
  level: Level
}

const COMMON: Accessory[] = [
  { id: 'cuff', label: 'Brassards tensiomètre', detail: 'Adulte M + L, enfant', level: 'ok' },
  { id: 'spo2', label: 'Capteur SpO₂', detail: 'Pince doigt adulte et pédiatrique', level: 'ok' },
  { id: 'thermo', label: 'Protège-sondes thermomètre', detail: '38 restants', level: 'ok' },
  { id: 'ecg', label: 'Électrodes ECG', detail: '6 restantes, commander un lot', level: 'low' },
  { id: 'otoscope', label: 'Embouts otoscope', detail: 'Usage unique, 40 restants', level: 'ok' },
  { id: 'steth', label: 'Stéthoscope numérique', detail: 'Membrane propre, batterie 80 %', level: 'ok' },
  { id: 'hygiene', label: 'Lingettes désinfectantes', detail: 'Entre chaque patient', level: 'ok' },
]

const GO_ONLY: Accessory[] = [
  { id: 'router', label: 'Routeur 4G', detail: 'Carte SIM active, signal variable', level: 'ok' },
  { id: 'powerbank', label: 'Batterie externe', detail: 'Chargée à 45 %', level: 'low' },
]

function accessoriesFor(mode: 'cart' | 'go') {
  return mode === 'go' ? [...COMMON, ...GO_ONLY] : COMMON
}

const LEVEL: Record<Level, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  ok: { label: 'Disponible', tone: 'success' },
  low: { label: 'Stock faible', tone: 'warning' },
  missing: { label: 'Manquant', tone: 'danger' },
}

function storageKey(serial: string) {
  return `kaly.accessories.${serial}.${todayIso()}`
}

function readChecked(serial: string): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey(serial)) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function AccessoryCheck({ serial, mode }: { serial: string; mode: 'cart' | 'go' }) {
  const items = accessoriesFor(mode)
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(() => new Set(readChecked(serial)))
  const done = items.filter((i) => checked.has(i.id)).length
  const complete = done === items.length
  const lowCount = items.filter((i) => i.level !== 'ok').length

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        sessionStorage.setItem(storageKey(serial), JSON.stringify([...next]))
      } catch {
        /* demo convenience only */
      }
      return next
    })
  }

  function checkAll() {
    const all = new Set(items.map((i) => i.id))
    setChecked(all)
    try {
      sessionStorage.setItem(storageKey(serial), JSON.stringify([...all]))
    } catch {
      /* demo convenience only */
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors',
          complete ? 'border-success/30 bg-success-soft text-olive-text' : 'border-warning/30 bg-warning-soft text-warning hover:brightness-95',
        )}
        title="Vérifier les accessoires avant la séance"
      >
        {complete ? <CircleCheck className="size-3.5" /> : <PackageCheck className="size-3.5" />}
        Accessoires {done}/{items.length}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Accessoires — ${mode === 'go' ? 'valise KalyGo' : 'chariot KalyCart'} ${serial}`}
        footer={
          <>
            {!complete && (
              <Button variant="secondary" onClick={checkAll}>
                Tout est vérifié
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>Fermer</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-2">Cochez chaque élément une fois contrôlé sur le {mode === 'go' ? 'kit' : 'chariot'}.</p>
        {lowCount > 0 && (
          <p className="mb-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-warning">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {lowCount} élément{lowCount > 1 ? 's' : ''} à réapprovisionner. La séance peut avoir lieu, signalez-le au référent matériel.
          </p>
        )}
        <ul className="divide-y divide-line-light rounded-md border border-line">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-hover">
                <input type="checkbox" checked={checked.has(item.id)} onChange={() => toggle(item.id)} className="size-4 accent-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-ink-3">{item.detail}</span>
                </span>
                <Badge tone={LEVEL[item.level].tone}>{LEVEL[item.level].label}</Badge>
              </label>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
