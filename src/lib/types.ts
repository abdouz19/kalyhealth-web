/**
 * Domain types. Field names are snake_case on purpose: they mirror the future
 * Supabase tables, which themselves mirror the MyAfia data model
 * (PatientGlobal → Appointment → Diagnose → Prescription).
 */

// ─── MyAfia mirror (mock data for the demo) ──────────────────────────────────

export type Gender = 'male' | 'female'
export type RelationName = 'principal' | 'wife' | 'husband' | 'child'

export interface Antecedents {
  personal_blood_pressure: boolean
  personal_heart_disease: boolean
  personal_diabetes_type_2: boolean
  personal_asthmatic: boolean
  personal_allergies: string | null
  personal_surgery_details: string | null
  family_heart_disease: boolean
  family_diabetes: boolean
}

/** Mirrors MyAfia `patient_global`. */
export interface Patient extends Antecedents {
  id: number
  patient_number: string
  ssn: string
  relation_name: RelationName
  fullname: string
  gender: Gender
  birth: string
  height: number | null
  weight: number | null
  blood_type: string | null
  nationality: string
  phone: string
  email: string | null
  regime: string
  active_status: 0 | 1
  address: string
}

/** Long-term treatment, mirrors MyAfia `chronic_drug` medications. */
export interface ChronicMedication {
  id: string
  patient_id: number
  drug_name: string
  dosage: string
  frequency: string
}

/** Past consultation as returned by MyAfia `/consultation/show`. */
export interface PastConsultation {
  id: number
  patient_id: number
  date: string
  doctor_name: string
  speciality: string
  summary: string
}

export interface Doctor {
  id: number
  email: string
  fullname: string
  speciality: string
  section: string
  site: string
}

export interface Site {
  id: number
  name: string
  short_name: string
  region: string
  has_kalycart: boolean
  kalycart_serial: string | null
}

export type ConsultationMode = 'in_person' | 'direct' | 'assisted_cart' | 'assisted_go'

export type AppointmentStatus =
  | 'scheduled'
  | 'waiting_room'
  | 'arrived'
  | 'triage'
  | 'measuring'
  | 'ready'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'

/** Mirrors MyAfia `appointments` + KalyHealth extension (`mode`, `site_id`, `mission_id`). */
export interface Appointment {
  id: number
  appoint_number: number
  patient_id: number
  doctor_id: number
  date: string
  time: string
  mode: ConsultationMode
  site_id: number | null
  mission_id: string | null
  status: AppointmentStatus
  reason: string | null
  // Vitals written back into MyAfia on closure (same columns as MyAfia).
  pressure: string | null
  heart_rate: number | null
  spo2: number | null
  temp_degree: number | null
  height: number | null
  weight: number | null
  updated_at: string
}

// ─── Staff accounts (future Supabase Auth + profiles) ───────────────────────

export type StaffRole = 'doctor' | 'nurse' | 'director'

export interface StaffUser {
  id: string
  email: string
  fullname: string
  role: StaffRole
  doctor_id: number | null
  site_id: number | null
  /** Demo only — real auth goes through Supabase Auth. */
  demo_password: string
}

// ─── KalyHealth tables ──────────────────────────────────────────────────────

export type SessionStatus = 'waiting' | 'live' | 'ended'

export interface TeleSession {
  id: string
  appointment_id: number
  room_name: string
  status: SessionStatus
  started_at: string | null
  ended_at: string | null
}

export type TriagePriority = 'urgent' | 'semi_urgent' | 'non_urgent'

export interface Triage {
  id: string
  appointment_id: number
  nurse_id: string
  chief_complaint: string
  symptoms: string[]
  priority: TriagePriority
  notes: string
  coverage_checked: boolean
  created_at: string
}

export type VitalType = 'bp' | 'hr' | 'spo2' | 'temp' | 'height' | 'weight'
export type VitalSource = 'device' | 'manual'

