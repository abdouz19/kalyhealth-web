import type {
  AppointmentStatus,
  BilanRequest,
  ConsultationMode,
  FollowUp,
  MeasurementKind,
  Prescription,
  StaffRole,
  StaffUser,
  SyncLog,
  TriagePriority,
  VitalSource,
  VitalType,
} from '@/lib/types'
import type { MeasureResult } from '@/devices/types'
import { insert, update, type Op } from '@/lib/db/ops'
import { commit, getView } from '@/lib/db/store'
import { latestVitals } from '@/lib/api/queries'
import { latency, nowIso, shortRequestId, todayIso, uid } from '@/lib/utils'

/**
 * Write API. Each function is the client-side equivalent of a future Supabase
 * insert/update or Edge Function call. Role checks mimic the RLS policies:
 * a nurse can never write a diagnosis or prescription.
 */

type Actor = Omit<StaffUser, 'demo_password'>

/** Anyone who can speak in a session: staff, or the patient (mobile app / simulator). */
export interface Sender {
  role: 'patient' | StaffRole
  fullname: string
}

export class ForbiddenError extends Error {
  constructor(message = 'Action non autorisée pour ce rôle.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

function assertRole(actor: Actor, role: StaffRole) {
  if (actor.role !== role) throw new ForbiddenError()
}

function appointmentOrThrow(id: number) {
  const a = getView().appointments.find((x) => x.id === id)
  if (!a) throw new Error('Rendez-vous introuvable.')
  return a
}

function setStatus(id: number, status: AppointmentStatus): Op {
  return update('appointments', id, { status, updated_at: nowIso() })
}

// ─── Doctor ─────────────────────────────────────────────────────────────────

export async function startConsultation(actor: Actor, appointmentId: number) {
  assertRole(actor, 'doctor')
  await latency()
  const db = getView()
  const session = db.tele_sessions.find((s) => s.appointment_id === appointmentId)
  const ops: Op[] = [setStatus(appointmentId, 'in_consultation')]
  // In-person visits happen in the office: no video room.
  if (appointmentOrThrow(appointmentId).mode === 'in_person') {
    commit(ops)
    return
  }
  if (session) ops.push(update('tele_sessions', session.id, { status: 'live', started_at: nowIso() }))
  else
    ops.push(
      insert('tele_sessions', {
        id: uid(),
        appointment_id: appointmentId,
        room_name: `appt-${appointmentId}`,
        status: 'live',
        started_at: nowIso(),
        ended_at: null,
      }),
    )
  commit(ops)
}

/** In-person visit: the patient is at the office (reception check-in in MyAfia). */
export async function markOfficeArrival(actor: Actor, appointmentId: number) {
  assertRole(actor, 'doctor')
  const a = appointmentOrThrow(appointmentId)
  if (a.mode !== 'in_person' || a.status !== 'scheduled') return
  await latency()
  commit([setStatus(appointmentId, 'arrived')])
}

export async function requestMeasurement(actor: Actor, appointmentId: number, kind: MeasurementKind) {
  assertRole(actor, 'doctor')
  await latency()
  commit([
    insert('measurement_requests', {
      id: uid(),
      appointment_id: appointmentId,
      kind,
      requested_by: actor.fullname,
      status: 'pending',
      created_at: nowIso(),
      done_at: null,
    }),
  ])
}

export interface ClosurePayload {
  chief_complaint: string
  diagnosis: string
  treatment: string
  notes: string
  prescriptions: Array<Omit<Prescription, 'id' | 'report_id'>>
  bilans: Array<Omit<BilanRequest, 'id' | 'report_id'>>
  follow_up: FollowUp | null
}

function addDaysIso(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y!, m! - 1, d! + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Closes the consultation and "syncs" it to MyAfia. In the demo the target is
 * the MyAfia mock; later this becomes the `close-consultation` Edge Function
 * calling the NestJS Integration Hub.
 */
export async function closeConsultation(actor: Actor, appointmentId: number, payload: ClosurePayload) {
  assertRole(actor, 'doctor')
  if (!payload.diagnosis.trim()) throw new Error('Le diagnostic est obligatoire.')
  const appt = appointmentOrThrow(appointmentId)
  if (appt.doctor_id !== actor.doctor_id) throw new ForbiddenError('Ce rendez-vous n’est pas attribué à ce médecin.')

  await latency()
  const db = getView()
  const reportId = uid()
  const latest = latestVitals(db.vital_readings.filter((v) => v.appointment_id === appointmentId))
  const session = db.tele_sessions.find((s) => s.appointment_id === appointmentId)

  const log = (entity: SyncLog['entity'], action: string): SyncLog => ({
    id: uid(),
    request_id: shortRequestId(),
    appointment_id: appointmentId,
    entity,
    action,
    status: 'success',
    target: 'myafia_mock',
    error: null,
    created_at: nowIso(),
  })

  const logs: SyncLog[] = []
  if (Object.keys(latest).length > 0) logs.push(log('vitals', 'pushVitals → appointments'))
  logs.push(log('diagnosis', 'pushDiagnosis → diagnoses'))
  if (payload.prescriptions.length) logs.push(log('prescription', `pushPrescription → prescreption (${payload.prescriptions.length})`))
  if (payload.bilans.length) logs.push(log('bilan', `pushBilan → bilans (${payload.bilans.length})`))
  logs.push(log('appointment', 'updateAppointment → status=diagnostiqué'))
  if (payload.follow_up) logs.push(log('appointment', `createAppointment → suivi J+${payload.follow_up.in_days}`))

  const bp = latest.bp
  const ops: Op[] = [
    insert('consultation_reports', {
      id: reportId,
      appointment_id: appointmentId,
      doctor_id: actor.doctor_id!,
      chief_complaint: payload.chief_complaint,
      diagnosis: payload.diagnosis,
      treatment: payload.treatment,
      notes: payload.notes,
      follow_up: payload.follow_up,
      created_at: nowIso(),
    }),
    ...payload.prescriptions.map((p) => insert('prescriptions', { ...p, id: uid(), report_id: reportId })),
    ...payload.bilans.map((b) => insert('bilan_requests', { ...b, id: uid(), report_id: reportId })),
    // Vitals mapped onto the MyAfia appointment columns.
    update('appointments', appointmentId, {
      status: 'completed',
      updated_at: nowIso(),
      pressure: bp ? `${bp.value}/${bp.value2}` : appt.pressure,
      heart_rate: latest.hr?.value ?? appt.heart_rate,
      spo2: latest.spo2?.value ?? appt.spo2,
      temp_degree: latest.temp?.value ?? appt.temp_degree,
      height: latest.height?.value ?? appt.height,
      weight: latest.weight?.value ?? appt.weight,
    }),
    ...logs.map((l) => insert('sync_logs', l)),
  ]
  if (session) ops.push(update('tele_sessions', session.id, { status: 'ended', ended_at: nowIso() }))

  // Follow-up visit booked in the doctor's agenda (MyAfia `POST /appointments/store`).
  if (payload.follow_up) {
    const id = (Date.now() % 1_000_000_000) + 1
    const assisted = payload.follow_up.mode === 'assisted_cart'
    ops.push(
      insert('appointments', {
        id,
        appoint_number: 9000 + (id % 1000),
        patient_id: appt.patient_id,
        doctor_id: appt.doctor_id,
        date: addDaysIso(todayIso(), payload.follow_up.in_days),
        time: appt.time,
        mode: payload.follow_up.mode,
        site_id: assisted ? (appt.site_id ?? 1) : null,
        mission_id: null,
        status: 'scheduled',
        reason: `Suivi${payload.follow_up.note ? ` : ${payload.follow_up.note}` : ''}`,
        pressure: null,
        heart_rate: null,
        spo2: null,
        temp_degree: null,
        height: null,
        weight: null,
        updated_at: nowIso(),
      }),
    )
  }

  // Simulated Integration Hub round-trip.
  await latency()
  commit(ops)
  return logs
}

// ─── Nurse (offline-capable: KalyGo) ────────────────────────────────────────

export async function checkIn(actor: Actor, appointmentId: number) {
  assertRole(actor, 'nurse')
  commit([setStatus(appointmentId, 'arrived')], { offlineCapable: true, label: 'Arrivée patient' })
}

export async function confirmIdentity(actor: Actor, appointmentId: number) {
  assertRole(actor, 'nurse')
  const a = appointmentOrThrow(appointmentId)
  if (a.status === 'arrived' || a.status === 'scheduled') {
    commit([setStatus(appointmentId, 'triage')], { offlineCapable: true, label: 'Identité vérifiée' })
  }
}

export interface TriageInput {
  chief_complaint: string
  symptoms: string[]
  priority: TriagePriority
  notes: string
}

export async function saveTriage(actor: Actor, appointmentId: number, input: TriageInput) {
  assertRole(actor, 'nurse')
  if (!input.chief_complaint.trim()) throw new Error('Le motif est obligatoire.')
  const a = appointmentOrThrow(appointmentId)
  const ops: Op[] = [
    insert('triages', {
      id: uid(),
      appointment_id: appointmentId,
      nurse_id: actor.id,
      ...input,
      coverage_checked: true,
      created_at: nowIso(),
    }),
  ]
  if (['scheduled', 'arrived', 'triage'].includes(a.status)) ops.push(setStatus(appointmentId, 'measuring'))
  commit(ops, { offlineCapable: true, label: 'Triage' })
}

export function recordMeasurement(
  actor: Actor,
  appointmentId: number,
  kind: MeasurementKind,
  device: string,
  result: MeasureResult,
  opts: { source: VitalSource; simulated: boolean },
) {
  assertRole(actor, 'nurse')
  const ops: Op[] = []
  const at = nowIso()

  if (result.kind === 'vitals') {
    for (const r of result.readings) {
      ops.push(
        insert('vital_readings', {
          id: uid(),
          appointment_id: appointmentId,
          type: r.type,
          value: r.value,
          value2: r.value2,
          unit: r.unit,
          device: opts.source === 'device' ? device : null,
          source: opts.source,
          simulated: opts.simulated,
          captured_by: actor.fullname,
          captured_at: at,
        }),
      )
    }
  } else if (result.kind === 'ecg') {
    ops.push(
      insert('ecg_recordings', {
        id: uid(),
        appointment_id: appointmentId,
        sample_rate: result.sample_rate,
        samples: result.samples,
        heart_rate: result.heart_rate,
        duration_s: result.duration_s,
        interpretation_hint: result.hint,
        simulated: opts.simulated,
        captured_by: actor.fullname,
        captured_at: at,
      }),
    )
  } else {
    ops.push(
      insert('device_media', {
        id: uid(),
        appointment_id: appointmentId,
        kind: result.media,
        label: result.label,
        params: result.params,
        simulated: opts.simulated,
        captured_by: actor.fullname,
        captured_at: at,
      }),
    )
  }

  // Close any pending doctor request for this kind of measurement.
  const pending = getView().measurement_requests.filter(
    (r) => r.appointment_id === appointmentId && r.kind === kind && r.status === 'pending',
  )
  for (const r of pending) ops.push(update('measurement_requests', r.id, { status: 'done', done_at: at }))

  commit(ops, { offlineCapable: true, label: device })
}

export function manualVital(type: VitalType, value: number, value2: number | null): MeasureResult {
  const unit = { bp: 'mmHg', hr: 'bpm', spo2: '%', temp: '°C', height: 'cm', weight: 'kg' }[type]
  return { kind: 'vitals', readings: [{ type, value, value2, unit }] }
}

export async function markReady(actor: Actor, appointmentId: number) {
  assertRole(actor, 'nurse')
  commit([setStatus(appointmentId, 'ready')], { offlineCapable: true, label: 'Patient prêt' })
}

export interface MissionInput {
  location: string
  region: string
  team: string
  doctor_id: number
}

export async function createMission(actor: Actor, input: MissionInput) {
  assertRole(actor, 'nurse')
  await latency()
  const id = uid()
  commit([insert('missions', { id, ...input, date: todayIso(), nurse_id: actor.id, status: 'active', created_at: nowIso() })])
  return id
}

export async function closeMission(actor: Actor, missionId: string) {
  assertRole(actor, 'nurse')
  commit([update('missions', missionId, { status: 'closed' })])
}

/** Starts care for a patient met on the field (creates a KalyGo appointment). */
export async function startMissionCare(actor: Actor, missionId: string, patientId: number) {
  assertRole(actor, 'nurse')
  const db = getView()
  const mission = db.missions.find((m) => m.id === missionId)
  if (!mission) throw new Error('Mission introuvable.')
  const existing = db.appointments.find((a) => a.mission_id === missionId && a.patient_id === patientId && a.status !== 'completed')
  if (existing) return existing.id

  const id = Date.now() % 1_000_000_000
  const now = new Date()
  const mode: ConsultationMode = 'assisted_go'
  commit(
    [
      insert('appointments', {
        id,
        appoint_number: 9000 + (id % 1000),
        patient_id: patientId,
        doctor_id: mission.doctor_id,
        date: todayIso(),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        mode,
        site_id: null,
        mission_id: missionId,
        status: 'arrived',
        reason: null,
        pressure: null,
        heart_rate: null,
        spo2: null,
        temp_degree: null,
        height: null,
        weight: null,
        updated_at: nowIso(),
      }),
    ],
    { offlineCapable: true, label: 'Prise en charge mission' },
  )
  return id
}

// ─── Shared ─────────────────────────────────────────────────────────────────

export async function sendMessage(actor: Sender, appointmentId: number, body: string) {
  const text = body.trim()
  if (!text) return
  commit([
    insert('session_messages', {
      id: uid(),
      appointment_id: appointmentId,
      sender_role: actor.role,
      sender_name: actor.fullname,
      body: text,
      created_at: nowIso(),
    }),
  ])
}

const MAX_FILE_BYTES = 1.5 * 1024 * 1024
const ALLOWED_MIME = /^(image\/(png|jpeg|webp|svg\+xml)|application\/pdf)$/

export async function uploadSessionFile(actor: Sender, appointmentId: number, file: File) {
  if (file.size > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux (max 1,5 Mo).')
  if (!ALLOWED_MIME.test(file.type)) throw new Error('Type de fichier non autorisé (images ou PDF).')
  const data_url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.readAsDataURL(file)
  })
  commit([
    insert('session_files', {
      id: uid(),
      appointment_id: appointmentId,
      uploaded_by_role: actor.role,
      uploaded_by_name: actor.fullname,
      name: file.name,
      mime: file.type,
      size: file.size,
      data_url,
      created_at: nowIso(),
    }),
  ])
}

// ─── Patient (mobile app — simulated in the web demo) ─────────────────────────

export async function recordConsent(appointmentId: number, patientId: number) {
  await latency()
  const exists = getView().consents.some((c) => c.appointment_id === appointmentId)
  if (exists) return
  commit([
    insert('consents', {
      id: uid(),
      appointment_id: appointmentId,
      patient_id: patientId,
      scope: 'teleconsultation_and_device_data',
      accepted_at: nowIso(),
    }),
  ])
}

/** The patient joins the waiting room (from the app, or the web patient simulator). */
export async function simulatePatientJoined(appointmentId: number) {
  const db = getView()
  const current = db.appointments.find((a) => a.id === appointmentId)
  if (current && current.status !== 'scheduled') return
  const session = db.tele_sessions.find((s) => s.appointment_id === appointmentId)
  const ops: Op[] = [setStatus(appointmentId, 'waiting_room')]
  if (!session)
    ops.push(
      insert('tele_sessions', {
        id: uid(),
        appointment_id: appointmentId,
        room_name: `appt-${appointmentId}`,
        status: 'waiting',
        started_at: null,
        ended_at: null,
      }),
    )
  commit(ops)
}
