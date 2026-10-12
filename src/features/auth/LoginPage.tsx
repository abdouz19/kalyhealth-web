import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole } from '@/components/ui/icons'
import { homePathFor, useAuth } from '@/lib/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

const DEMO_ACCOUNTS = [
  { email: 'ahmed.youssef@myafia.dj', name: 'Dr Ahmed Youssef', role: 'Médecin', unit: 'Cardiologie' },
  { email: 'amina.hassan@myafia.dj', name: 'Dr Amina Hassan', role: 'Médecin', unit: 'Médecine générale, référente KalyGo' },
  { email: 'fatouma.ali@myafia.dj', name: 'Fatouma Ali', role: 'Infirmière', unit: 'Centre de santé d’Arta' },
  { email: 'idriss.moussa@myafia.dj', name: 'Idriss Moussa', role: 'Infirmier', unit: 'Équipe mobile KalyGo' },
  { email: 'direction@myafia.dj', name: 'Direction CNSS', role: 'Direction', unit: 'Supervision nationale' },
]

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={homePathFor(user.role)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const u = await login(email, password)
      navigate(homePathFor(u.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="flex h-16 items-center gap-2.5 border-b border-line-light bg-surface px-5">
        <div className="flex size-9 items-center justify-center rounded-full bg-canvas p-1">
          <img src="/logo-cnss.png" alt="CNSS" className="size-full object-contain" />
        </div>
        <span className="text-[17px] font-extrabold tracking-tight text-ink">my<span className="text-primary">a</span><span className="text-brand-green">fia</span></span>
        <span className="hidden text-[13px] text-ink-3 sm:inline">Caisse nationale de sécurité sociale, Djibouti</span>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
        <div className="grid w-full max-w-4xl gap-4 md:grid-cols-[1fr_360px]">
          <div className="rounded-3xl bg-surface p-8 sm:p-10">
            <h1 className="text-[28px] leading-tight font-bold tracking-tight">Espace professionnels de santé</h1>
            <p className="mt-1.5 text-sm text-ink-2">Téléconsultation et consultations assistées par KalyCart et KalyGo.</p>

            <form onSubmit={onSubmit} className="mt-8 max-w-sm space-y-4">
              <div>
                <Label htmlFor="email">Identifiant (e-mail professionnel)</Label>
                <Input id="email" type="email" autoComplete="username" placeholder="prenom.nom@myafia.dj" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11" />
              </div>
              {error && <p className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger">{error}</p>}
              <Button type="submit" size="lg" className="w-full" loading={loading} icon={!loading && <LockKeyhole className="size-3.5" />}>
                Se connecter
              </Button>
            </form>
          </div>

          <aside className="rounded-3xl bg-primary p-6 text-white">
            <h2 className="text-base font-bold">Accès rapides</h2>
            <p className="mt-1 text-xs text-white/80">Sélectionnez un compte pour remplir le formulaire.</p>
            <ul className="mt-4 space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email)
                      setPassword('demo1234')
                      setError(null)
                    }}
                    className={cn('w-full rounded-2xl px-4 py-2.5 text-left text-ink transition-colors', email === a.email ? 'bg-white' : 'bg-white/90 hover:bg-white')}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{a.name}</span>
                      <span className="text-xs text-ink-3">{a.role}</span>
                    </span>
                    <span className="block text-xs text-ink-2">{a.unit}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  )
}
