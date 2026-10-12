import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Building2, Info, MessageSquare, NotebookPen, Paperclip, Video } from '@/components/ui/icons'
import { useUser } from '@/lib/auth/AuthContext'
import { useAppointmentDetail } from '@/lib/api/queries'
import { startConsultation } from '@/lib/api/mutations'
import { MODE_LABEL, STATUS_LABEL, STATUS_TONE, isAssisted } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { VideoStage } from '@/components/video/VideoStage'
import { PatientBanner } from '@/components/clinical/PatientBanner'
import { SessionChat } from '@/components/clinical/SessionChat'
import { SessionFiles } from '@/components/clinical/SessionFiles'
import { PatientPanel } from '@/features/doctor/PatientPanel'
import { DevicesPanel } from '@/features/doctor/DevicesPanel'
import { ClosurePanel } from '@/features/doctor/ClosurePanel'
import { cn } from '@/lib/utils'

type Tab = 'chat' | 'files' | 'notes'

/** Consultation workspace: summary | video | live vitals, then the consultation note. */
export function WorkspacePage() {
  const { id } = useParams()
  const appointmentId = Number(id)
  const user = useUser()
  const toast = useToast()
  const detail = useAppointmentDetail(appointmentId)
  const [tab, setTab] = useState<Tab>('chat')
  const [notes, setNotes] = useNotesDraft(appointmentId)
  const [starting, setStarting] = useState(false)
  const closureRef = useRef<HTMLDivElement>(null)

  if (!detail) {
    return (
      <div className="p-6 text-sm">
        <p className="text-ink-2">Rendez-vous introuvable.</p>
        <Link to="/doctor/appointments" className="mt-2 inline-block text-primary underline">
          Retour à l’agenda
        </Link>
      </div>
    )
  }

  const { appointment, session } = detail
  const { patient } = appointment
  const assisted = isAssisted(appointment.mode)
  const inPerson = appointment.mode === 'in_person'
  const live = appointment.status === 'in_consultation'
  const completed = appointment.status === 'completed'
  const canStart = inPerson ? appointment.status === 'arrived' : appointment.status === 'waiting_room' || appointment.status === 'ready'
  const where = appointment.mode === 'assisted_go'
    ? `KalyGo, ${appointment.mission?.location}`
    : inPerson
      ? appointment.doctor.site
      : appointment.site?.name
  const remoteName = assisted ? `${patient.fullname} et l’infirmier` : patient.fullname
  const remoteCaption = assisted ? `depuis ${where}` : 'depuis l’application MyAfia'

  async function start() {
    setStarting(true)
    try {
      await startConsultation(user, appointmentId)
    } catch (err) {
      toast.fail(err)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-full">
      <PatientBanner
        patient={patient}
        backTo="/doctor/appointments"
        context={
          <div className="text-right text-[13px]">
            <p className="font-medium">
              {MODE_LABEL[appointment.mode]}
              {where && <span className="font-normal text-ink-2">, {where}</span>}
            </p>
            <p className="text-ink-3">
              RDV {appointment.time}, n° {appointment.appoint_number}
            </p>
          </div>
        }
        actions={
          <>
            <Badge tone={STATUS_TONE[appointment.status]} dot pulse={live || canStart}>
              {STATUS_LABEL[appointment.status]}
            </Badge>
            {canStart && (
              <Button loading={starting} icon={inPerson ? <Building2 className="size-3.5" /> : <Video className="size-3.5" />} onClick={start}>
                {inPerson ? 'Recevoir le patient' : 'Démarrer la consultation'}
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-3 p-3">
        {assisted && !live && !completed && !canStart && (
          <div className="flex items-center gap-2 rounded-md border border-primary/25 bg-primary-soft px-3 py-2 text-[13px] text-primary-dark">
            <Info className="size-4" />
            Patient en préparation par l’infirmier ({STATUS_LABEL[appointment.status].toLowerCase()}). Vous serez alerté quand il sera prêt.
          </div>
        )}

        <div className={cn('grid gap-3', assisted ? 'xl:grid-cols-[280px_minmax(0,1fr)_380px]' : 'xl:grid-cols-[280px_minmax(0,1fr)]')}>
          <aside className="scroll-thin self-start xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto">
            <PatientPanel detail={detail} />
          </aside>

          <div className="flex min-w-0 flex-col gap-3">
            {inPerson ? (
              <OfficeVisit status={appointment.status} place={where} onConclude={() => closureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
            ) : (
              <VideoStage
                room={`appt-${appointmentId}`}
                me={{ name: user.fullname, role: 'doctor' }}
                live={live}
                startedAt={session?.started_at}
                expected={{ name: remoteName, caption: remoteCaption }}
                onHangup={() => closureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                hangupLabel="Conclure"
                className="h-[320px] sm:h-[420px]"
              />
            )}

            <Card className="flex h-[320px] flex-col overflow-hidden">
              <div className="flex gap-1 border-b border-line-light p-2">
                {!inPerson && <TabButton active={tab === 'chat'} onClick={() => setTab('chat')} icon={<MessageSquare className="size-3.5" />} label="Messages" count={detail.messages.length} />}
                <TabButton active={tab === 'files'} onClick={() => setTab('files')} icon={<Paperclip className="size-3.5" />} label="Documents" count={detail.files.length} />
                <TabButton active={tab === 'notes' || (tab === 'chat' && inPerson)} onClick={() => setTab('notes')} icon={<NotebookPen className="size-3.5" />} label="Notes cliniques" />
              </div>
              <div className="min-h-0 flex-1">
                {tab === 'chat' && !inPerson && <SessionChat appointmentId={appointmentId} messages={detail.messages} sender={user} disabled={completed} />}
                {tab === 'files' && <SessionFiles appointmentId={appointmentId} files={detail.files} sender={user} disabled={completed} />}
                {(tab === 'notes' || (tab === 'chat' && inPerson)) && (
                  <div className="flex h-full flex-col p-3">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={completed}
                      placeholder="Observations, examen clinique… Le brouillon est enregistré automatiquement et joint au compte rendu."
                      className="flex-1 resize-none"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {assisted && (
            <aside className="scroll-thin self-start xl:sticky xl:top-[76px] xl:max-h-[calc(100vh-140px)] xl:overflow-y-auto">
              <DevicesPanel detail={detail} canRequest={!completed} />
            </aside>
          )}
        </div>

        <div ref={closureRef} className="scroll-mt-20">
          <ClosurePanel detail={detail} notes={notes} live={live} />
        </div>
      </div>
    </div>
  )
}

/** In-person visit: no video room, the screen keeps the record and the note. */
function OfficeVisit({ status, place, onConclude }: { status: string; place?: string; onConclude: () => void }) {
  const text =
    status === 'in_consultation'
      ? 'Consultation en cours au cabinet. Rédigez la note puis signez-la pour l’envoyer à MyAfia.'
      : status === 'arrived'
        ? 'Le patient est arrivé à l’accueil. Cliquez sur « Recevoir le patient » pour ouvrir la consultation.'
        : status === 'completed'
          ? 'Consultation terminée, compte rendu versé au dossier MyAfia.'
          : 'Rendez-vous au cabinet. Le statut passera à « Au cabinet » quand le patient sera enregistré à l’accueil.'
  return (
    <Card className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-subtle text-ink-2">
        <Building2 className="size-6" />
      </span>
      <div>
        <p className="font-semibold">Consultation en présentiel{place ? `, ${place}` : ''}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">{text}</p>
      </div>
      {status === 'in_consultation' && (
        <Button variant="secondary" onClick={onConclude}>
          Aller à la note de consultation
        </Button>
      )}
    </Card>
  )
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors [&_svg]:size-4',
        active ? 'bg-primary-soft text-primary-dark' : 'text-ink-2 hover:bg-canvas hover:text-ink',
      )}
    >
      {icon}
      {label}
      {!!count && <span className="rounded-full bg-canvas px-1.5 text-[11px] tabular-nums">{count}</span>}
    </button>
  )
}

function useNotesDraft(appointmentId: number) {
  const key = `kaly.notes.${appointmentId}`
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem(key) ?? ''
    } catch {
      return ''
    }
  })
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, notes)
      } catch {
        /* ignore */
      }
    }, 400)
    return () => clearTimeout(t)
  }, [key, notes])
  return [notes, setNotes] as const
}
