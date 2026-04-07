-- Migration: 001_initial_schema.sql
-- APD Documentation Tool — Full database schema
-- Run this in Supabase SQL Editor
--
-- Tables: profiles, clients, client_special_considerations, contacts,
--         services, goals, medications, client_events, progress_notes,
--         annual_calendar
-- Plus: enums, indexes, RLS policies, triggers

-- ============================================
-- Enable UUID generation
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table 1: profiles (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  qo_name TEXT,              -- Qualified Organization name
  qo_phone TEXT,
  qo_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 2: clients
-- ============================================
CREATE TYPE living_setting AS ENUM (
  'family_home', 'group_home', 'supported_living',
  'independent_living', 'facility'
);

CREATE TYPE coordination_type AS ENUM (
  'full_home', 'full_gh', 'full_supported_living', 'limited'
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  dob DATE,
  medicaid_id TEXT,
  iconnect_id TEXT,
  gender TEXT,
  spoken_language TEXT DEFAULT 'English',
  alternate_communication TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT DEFAULT 'FL',
  address_zip TEXT,
  phone TEXT,
  email TEXT,
  region TEXT,
  legal_status TEXT,
  living_setting living_setting NOT NULL DEFAULT 'family_home',
  coordination_type coordination_type NOT NULL DEFAULT 'full_home',
  primary_diagnosis TEXT,
  secondary_diagnosis TEXT,
  other_diagnoses TEXT,
  sp_effective_date DATE,
  allergies TEXT,
  weight TEXT,
  height TEXT,
  iq INTEGER,
  has_safety_plan BOOLEAN DEFAULT FALSE,
  disaster_plan_date DATE,
  is_cdc BOOLEAN DEFAULT FALSE,
  cdc_start_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 3: client_special_considerations
-- ============================================
CREATE TYPE consideration_type AS ENUM (
  'nonverbal', 'limited_verbal', 'wheelchair', 'bedbound',
  'walker', 'incontinent', 'hearing_impaired', 'vision_impaired',
  'low_intellectual_disability', 'high_functioning', 'minor',
  'choking_risk', 'self_injurious', 'gullible_vulnerable',
  'sleep_apnea', 'compression_socks', 'special_diet',
  'no_dme', 'uses_dme'
);

CREATE TABLE client_special_considerations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  consideration consideration_type NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, consideration)
);

