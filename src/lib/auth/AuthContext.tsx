import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { StaffRole, StaffUser } from '@/lib/types'
import { getView } from '@/lib/db/store'
import { latency } from '@/lib/utils'

/**
 * Mock staff auth. Will be replaced by Supabase Auth (email + password) with the
 * role carried as a JWT claim. The session lives in sessionStorage so each tab
 * can be logged in as a different user (doctor in one tab, nurse in another).
 */

const SESSION_KEY = 'kaly.session.v1'

type SessionUser = Omit<StaffUser, 'demo_password'>

interface AuthValue {
  user: SessionUser | null
  login: (email: string, password: string) => Promise<SessionUser>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

function readSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readSession)

  const login = useCallback(async (email: string, password: string) => {
    await latency()
    const match = getView().staff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase())
    if (!match || match.demo_password !== password) {
      throw new Error('Adresse e-mail ou mot de passe incorrect.')
    }
    const { demo_password: _omit, ...session } = match
    void _omit
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    return session
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Returns the logged-in user; only use under <RequireRole>. */
export function useUser() {
  const { user } = useAuth()
  if (!user) throw new Error('useUser called without an authenticated user')
  return user
}

export function homePathFor(role: StaffRole) {
  if (role === 'doctor') return '/doctor/appointments'
  if (role === 'nurse') return '/nurse/queue'
  return '/command-center'
}

export function RequireRole({ role, children }: { role: StaffRole; children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />
  return <>{children}</>
}
