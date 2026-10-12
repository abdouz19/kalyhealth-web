# MyAfia Connected Care — Web (médecin, infirmier et Direction)

React + TypeScript + Vite + Tailwind v4. Client-side only for now: the backend
(Supabase + LiveKit) is mocked in `src/lib/db/` and will be swapped in later
without changing the screens.

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build
```

## Comptes de démo (mot de passe `demo1234`)

| Compte | Rôle |
|---|---|
| ahmed.youssef@myafia.dj | Médecin cardiologue |
| amina.hassan@myafia.dj | Médecin généraliste, référente des missions KalyGo |
| fatouma.ali@myafia.dj | Infirmière, centre d'Arta (KalyCart) |
| idriss.moussa@myafia.dj | Infirmier, équipe mobile KalyGo |
| direction@myafia.dj | Direction CNSS — Command Center |

Each tab has its own session: open the **doctor** in one tab and the **nurse**
in another — data propagates live between tabs (BroadcastChannel stands in for
Supabase Realtime).
The Direction account opens the national supervision dashboard; campaign and
device fleet figures are illustrative demo data.

## Vidéo (sans serveur)

- Real camera + microphone, real **WebRTC between tabs** of the same browser
  (`src/lib/rtc/PeerRoom.ts`, signalling over BroadcastChannel). Doctor ↔ nurse
  (assisted consultations): up to 3 participants.
- Both sides always use the user's real camera. Until the other side joins, the
  stage shows who is expected (« En attente de connexion »). Camera refused →
  join in audio only.
- Remote sound is **off by default** (feedback on a single computer) — use a headset.
- Will be replaced by LiveKit: only `usePeerRoom` changes.

## Scénarios

- **Brique 1 — directe** : Dr Youssef → Hodan Farah (09:30, en salle d'attente) → Démarrer. Le patient rejoindra depuis l'app Flutter.
- **Brique 2 — KalyCart Arta** : Fatouma Ali → Mohamed Ali Robleh → Patient arrivé → identité → triage →
  Connecter KalyCart → mesures (scénario « douleur thoracique ») → Patient prêt. Dr Youssef voit les
  constantes et l'ECG en direct, peut demander une mesure, puis clôture et synchronise vers MyAfia (mock).
- **KalyGo** : Idriss Moussa → Mission KalyGo → démarrer → chercher « Zahra » → prendre en charge →
  couper le réseau → mesures stockées localement → rétablir → synchronisation. Visible chez Dr Amina Hassan.

Every simulated value carries the « Simulation de démonstration » badge.

## Structure

```
src/
├── lib/
│   ├── types.ts          # domain types = future Supabase tables (MyAfia-shaped)
│   ├── db/               # mock backend: seed, store (db + offline outbox), hooks
│   ├── api/queries.ts    # read hooks   → Supabase queries + Realtime later
│   ├── api/mutations.ts  # writes + role checks (mimic RLS) → Supabase / Edge Functions later
│   └── auth/             # mock staff auth → Supabase Auth later
├── devices/              # KalyCartDriver interface + simulator, synthetic ECG, heart sounds
├── components/           # ui kit, video stage (LiveKit later), clinical widgets
└── features/
    ├── doctor/           # planning, workspace (patient | video | constantes), closure, sync log
    └── nurse/            # centre queue, patient flow (4 steps), KalyGo mission, network toggle
```

## Remplacé à la phase serveur

| Aujourd'hui (mock) | Demain |
|---|---|
| `lib/db/store.ts` + localStorage (demo state) / IndexedDB (KalyGo offline outbox) | Supabase Postgres + RLS |
| BroadcastChannel | Supabase Realtime |
| `AuthContext` + `demo_password` | Supabase Auth (claim `role`) |
| `PeerRoom` (WebRTC between tabs) | LiveKit room (`@livekit/components-react`) |
| `closeConsultation` → `myafia_mock` | Edge Function `close-consultation` → Integration Hub |
| `SimulatedKalyCart` | real `KalyCartDriver` |
