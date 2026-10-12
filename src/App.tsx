import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireRole, homePathFor, useAuth } from '@/lib/auth/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { AppointmentsPage } from '@/features/doctor/AppointmentsPage'
import { WorkspacePage } from '@/features/doctor/WorkspacePage'
import { SyncLogPage } from '@/features/doctor/SyncLogPage'
import { QueuePage } from '@/features/nurse/QueuePage'
import { PatientFlowPage } from '@/features/nurse/PatientFlowPage'
import { MissionPage } from '@/features/nurse/MissionPage'
import { CommandCenterPage } from '@/features/command_center/CommandCenterPage'
import { PreventionPage } from '@/features/command_center/PreventionPage'

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/command-center"
              element={
                <RequireRole role="director">
                  <AppShell />
                </RequireRole>
              }
            >
              <Route index element={<CommandCenterPage />} />
              <Route path="prevention" element={<PreventionPage />} />
            </Route>
            <Route
              path="/doctor"
              element={
                <RequireRole role="doctor">
                  <AppShell />
                </RequireRole>
              }
            >
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="consultation/:id" element={<WorkspacePage />} />
              <Route path="sync-log" element={<SyncLogPage />} />
            </Route>
            <Route
              path="/nurse"
              element={
                <RequireRole role="nurse">
                  <AppShell />
                </RequireRole>
              }
            >
              <Route path="queue" element={<QueuePage />} />
              <Route path="patient/:id" element={<PatientFlowPage />} />
              <Route path="mission" element={<MissionPage />} />
            </Route>
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
