import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, CloudOff, MapPin, Search, UserRound } from '@/components/ui/icons'
import { useUser } from '@/lib/auth/AuthContext'
import { searchPatients, useActiveMission, useDoctors, useMissionAppointments } from '@/lib/api/queries'
import { closeMission, createMission, startMissionCare } from '@/lib/api/mutations'
import { useDb, useNetwork } from '@/lib/db/useDb'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/labels'
import type { Mission } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, PageHeader } from '@/components/ui/Card'
import { Input, Label, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { NetworkToggle } from '@/features/nurse/NetworkToggle'
import { ageFrom, formatLongDate, formatTime } from '@/lib/utils'

const LOCATIONS = [
  { location: 'As Eyla', region: 'Dikhil' },
  { location: 'Randa', region: 'Tadjourah' },
  { location: 'Alaili Dadda', region: 'Obock' },
  { location: 'Ali Adde', region: 'Ali Sabieh' },
]

export function MissionPage() {
  const user = useUser()
  const mission = useActiveMission(user.id)
  return mission ? <ActiveMission mission={mission} /> : <NewMission />
}

function NewMission() {
  const user = useUser()
  const toast = useToast()
  const doctors = useDoctors()
  const [loc, setLoc] = useState(0)
  const [team, setTeam] = useState('Équipe mobile CNSS n°2')
  const [doctorId, setDoctorId] = useState(doctors.find((d) => d.speciality === 'Médecine générale')?.id ?? doctors[0]!.id)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createMission(user, { ...LOCATIONS[loc]!, team, doctor_id: doctorId })
    } catch (err) {
      toast.fail(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Mission KalyGo" meta={<span>{formatLongDate(new Date())}</span>} />
      <div className="max-w-3xl space-y-3 p-5">
      <p className="text-[13px] text-ink-2">
        Démarrez une mission mobile avec la valise KalyGo. Les dossiers des assurés de la zone sont préchargés pour permettre l’identification et les mesures même sans réseau.
      </p>

      <Card>
        <CardHeader title="Nouvelle mission" icon={<Briefcase className="size-4" />} />
        <form onSubmit={submit} className="space-y-4 p-4">
          <div>
            <Label>Lieu</Label>
            <div className="grid grid-cols-2 gap-2">
              {LOCATIONS.map((l, i) => (
                <button
                  type="button"
                  key={l.location}
                  onClick={() => setLoc(i)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${loc === i ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-ink-4'}`}
                >
                  <MapPin className="size-4 text-ink-3" />
                  <span>
                    <span className="block font-medium">{l.location}</span>
                    <span className="block text-xs text-ink-2">Région de {l.region}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="team">Équipe</Label>
              <Input id="team" value={team} onChange={(e) => setTeam(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="doctor">Médecin référent à distance</Label>
              <Select id="doctor" value={doctorId} onChange={(e) => setDoctorId(Number(e.target.value))}>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullname} — {d.speciality}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="lg" type="submit" loading={saving}>
              Démarrer la mission
            </Button>
          </div>
        </form>
      </Card>
      </div>
    </div>
  )
}

function ActiveMission({ mission }: { mission: Mission }) {
  const user = useUser()
  const toast = useToast()
  const navigate = useNavigate()
  const { online, outbox } = useNetwork()
  const doctor = useDoctors().find((d) => d.id === mission.doctor_id)
  const appointments = useMissionAppointments(mission.id)
  const [query, setQuery] = useState('')
  const results = useDb((db) => searchPatients(db, query), [query])

  async function take(patientId: number) {
    try {
      const id = await startMissionCare(user, mission.id, patientId)
      navigate(`/nurse/patient/${id}`)
    } catch (err) {
      toast.fail(err)
    }
  }

  async function close() {
    try {
      await closeMission(user, mission.id)
    } catch (err) {
      toast.fail(err)
    }
  }

  return (
    <div>
      <PageHeader
        title={`Mission KalyGo : ${mission.location}`}
        meta={
          <span>
            Région de {mission.region}, {mission.team}, médecin référent {doctor?.fullname}
          </span>
        }
        actions={
          <>
            <NetworkToggle compact />
            <Button variant="secondary" onClick={close} disabled={!online}>
              Clôturer la mission
            </Button>
          </>
        }
      />

      <div className="space-y-3 p-5">
        {!online && (
          <div className="flex items-start gap-3 rounded-md border border-danger/30 border-l-4 border-l-danger bg-danger-soft px-3 py-2.5 text-[13px]">
            <CloudOff className="mt-0.5 size-4 text-danger" />
            <div>
              <p className="font-semibold text-danger">Mode hors ligne</p>
              <p className="mt-0.5 text-ink-2">
                Identification, triage et mesures restent possibles. Les données sont conservées sur la valise et envoyées à MyAfia au retour du réseau. La vidéo est indisponible.
              </p>
              {outbox.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">
                  {outbox.slice(-5).map((e) => (
                    <li key={e.client_id}>
                      {formatTime(e.created_at)} {e.label}
                    </li>
                  ))}
                  {outbox.length > 5 && <li>et {outbox.length - 5} autre(s)</li>}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Card className="self-start">
            <CardHeader title="Identifier un patient" subtitle="n° assuré, nom ou n° patient" icon={<Search className="size-4" />} />
            <div className="p-3">
              <Input autoFocus placeholder="Ex. 1958021477654 ou Zahra" value={query} onChange={(e) => setQuery(e.target.value)} />
              {query.trim().length < 2 ? (
                <p className="flex items-center gap-2 pt-2.5 text-xs text-ink-3">
                  <UserRound className="size-3.5" /> Dossiers de la zone préchargés sur la valise : essayez Zahra ou Ibrahim.
                </p>
              ) : results.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-ink-3">Aucun assuré trouvé.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line-light rounded-md border border-line">
                  {results.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.fullname}</p>
                        <p className="text-xs text-ink-3 tabular-nums">
                          {p.gender === 'female' ? 'F' : 'M'}, {ageFrom(p.birth)} ans, {p.ssn}, {p.address}
                        </p>
                      </div>
                      {!p.active_status && <Badge tone="danger">Droits suspendus</Badge>}
                      <Button size="sm" onClick={() => take(p.id)}>
                        Prendre en charge
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="self-start overflow-hidden">
            <CardHeader title="Patients de la mission" subtitle={String(appointments.length)} />
            {appointments.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-ink-3">Aucun patient pris en charge pour l’instant.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} onClick={() => navigate(`/nurse/patient/${a.id}`)} className="cursor-pointer border-b border-line-light last:border-b-0 hover:bg-hover">
                      <td className="w-14 py-2 pl-3 font-semibold tabular-nums">{a.time}</td>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{a.patient.fullname}</p>
                        <p className="text-xs text-ink-3">
                          {a.patient.gender === 'female' ? 'F' : 'M'}, {ageFrom(a.patient.birth)} ans
                        </p>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Badge tone={STATUS_TONE[a.status]} dot>
                          {STATUS_LABEL[a.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