export interface VitalReading {
  id: string
  appointment_id: number
  type: VitalType
  value: number
  /** Diastolic pressure when type = 'bp'. */
  value2: number | null
  unit: string
  device: string | null
  source: VitalSource
  simulated: boolean
  captured_by: string
  captured_at: string
}

export interface EcgRecording {
  id: string
  appointment_id: number
  sample_rate: number
  samples: number[]
  heart_rate: number
  duration_s: number
  interpretation_hint: string | null
  simulated: boolean
  captured_by: string
  captured_at: string
}

export type MediaKind = 'stethoscope' | 'scope'

export interface DeviceMedia {
  id: string
  appointment_id: number
  kind: MediaKind
  label: string
  /** Stethoscope: heart rate used by the audio synthesiser. Scope: variant seed. */
  params: Record<string, number>
  simulated: boolean
  captured_by: string
  captured_at: string
}

export type MeasurementKind = 'bp' | 'spo2' | 'temp' | 'height' | 'weight' | 'ecg' | 'stethoscope' | 'scope'

export interface MeasurementRequest {
  id: string
  appointment_id: number
  kind: MeasurementKind
  requested_by: string
  status: 'pending' | 'done'
  created_at: string
  done_at: string | null
}

/** Follow-up decided at closure (cahier §5.2 « diagnostic, notes, prescription, bilan et suivi »). */
export interface FollowUp {
  mode: ConsultationMode
  in_days: number
  note: string
}

export interface ConsultationReport {
  id: string
  appointment_id: number
  doctor_id: number
  chief_complaint: string
  diagnosis: string
  treatment: string
  notes: string
  follow_up: FollowUp | null
  created_at: string
}

export interface Prescription {
  id: string
  report_id: string
  drug: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
}

export type BilanType = 'biologie' | 'radiologie' | 'echographie' | 'ecg'

export interface BilanRequest {
  id: string
  report_id: string
  type: BilanType
  detail: string
}

export interface SessionMessage {
  id: string
  appointment_id: number
  sender_role: 'patient' | StaffRole
  sender_name: string
  body: string
  created_at: string
}

export interface SessionFile {
  id: string
  appointment_id: number
  uploaded_by_role: 'patient' | StaffRole
  uploaded_by_name: string
  name: string
  mime: string
  size: number
  data_url: string
  created_at: string
}

/** Patient consent before teleconsultation and device data transfer (cahier §11). */
export interface Consent {
  id: string
  appointment_id: number
  patient_id: number
  scope: 'teleconsultation_and_device_data'
  accepted_at: string
}

export interface Mission {
  id: string
  location: string
  region: string
  date: string
  team: string
  nurse_id: string
  doctor_id: number
  status: 'active' | 'closed'
  created_at: string
}

/** Integration journal — never contains clinical content. */
export interface SyncLog {
  id: string
  request_id: string
  appointment_id: number | null
  entity: 'vitals' | 'diagnosis' | 'prescription' | 'bilan' | 'appointment' | 'offline_batch'
  action: string
  status: 'success' | 'error'
  target: 'myafia_mock' | 'myafia_staging'
  error: string | null
  created_at: string
}

export interface DbState {
  seeded_for: string
  patients: Patient[]
  chronic_medications: ChronicMedication[]
  past_consultations: PastConsultation[]
  doctors: Doctor[]
  sites: Site[]
  staff: StaffUser[]
  appointments: Appointment[]
  tele_sessions: TeleSession[]
  triages: Triage[]
  vital_readings: VitalReading[]
  ecg_recordings: EcgRecording[]
  device_media: DeviceMedia[]
  measurement_requests: MeasurementRequest[]
  consultation_reports: ConsultationReport[]
  prescriptions: Prescription[]
  bilan_requests: BilanRequest[]
  session_messages: SessionMessage[]
  session_files: SessionFile[]
  missions: Mission[]
  consents: Consent[]
  sync_logs: SyncLog[]
}

export type TableName = Exclude<keyof DbState, 'seeded_for'>
