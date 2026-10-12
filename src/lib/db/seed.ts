import type { Antecedents, Appointment, DbState, Patient } from '@/lib/types'
import { nowIso, todayIso } from '@/lib/utils'

/** ISO date `offset` days from today (local time). */
function dayIso(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Demo data — 100 % fictitious. Shapes follow the MyAfia data model so the
 * mock can later be replaced by the real MyAfia API (through the Integration Hub)
 * without touching the screens.
 */

const noAntecedents: Antecedents = {
  personal_blood_pressure: false,
  personal_heart_disease: false,
  personal_diabetes_type_2: false,
  personal_asthmatic: false,
  personal_allergies: null,
  personal_surgery_details: null,
  family_heart_disease: false,
  family_diabetes: false,
}

function patient(p: Partial<Patient> & Pick<Patient, 'id' | 'fullname' | 'ssn' | 'gender' | 'birth'>): Patient {
  return {
    ...noAntecedents,
    patient_number: `P${String(p.id).padStart(6, '0')}`,
    relation_name: 'principal',
    height: null,
    weight: null,
    blood_type: null,
    nationality: 'Djiboutienne',
    phone: '+253 77 00 00 00',
    email: null,
    regime: 'CNSS — Salarié',
    active_status: 1,
    address: 'Djibouti-ville',
    ...p,
  }
}

function appointment(
  a: Pick<Appointment, 'id' | 'patient_id' | 'doctor_id' | 'time' | 'mode' | 'status'> & Partial<Appointment>,
): Appointment {
  return {
    appoint_number: 1500 + a.id,
    date: todayIso(),
    site_id: null,
    mission_id: null,
    reason: null,
    pressure: null,
    heart_rate: null,
    spo2: null,
    temp_degree: null,
    height: null,
    weight: null,
    updated_at: nowIso(),
    ...a,
  }
}

/** Placeholder "document" uploaded by a patient (SVG rendered as an image). */
const labResultSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">
  <rect width="420" height="560" fill="#fbf8f3"/>
  <rect x="24" y="24" width="372" height="64" rx="10" fill="#efe8dd"/>
  <text x="44" y="64" font-family="Helvetica" font-size="20" font-weight="700" fill="#1f1c18">Bilan lipidique</text>
  ${['Cholestérol total   2,45 g/L', 'LDL-cholestérol     1,62 g/L', 'HDL-cholestérol     0,41 g/L', 'Triglycérides       1,88 g/L', 'Glycémie à jeun     1,08 g/L']
    .map((l, i) => `<text x="44" y="${170 + i * 36}" font-family="Courier" font-size="15" fill="#1f1c18">${l}</text>`)
    .join('')}
  <rect x="24" y="480" width="372" height="48" rx="10" fill="#fdf0e2"/>
</svg>`)}`

/** Appointments on the other days of the current week, so the week view is meaningful. */
function weekAppointments(): Appointment[] {
  const plan: Array<[number, number, number, string, Appointment['mode'], string]> = [
    // [day offset, id, patient, time, mode, reason]
    [-2, 70, 43, '09:00', 'direct', 'Suivi HTA'],
    [-2, 71, 51, '10:30', 'assisted_cart', 'Contrôle glycémie et tension'],
    [-1, 72, 52, '08:30', 'in_person', 'Échographie cardiaque'],
    [-1, 73, 56, '14:00', 'direct', 'Palpitations'],
    [1, 74, 42, '09:30', 'direct', 'Résultats Holter'],
    [1, 75, 55, '11:00', 'assisted_cart', 'Suivi insuffisance cardiaque'],
    [1, 76, 54, '15:00', 'in_person', 'Épreuve d’effort'],
    [2, 77, 57, '10:00', 'direct', 'Diabète, bilan cardiovasculaire'],
    [3, 78, 53, '09:00', 'assisted_cart', 'Essoufflement, réévaluation'],
    [3, 79, 43, '16:00', 'in_person', 'Consultation annuelle'],
  ]
  return plan.map(([offset, id, patient_id, time, mode, reason]) =>
    appointment({
      id,
      patient_id,
      doctor_id: 7,
      time,
      mode,
      reason,
      date: dayIso(offset),
      site_id: mode === 'assisted_cart' ? 1 : null,
      status: offset < 0 ? 'completed' : 'scheduled',
    }),
  )
}

export function createSeed(): DbState {
  const now = nowIso()
  const today = todayIso()

  return {
    seeded_for: today,

    sites: [
      { id: 1, name: "Centre de santé d'Arta", short_name: 'Arta', region: 'Arta', has_kalycart: true, kalycart_serial: 'KC-ARTA-01' },
      { id: 2, name: 'CS1 — Boulaos', short_name: 'CS1', region: 'Djibouti-ville', has_kalycart: true, kalycart_serial: 'KC-CS1-01' },
      { id: 3, name: 'CS2 — Balbala', short_name: 'CS2', region: 'Djibouti-ville', has_kalycart: false, kalycart_serial: null },
    ],

    doctors: [
      { id: 7, email: 'ahmed.youssef@myafia.dj', fullname: 'Dr Ahmed Youssef', speciality: 'Cardiologie', section: 'Cardiologie', site: 'Hôpital CNSS — Djibouti' },
      { id: 8, email: 'amina.hassan@myafia.dj', fullname: 'Dr Amina Hassan', speciality: 'Médecine générale', section: 'Médecine interne', site: 'CS1 — Boulaos' },
    ],

    staff: [
      { id: 'usr-doc-7', email: 'ahmed.youssef@myafia.dj', fullname: 'Dr Ahmed Youssef', role: 'doctor', doctor_id: 7, site_id: null, demo_password: 'demo1234' },
      { id: 'usr-doc-8', email: 'amina.hassan@myafia.dj', fullname: 'Dr Amina Hassan', role: 'doctor', doctor_id: 8, site_id: null, demo_password: 'demo1234' },
      { id: 'usr-nur-1', email: 'fatouma.ali@myafia.dj', fullname: 'Fatouma Ali', role: 'nurse', doctor_id: null, site_id: 1, demo_password: 'demo1234' },
      { id: 'usr-nur-2', email: 'idriss.moussa@myafia.dj', fullname: 'Idriss Moussa', role: 'nurse', doctor_id: null, site_id: null, demo_password: 'demo1234' },
      { id: 'usr-dir-1', email: 'direction@myafia.dj', fullname: 'Direction CNSS', role: 'director', doctor_id: null, site_id: null, demo_password: 'demo1234' },
    ],

    patients: [
      patient({ id: 42, fullname: 'Hodan Farah', ssn: '1985031512345', gender: 'female', birth: '1985-03-15', height: 165, weight: 62, blood_type: 'A+', email: 'hodan.farah@mail.dj', phone: '+253 77 12 34 56', personal_allergies: 'Pénicilline' }),
      patient({ id: 43, fullname: 'Abdourahman Farah', ssn: '1985031512345', relation_name: 'husband', gender: 'male', birth: '1981-07-02', height: 178, weight: 84, blood_type: 'O+', regime: 'CNSS — Ayant droit', personal_blood_pressure: true }),
      patient({ id: 44, fullname: 'Hamid Farah', ssn: '1985031512345', relation_name: 'child', gender: 'male', birth: '2014-11-20', height: 142, weight: 35, regime: 'CNSS — Ayant droit', personal_asthmatic: true }),
      patient({
        id: 51, fullname: 'Mohamed Ali Robleh', ssn: '1961052298761', gender: 'male', birth: '1961-05-22', height: 172, weight: 91, blood_type: 'B+',
        regime: 'CNSS — Pensionné', address: 'Arta', phone: '+253 77 45 21 09',
        personal_blood_pressure: true, personal_diabetes_type_2: true, family_heart_disease: true,
        personal_surgery_details: 'Cholécystectomie (2012)',
      }),
      patient({ id: 52, fullname: 'Kadra Omar Ismaël', ssn: '1974090311223', gender: 'female', birth: '1974-09-03', height: 160, weight: 70, blood_type: 'A-', family_diabetes: true }),
      patient({ id: 53, fullname: 'Said Hassan Waberi', ssn: '1990120455678', gender: 'male', birth: '1990-12-04', height: 181, weight: 77, active_status: 0, regime: 'CNSS — Salarié (droits suspendus)', address: 'Arta' }),
      patient({ id: 54, fullname: 'Zahra Abdillahi', ssn: '1958021477654', gender: 'female', birth: '1958-02-14', height: 158, weight: 66, address: 'As Eyla, Dikhil', personal_blood_pressure: true }),
      patient({ id: 55, fullname: 'Moussa Houmed Ahmed', ssn: '1949070388112', gender: 'male', birth: '1949-07-03', height: 169, weight: 64, regime: 'CNSS — Pensionné', address: 'Arta', personal_heart_disease: true }),
      patient({ id: 56, fullname: 'Asma Youssouf Dirieh', ssn: '2001101599031', gender: 'female', birth: '2001-10-15', height: 167, weight: 58, email: 'asma.dirieh@mail.dj' }),
      patient({ id: 57, fullname: 'Ibrahim Daoud Hared', ssn: '1967030144210', gender: 'male', birth: '1967-03-01', height: 175, weight: 80, address: 'Randa, Tadjourah', personal_diabetes_type_2: true }),
    ],

    chronic_medications: [
      { id: 'cm-1', patient_id: 51, drug_name: 'Metformine 1000 mg', dosage: '1 comprimé', frequency: '2 fois par jour' },
      { id: 'cm-2', patient_id: 51, drug_name: 'Amlodipine 5 mg', dosage: '1 comprimé', frequency: '1 fois par jour' },
      { id: 'cm-3', patient_id: 43, drug_name: 'Périndopril 5 mg', dosage: '1 comprimé', frequency: '1 fois par jour' },
      { id: 'cm-4', patient_id: 55, drug_name: 'Bisoprolol 2,5 mg', dosage: '1 comprimé', frequency: '1 fois par jour' },
    ],

    past_consultations: [
      { id: 201, patient_id: 51, date: '2026-07-14', doctor_name: 'Dr Amina Hassan', speciality: 'Médecine générale', summary: 'Suivi diabète — HbA1c 7,4 %, renouvellement traitement' },
      { id: 202, patient_id: 51, date: '2026-03-02', doctor_name: 'Dr Amina Hassan', speciality: 'Médecine générale', summary: 'HTA mal contrôlée — ajout Amlodipine 5 mg' },
      { id: 203, patient_id: 42, date: '2026-05-10', doctor_name: 'Dr Amina Hassan', speciality: 'Médecine générale', summary: 'Palpitations occasionnelles — bilan lipidique demandé' },
      { id: 204, patient_id: 55, date: '2026-08-21', doctor_name: 'Dr Ahmed Youssef', speciality: 'Cardiologie', summary: 'Insuffisance cardiaque stable — poursuite bêtabloquant' },
      { id: 205, patient_id: 52, date: '2026-01-18', doctor_name: 'Dr Amina Hassan', speciality: 'Médecine générale', summary: 'Dépistage FINDRISC — risque modéré' },
    ],

    appointments: [
      // Dr Ahmed Youssef — cardiologie
      appointment({ id: 47, patient_id: 52, doctor_id: 7, time: '08:30', mode: 'direct', status: 'completed', reason: 'Contrôle tension' }),
      appointment({ id: 48, patient_id: 42, doctor_id: 7, time: '09:30', mode: 'direct', status: 'waiting_room', reason: 'Palpitations, résultats bilan lipidique' }),
      appointment({ id: 49, patient_id: 51, doctor_id: 7, time: '10:30', mode: 'assisted_cart', site_id: 1, status: 'scheduled', reason: 'Douleurs thoraciques à l’effort' }),
      appointment({ id: 50, patient_id: 53, doctor_id: 7, time: '11:30', mode: 'assisted_cart', site_id: 1, status: 'scheduled', reason: 'Essoufflement' }),
      appointment({ id: 51, patient_id: 56, doctor_id: 7, time: '14:00', mode: 'direct', status: 'scheduled', reason: 'Souffle cardiaque à contrôler' }),
      // Dr Amina Hassan — médecine générale (également médecin référent des missions KalyGo)
      appointment({ id: 60, patient_id: 43, doctor_id: 8, time: '09:00', mode: 'direct', status: 'scheduled', reason: 'Renouvellement traitement HTA' }),
      appointment({ id: 61, patient_id: 55, doctor_id: 8, time: '15:30', mode: 'assisted_cart', site_id: 1, status: 'scheduled', reason: 'Suivi insuffisance cardiaque' }),
      // Présentiel : même agenda que les consultations à distance (cahier §5.2)
      appointment({ id: 52, patient_id: 54, doctor_id: 7, time: '15:00', mode: 'in_person', status: 'scheduled', reason: 'Bilan cardiologique annuel' }),
      appointment({ id: 53, patient_id: 57, doctor_id: 7, time: '16:00', mode: 'in_person', status: 'scheduled', reason: 'Échographie cardiaque de contrôle' }),
      appointment({ id: 62, patient_id: 44, doctor_id: 8, time: '11:00', mode: 'in_person', status: 'scheduled', reason: 'Asthme, renouvellement Ventoline' }),
      // Reste de la semaine (vue Semaine de l’agenda)
      ...weekAppointments(),
    ],

    tele_sessions: [
      { id: 'ts-47', appointment_id: 47, room_name: 'appt-47', status: 'ended', started_at: now, ended_at: now },
      { id: 'ts-48', appointment_id: 48, room_name: 'appt-48', status: 'waiting', started_at: null, ended_at: null },
    ],

    triages: [],
    vital_readings: [],
    ecg_recordings: [],
    device_media: [],
    measurement_requests: [],

    consultation_reports: [
      { id: 'rep-47', appointment_id: 47, doctor_id: 7, chief_complaint: 'Contrôle tension', diagnosis: 'HTA essentielle contrôlée', treatment: 'Poursuite du traitement', notes: '', follow_up: { mode: 'direct', in_days: 90, note: 'Contrôle tensionnel' }, created_at: now },
      // Past days of the week are closed with a short report.
      ...weekAppointments()
        .filter((a) => a.status === 'completed')
        .map((a) => ({
          id: `rep-${a.id}`,
          appointment_id: a.id,
          doctor_id: a.doctor_id,
          chief_complaint: a.reason ?? '',
          diagnosis: 'Examen sans anomalie aiguë',
          treatment: 'Poursuite du traitement habituel',
          notes: '',
          follow_up: null,
          created_at: `${a.date}T${a.time}:00`,
        })),
    ],
    prescriptions: [],
    bilan_requests: [],

    session_messages: [
      { id: 'msg-1', appointment_id: 48, sender_role: 'patient', sender_name: 'Hodan Farah', body: 'Bonjour docteur, j’ai joint mon bilan lipidique.', created_at: now },
    ],
    session_files: [
      { id: 'file-1', appointment_id: 48, uploaded_by_role: 'patient', uploaded_by_name: 'Hodan Farah', name: 'bilan_lipidique.svg', mime: 'image/svg+xml', size: 2380, data_url: labResultSvg, created_at: now },
    ],

    missions: [],
    consents: [],

    sync_logs: [
      { id: 'sl-1', request_id: 'req_seed0047', appointment_id: 47, entity: 'diagnosis', action: 'pushDiagnosis', status: 'success', target: 'myafia_mock', error: null, created_at: now },
    ],
  }
}
