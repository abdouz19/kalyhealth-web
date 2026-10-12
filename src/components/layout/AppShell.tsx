import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Briefcase, CalendarDays, ChevronDown, ClipboardList, Database, LogOut, Megaphone, RotateCcw, Search, Wifi, WifiOff } from '@/components/ui/icons'
import { useAuth } from '@/lib/auth/AuthContext'
import { resetDemo } from '@/lib/db/store'
import { useDb, useNetwork } from '@/lib/db/useDb'
import { STATUS_LABEL } from '@/lib/labels'
import { useLiveAlerts } from '@/lib/useLiveAlerts'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn, todayIso } from '@/lib/utils'

const NAV = {
  doctor: [
    { to: '/doctor/appointments', label: 'Agenda', icon: CalendarDays },
    { to: '/doctor/sync-log', label: 'Journal MyAfia', icon: Database },
  ],
  nurse: [
    { to: '/nurse/queue', label: 'File du centre', icon: ClipboardList },
    { to: '/nurse/mission', label: 'Mission KalyGo', icon: Briefcase },
  ],
  director: [
    { to: '/command-center', label: 'Vue nationale', icon: Activity, end: true },
    { to: '/command-center/prevention', label: 'Prévention', icon: Megaphone },
  ],
} as const

/** Focused screens (consultation, patient flow) collapse the nav to icons. */
function isFocusedRoute(path: string) {
  return /^\/doctor\/consultation\/|^\/nurse\/patient\//.test(path)
}

export function AppShell() {
  const { user, logout } = useAuth()
  const { online, outbox } = useNetwork()
  const location = useLocation()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [menu, setMenu] = useState(false)
  const site = useDb((db) => db.sites.find((s) => s.id === user?.site_id) ?? null, [user?.site_id])
  const doctor = useDb((db) => db.doctors.find((d) => d.id === user?.doctor_id) ?? null, [user?.doctor_id])
  useLiveAlerts()
  if (!user) return null

  const rail = isFocusedRoute(location.pathname)
  const items = NAV[user.role]
  const context = user.role === 'doctor'
    ? doctor?.speciality
    : user.role === 'director'
      ? 'Supervision CNSS'
      : site
        ? site.name
        : 'Équipe mobile KalyGo'

  return (
    <div className="flex h-full flex-col">
      {/* Top chrome */}
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line-light bg-chrome px-4 text-chrome-ink">
        <div className="flex items-center gap-2.5 pr-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-canvas p-1">
            <img src="/logo-cnss.png" alt="CNSS" className="size-full object-contain" />
          </div>
          <span className="text-[17px] font-extrabold tracking-tight text-ink">my<span className="text-primary">a</span><span className="text-brand-green">fia</span></span>
          <span className="hidden text-[13px] text-ink-3 sm:inline">{user.role === 'director' ? 'Supervision CNSS' : 'Téléconsultation'}</span>
        </div>


        {user.role !== 'director' && <PatientSearch />}

        <div className="ml-auto flex items-center gap-4 text-[13px]">
          {user.role === 'nurse' && (
            <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium', online ? 'bg-success-soft text-olive-text' : 'bg-danger-soft text-danger')}>
              {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
              {online ? 'En ligne' : `Hors ligne${outbox.length ? ` (${outbox.length} en attente)` : ''}`}
            </span>
          )}
          <span className="hidden md:inline">{context}</span>
          <Clock />
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 hover:bg-canvas">
              <Avatar name={user.fullname} size="md" />
              <span className="hidden font-semibold text-ink lg:inline">{user.fullname}</span>
              <ChevronDown className="size-3.5" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl bg-surface py-1.5 text-sm text-ink shadow-lg">
                  <div className="border-b border-line-light px-3 py-2">
                    <p className="font-medium">{user.fullname}</p>
                    <p className="text-xs text-ink-3">{user.role === 'doctor' ? 'Médecin' : user.role === 'nurse' ? 'Infirmier·e' : 'Direction'} · {user.email}</p>
                  </div>
                  <MenuItem
                    icon={<RotateCcw className="size-3.5" />}
                    onClick={() => {
                      setMenu(false)
                      setConfirmReset(true)
                    }}
                  >
                    Réinitialiser les données
                  </MenuItem>
                  <MenuItem
                    icon={<LogOut className="size-3.5" />}
                    onClick={() => {
                      logout()
                      navigate('/login')
                    }}
                  >
                    Se déconnecter
                  </MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className={cn('flex shrink-0 flex-col gap-1 bg-canvas py-4', rail ? 'w-[68px] items-center px-3' : 'w-[68px] items-center px-3 md:w-60 md:items-stretch md:px-4')}>
          {items.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={'end' in rest}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-2.5 rounded-full text-sm font-semibold transition-colors [&_svg]:size-5',
                  rail ? 'w-11 justify-center' : 'w-11 justify-center md:w-auto md:justify-start md:px-4',
                  isActive ? 'bg-primary text-white shadow-[0_6px_16px_rgb(59_120_242/0.28)]' : 'text-ink-2 hover:bg-surface hover:text-ink',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!rail && <span className="hidden md:inline">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Réinitialiser les données"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemo()
                setConfirmReset(false)
              }}
            >
              Réinitialiser
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">Rendez-vous, mesures, comptes rendus et missions reviennent à leur état initial dans tous les onglets ouverts.</p>
      </Modal>
    </div>
  )
}

function MenuItem({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-hover">
      <span className="text-ink-3">{icon}</span>
      {children}
    </button>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return <span className="tabular-nums">{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
}

/** Finds today's appointments by patient name, SSN or patient number. */
function PatientSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const view = useDb((db) => db)

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2 || !user) return []
    return view.appointments
      .filter((a) => a.date === todayIso())
      .filter((a) => (user.role === 'doctor' ? a.doctor_id === user.doctor_id : user.site_id ? a.site_id === user.site_id : a.mission_id))
      .map((a) => ({ a, p: view.patients.find((p) => p.id === a.patient_id)! }))
      .filter(({ p }) => p.fullname.toLowerCase().includes(term) || p.ssn.includes(term) || p.patient_number.toLowerCase().includes(term))
      .slice(0, 6)
  }, [q, view, user])

  function go(id: number) {
    if (!user) return
    setQ('')
    setOpen(false)
    navigate(user.role === 'doctor' ? `/doctor/consultation/${id}` : `/nurse/patient/${id}`)
  }

  return (
    <div ref={boxRef} className="relative hidden w-full max-w-sm md:block">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-3" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Patient du jour : nom, n° assuré, n° patient"
        className="h-10 w-full rounded-full border border-transparent bg-canvas pr-3 pl-10 text-[13px] text-ink placeholder:text-ink-3 focus:border-primary focus:bg-surface focus:outline-none"
      />
      {open && results.length > 0 && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl bg-surface py-1 text-sm text-ink shadow-lg">
          {results.map(({ a, p }) => (
            <button key={a.id} onMouseDown={() => go(a.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover">
              <span className="w-11 tabular-nums text-ink-2">{a.time}</span>
              <span className="flex-1 truncate font-medium">{p.fullname}</span>
              <span className="text-xs text-ink-3">{STATUS_LABEL[a.status]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