-- ============================================
-- Table 4: contacts
-- ============================================
CREATE TYPE contact_type AS ENUM (
  'legal_guardian', 'parent', 'step_parent', 'sibling',
  'grandparent', 'service_provider', 'healthcare_provider',
  'pcp', 'dentist', 'other'
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_type contact_type NOT NULL DEFAULT 'other',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  relationship TEXT,
  organization TEXT,
  email TEXT,
  phone_1 TEXT,
  phone_2 TEXT,
  is_legal_rep BOOLEAN DEFAULT FALSE,
  invite_to_sp_meeting BOOLEAN DEFAULT FALSE,
  is_rep_payee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 5: services
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  procedure_code TEXT,
  service_name TEXT NOT NULL,
  service_code TEXT,
  provider_name TEXT,
  provider_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  begin_date DATE,
  end_date DATE,
  rate DECIMAL(10,2),
  units INTEGER,
  amount DECIMAL(10,2),
  status TEXT,
  notes TEXT,
  fiscal_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 6: goals
-- ============================================
CREATE TYPE goal_status AS ENUM (
  'active', 'achieved', 'discontinued', 'carried_over'
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sp_year TEXT,
  goal_text TEXT NOT NULL,
  service_supporting TEXT,
  paid_or_nonpaid TEXT DEFAULT 'paid',
  progress_notes TEXT,
  status goal_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 7: medications
-- ============================================
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage_frequency TEXT,
  purpose TEXT,
  side_effects TEXT,
  is_supplement BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 8: client_events
-- ============================================
CREATE TYPE event_type AS ENUM (
  'address_change', 'living_setting_change', 'guardian_change',
  'provider_change', 'service_change', 'hospitalization',
  'health_change', 'behavioral_incident', 'goal_change',
  'family_change', 'program_change', 'compliance_event', 'other'
);

CREATE TABLE client_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type event_type NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  documented_in_note_id UUID,  -- FK added after progress_notes table exists
  requires_sp_update BOOLEAN DEFAULT FALSE,
  requires_cp_amendment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table 9: progress_notes
-- ============================================
CREATE TYPE note_contact_type AS ENUM ('FF', 'TC', 'ADM');

CREATE TYPE note_category AS ENUM (
  'monthly_tc', 'monthly_ff', 'quarterly_provider_review',
  'hurricane_season', 'service_auth_new_fy', 'pre_sp_activities',
  'sp_meeting_ff', 'sp_delivery', 'provider_contact',
  'adm_cp_adjustment', 'adm_sa_distribution', 'cdc_related',
  'developing_resources', 'custom'
);

CREATE TYPE note_status AS ENUM (
  'draft', 'reviewed', 'finalized', 'uploaded_to_iconnect'
);

CREATE TABLE progress_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  contact_type note_contact_type NOT NULL,
  contact_with TEXT,
  note_category note_category NOT NULL,
  generated_text TEXT,
  custom_additions TEXT,
  final_text TEXT,         -- generated_text + custom_additions merged
  is_home_visit BOOLEAN DEFAULT FALSE,
  compliance_tags TEXT[],
  status note_status DEFAULT 'draft',
  sp_year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from client_events to progress_notes (deferred due to table order)
ALTER TABLE client_events
  ADD CONSTRAINT fk_documented_in_note
  FOREIGN KEY (documented_in_note_id)
  REFERENCES progress_notes(id) ON DELETE SET NULL;

-- ============================================
-- Table 10: annual_calendar
-- ============================================
CREATE TYPE calendar_entry_status AS ENUM (
  'pending', 'in_progress', 'complete', 'skipped'
);

CREATE TABLE annual_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sp_year TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  required_contact_1_type note_contact_type,
  required_contact_1_category note_category,
  required_contact_1_note_id UUID REFERENCES progress_notes(id) ON DELETE SET NULL,
  required_contact_2_type note_contact_type,
  required_contact_2_category note_category,
  required_contact_2_note_id UUID REFERENCES progress_notes(id) ON DELETE SET NULL,
  is_ff_month BOOLEAN DEFAULT FALSE,
  is_home_visit_month BOOLEAN DEFAULT FALSE,
  is_provider_review_month BOOLEAN DEFAULT FALSE,
  is_hurricane_month BOOLEAN DEFAULT FALSE,
  is_sa_month BOOLEAN DEFAULT FALSE,
  is_pre_sp_month BOOLEAN DEFAULT FALSE,
  is_sp_meeting_month BOOLEAN DEFAULT FALSE,
  is_sp_delivery_month BOOLEAN DEFAULT FALSE,
  status calendar_entry_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, sp_year, month, year)
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_clients_active ON clients(user_id, is_active);
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_services_client ON services(client_id);
CREATE INDEX idx_goals_client ON goals(client_id);
CREATE INDEX idx_medications_client ON medications(client_id);
CREATE INDEX idx_events_client ON client_events(client_id);
CREATE INDEX idx_notes_client ON progress_notes(client_id);
CREATE INDEX idx_notes_date ON progress_notes(client_id, note_date);
CREATE INDEX idx_calendar_client ON annual_calendar(client_id, sp_year);
CREATE INDEX idx_considerations_client ON client_special_considerations(client_id);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_special_considerations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_calendar ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- All other tables: users can only access rows belonging to their clients
-- Pattern: table.client_id -> clients.user_id = auth.uid()
CREATE POLICY "Users access own clients" ON clients
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users access own client data" ON client_special_considerations
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users access own contacts" ON contacts
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users access own services" ON services
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users access own goals" ON goals
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users access own medications" ON medications
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users access own events" ON client_events
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users access own notes" ON progress_notes
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Users access own calendar" ON annual_calendar
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON progress_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
