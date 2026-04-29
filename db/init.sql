CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'patient');

CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  specialty text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  slug text UNIQUE,
  portrait_url text,
  hospital text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  languages text[] NOT NULL DEFAULT '{}',
  license_number text NOT NULL DEFAULT '',
  license_authority text NOT NULL DEFAULT '',
  years_experience int NOT NULL DEFAULT 0,
  avg_response_minutes int NOT NULL DEFAULT 28,
  training jsonb NOT NULL DEFAULT '[]',
  affiliations jsonb NOT NULL DEFAULT '[]',
  publications jsonb NOT NULL DEFAULT '[]',
  cases jsonb NOT NULL DEFAULT '[]',
  testimonials jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS consults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  title text NOT NULL,
  price_cents int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES doctors(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  notes text[] NOT NULL DEFAULT '{}',
  medicines text[] NOT NULL DEFAULT '{}',
  prescriptions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE,
  email text UNIQUE NOT NULL,
  hashed_pw text NOT NULL,
  role user_role NOT NULL,
  doctor_id uuid REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE TYPE appointment_status AS ENUM ('pending','accepted','rejected','completed');

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consult_id uuid NOT NULL REFERENCES consults(id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  price_cents int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  request_id text NOT NULL,
  actor_sub text,
  actor_role text,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  method text NOT NULL,
  path text NOT NULL,
  ip text,
  user_agent text
);

CREATE TYPE chat_sender AS ENUM ('patient','doctor');

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  sender chat_sender NOT NULL,
  message text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consults ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: the app sets a per-request setting app.current_doctor_id.
-- Admin bypass via app.is_admin = 'true'.

CREATE POLICY doctors_admin_all ON doctors
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');

CREATE POLICY consults_doctor_own ON consults
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR doctor_id::text = current_setting('app.current_doctor_id', true)
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR doctor_id::text = current_setting('app.current_doctor_id', true)
  );

CREATE POLICY patients_doctor_own ON patients
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR doctor_id::text = current_setting('app.current_doctor_id', true)
    OR id::text = current_setting('app.current_patient_id', true)
    OR doctor_id IS NULL
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR doctor_id::text = current_setting('app.current_doctor_id', true)
    OR id::text = current_setting('app.current_patient_id', true)
    OR doctor_id IS NULL
  );

CREATE POLICY appointments_doctor_own ON appointments
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR doctor_id::text = current_setting('app.current_doctor_id', true)
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR doctor_id::text = current_setting('app.current_doctor_id', true)
  );

CREATE POLICY chat_messages_doctor_own ON chat_messages
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = chat_messages.appointment_id
      AND appointments.doctor_id::text = current_setting('app.current_doctor_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = chat_messages.appointment_id
      AND appointments.doctor_id::text = current_setting('app.current_doctor_id', true)
    )
  );
