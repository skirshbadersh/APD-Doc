// TypeScript types matching Supabase schema (001_initial_schema.sql)

export type LivingSetting =
  | "family_home"
  | "group_home"
  | "supported_living"
  | "independent_living"
  | "facility";

export type CoordinationType =
  | "full_home"
  | "full_gh"
  | "full_supported_living"
  | "limited";

export type Gender = "male" | "female";

export type ContactType = "FF" | "TC" | "ADM";

export type NoteCategory =
  | "monthly_tc"
  | "monthly_ff"
  | "quarterly_provider_review"
  | "hurricane_season"
  | "service_auth_new_fy"
  | "pre_sp_activities"
  | "sp_meeting_ff"
  | "sp_delivery"
  | "provider_contact"
  | "adm_cp_adjustment"
  | "adm_sa_distribution"
  | "cdc_related"
  | "developing_resources"
  | "custom";

export type NoteStatus = "draft" | "reviewed" | "finalized" | "uploaded_to_iconnect";

export type GoalStatus = "active" | "achieved" | "discontinued" | "carried_over";

export type CalendarEntryStatus = "pending" | "in_progress" | "complete" | "skipped";

export type SpecialConsideration =
  | "nonverbal"
  | "limited_verbal"
  | "wheelchair"
  | "bedbound"
  | "walker"
  | "incontinent"
  | "hearing_impaired"
  | "vision_impaired"
  | "low_intellectual_disability"
  | "high_functioning"
  | "minor"
  | "choking_risk"
  | "self_injurious"
  | "gullible_vulnerable"
  | "sleep_apnea"
  | "compression_socks"
  | "special_diet"
  | "no_dme"
  | "uses_dme";

export type ContactTypeEnum =
  | "legal_guardian"
  | "parent"
  | "step_parent"
  | "sibling"
  | "grandparent"
  | "service_provider"
  | "healthcare_provider"
  | "pcp"
  | "dentist"
  | "other";

export type EventType =
  | "address_change"
  | "living_setting_change"
  | "guardian_change"
  | "provider_change"
  | "service_change"
  | "hospitalization"
  | "health_change"
  | "behavioral_incident"
  | "goal_change"
  | "family_change"
  | "program_change"
  | "compliance_event"
  | "other";

// ---- Table interfaces ----

export interface Profile {
  id: string;
  full_name: string;
  qo_name: string | null;
  qo_phone: string | null;
  qo_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  dob: string | null;
  medicaid_id: string | null;
  iconnect_id: string | null;
  gender: string | null;
  spoken_language: string;
  alternate_communication: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string;
  address_zip: string | null;
  phone: string | null;
  email: string | null;
  region: string | null;
  legal_status: string | null;
  living_setting: LivingSetting;
  coordination_type: CoordinationType;
  primary_diagnosis: string | null;
  secondary_diagnosis: string | null;
  other_diagnoses: string | null;
  sp_effective_date: string | null;
  allergies: string | null;
  weight: string | null;
  height: string | null;
  iq: number | null;
  has_safety_plan: boolean;
  disaster_plan_date: string | null;
  is_cdc: boolean;
  cdc_start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientSpecialConsideration {
  id: string;
  client_id: string;
  consideration: SpecialConsideration;
  details: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  client_id: string;
  contact_type: ContactTypeEnum;
  first_name: string;
  last_name: string;
  relationship: string | null;
  organization: string | null;
  email: string | null;
  phone_1: string | null;
  phone_2: string | null;
  is_legal_rep: boolean;
  invite_to_sp_meeting: boolean;
  is_rep_payee: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  client_id: string;
  procedure_code: string | null;
  service_name: string;
  service_code: string | null;
  provider_name: string | null;
  provider_contact_id: string | null;
  begin_date: string | null;
  end_date: string | null;
  rate: number | null;
  units: number | null;
  amount: number | null;
  status: string | null;
  notes: string | null;
  fiscal_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  client_id: string;
  sp_year: string | null;
  goal_text: string;
  service_supporting: string | null;
  paid_or_nonpaid: string;
  progress_notes: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  client_id: string;
  medication_name: string;
  dosage_frequency: string | null;
  purpose: string | null;
  side_effects: string | null;
  is_supplement: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientEvent {
  id: string;
  client_id: string;
  event_date: string;
  event_type: EventType;
  description: string;
  documented_in_note_id: string | null;
  requires_sp_update: boolean;
  requires_cp_amendment: boolean;
  created_at: string;
}

export interface ProgressNote {
  id: string;
  client_id: string;
  note_date: string;
  contact_type: ContactType;
  contact_with: string | null;
  note_category: NoteCategory;
  generated_text: string | null;
  custom_additions: string | null;
  final_text: string | null;
  is_home_visit: boolean;
  compliance_tags: string[] | null;
  status: NoteStatus;
  sp_year: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnualCalendar {
  id: string;
  client_id: string;
  sp_year: string;
  month: number;
  year: number;
  required_contact_1_type: ContactType | null;
  required_contact_1_category: NoteCategory | null;
  required_contact_1_note_id: string | null;
  required_contact_2_type: ContactType | null;
  required_contact_2_category: NoteCategory | null;
  required_contact_2_note_id: string | null;
  is_ff_month: boolean;
  is_home_visit_month: boolean;
  is_provider_review_month: boolean;
  is_hurricane_month: boolean;
  is_sa_month: boolean;
  is_pre_sp_month: boolean;
  is_sp_meeting_month: boolean;
  is_sp_delivery_month: boolean;
  status: CalendarEntryStatus;
  created_at: string;
}
