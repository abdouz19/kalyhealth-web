import type {
  Appointment,
  DbState,
  Doctor,
  Mission,
  Patient,
  Site,
  VitalReading,
  VitalType,
} from '@/lib/types'
import { useDb } from '@/lib/db/useDb'
import { todayIso } from '@/lib/utils'

/**
 * Read hooks. Today they select from the local mock store; with Supabase they
 * become queries + Realtime subscriptions behind the same signatures.
 */

export interface AppointmentRow extends Appointment {
  patient: Patient
  doctor: Doctor
  site: Site | null
  mission: Mission | null
}

function joinAppointment(db: DbState, a: Appointment): AppointmentRow {
  return {
    ...a,
    patient: db.patients.find((p) => p.id === a.patient_id)!,
    doctor: db.doctors.find((d) => d.id === a.doctor_id)!,
    site: db.sites.find((s) => s.id === a.site_id) ?? null,
    mission: db.missions.find((m) => m.id === a.mission_id) ?? null,
  }
}

const byTime = (a: Appointment, b: Appointment) => a.time.localeCompare(b.time)

export function useDoctorAppointments(doctorId: number) {
  return useDb(
    (db) =>
      db.appointments
        .filter((a) => a.doctor_id === doctorId && a.date === todayIso())
        .sort(byTime)
        .map((a) => joinAppointment(db, a)),
    [doctorId],
  )
}

/** Monday → Sunday of the current week, as ISO dates. */
export function currentWeekDays() {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
}

export function useDoctorWeek(doctorId: number) {
  return useDb(
    (db) => {
      const days = new Set(currentWeekDays())
      return db.appointments
        .filter((a) => a.doctor_id === doctorId && days.has(a.date))
        .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b))
        .map((a) => joinAppointment(db, a))
    },
    [doctorId],
  )
}

export function useSiteQueue(siteId: number) {
  return useDb(
    (db) =>
      db.appointments
        .filter((a) => a.site_id === siteId && a.mode === 'assisted_cart' && a.date === todayIso())
        .sort(byTime)
        .map((a) => joinAppointment(db, a)),
    [siteId],
  )
}

export function useSites() {
  return useDb((db) => db.sites)
}

export function useAppointmentDetail(appointmentId: number) {
  return useDb(
    (db) => {
      const a = db.appointments.find((x) => x.id === appointmentId)
      if (!a) return null
      const forAppt = <T extends { appointment_id: number }>(rows: T[]) =>
        rows.filter((r) => r.appointment_id === appointmentId)
      const report = db.consultation_reports.find((r) => r.appointment_id === appointmentId) ?? null
      const triages = forAppt(db.triages)

      return {
        appointment: joinAppointment(db, a),
        session: db.tele_sessions.find((s) => s.appointment_id === appointmentId) ?? null,
        triage: triages[triages.length - 1] ?? null,
        vitals: forAppt(db.vital_readings),
        ecgs: forAppt(db.ecg_recordings),
        media: forAppt(db.device_media),
        requests: forAppt(db.measurement_requests),
        messages: forAppt(db.session_messages),
        files: forAppt(db.session_files),
        report,
        prescriptions: report ? db.prescriptions.filter((p) => p.report_id === report.id) : [],
        bilans: report ? db.bilan_requests.filter((b) => b.report_id === report.id) : [],
        syncLogs: db.sync_logs.filter((l) => l.appointment_id === appointmentId),
      }
    },
    [appointmentId],
  )
}

export type AppointmentDetail = NonNullable<ReturnType<typeof useAppointmentDetail>>

export function usePatientContext(patientId: number) {
  return useDb(
    (db) => {
      const patient = db.patients.find((p) => p.id === patientId)!
      return {
        chronic: db.chronic_medications.filter((m) => m.patient_id === patientId),
        history: db.past_consultations
          .filter((c) => c.patient_id === patientId)
          .sort((a, b) => b.date.localeCompare(a.date)),
        family: db.patients.filter((p) => p.ssn === patient.ssn && p.id !== patientId),
      }
    },
    [patientId],
  )
}

export function useActiveMission(nurseId: string) {
  return useDb((db) => db.missions.find((m) => m.nurse_id === nurseId && m.status === 'active') ?? null, [nurseId])
}

export function useMissionAppointments(missionId: string | null) {
  return useDb(
    (db) =>
      missionId
        ? db.appointments
            .filter((a) => a.mission_id === missionId)
            .sort(byTime)
            .map((a) => joinAppointment(db, a))
        : [],
    [missionId],
  )
}

export function useDoctors() {
  return useDb((db) => db.doctors)
}

export function useSyncLogs() {
  return useDb((db) => [...db.sync_logs].sort((a, b) => b.created_at.localeCompare(a.created_at)))
}

export function searchPatients(db: DbState, query: string) {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return db.patients.filter((p) => p.ssn.includes(q) || p.fullname.toLowerCase().includes(q) || p.patient_number.toLowerCase().includes(q))
}

/** Latest reading per vital type. */
export function latestVitals(vitals: VitalReading[]) {
  const out: Partial<Record<VitalType, VitalReading>> = {}
  for (const v of vitals) {
    const cur = out[v.type]
    if (!cur || cur.captured_at < v.captured_at) out[v.type] = v
  }
  return out
}
