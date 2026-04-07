import type { ClientFormData, ConsiderationEntry } from "@/lib/queries/clients";
import type { SpecialConsideration } from "@/lib/types/database";
import { ALL_CONSIDERATIONS } from "@/lib/constants";

export const SP_SYSTEM_PROMPT = `You are a data extraction assistant for Florida APD Person-Centered Support Plans.
The uploaded document is a standardized iConnect form (Person-Centered Support Plan eff 11/04/2021).

Extract ALL client data into the following JSON structure. Be thorough — read every page.
For special_considerations, read the needs/risks descriptions in the 'Other Services Needed for Health and Safety' section and infer which flags apply based on the content.

Return ONLY valid JSON with no markdown formatting, no backticks, no explanation.
If a field is not found in the document, use null.

JSON schema:
{
  "client": {
    "first_name": string,
    "last_name": string,
    "nickname": string | null,
    "dob": "YYYY-MM-DD" | null,
    "medicaid_id": string | null,
    "iconnect_id": string | null,
    "gender": "male" | "female" | null,
    "spoken_language": string | null,
    "alternate_communication": string | null,
    "address_street": string | null,
    "address_city": string | null,
    "address_state": string | null,
    "address_zip": string | null,
    "phone": string | null,
    "email": string | null,
    "region": string | null,
    "legal_status": string | null,
    "living_setting": "family_home" | "group_home" | "supported_living" | "independent_living" | "facility",
    "primary_diagnosis": string | null,
    "secondary_diagnosis": string | null,
    "other_diagnoses": string | null,
    "sp_effective_date": "YYYY-MM-DD" | null,
    "allergies": string | null,
    "weight": string | null,
    "height": string | null,
    "iq": number | null,
    "has_safety_plan": boolean,
    "disaster_plan_date": "YYYY-MM-DD" | null
  },
  "special_considerations": [
    {
      "consideration": string (one of: "nonverbal", "limited_verbal", "wheelchair", "bedbound", "walker", "incontinent", "hearing_impaired", "vision_impaired", "low_intellectual_disability", "high_functioning", "minor", "choking_risk", "self_injurious", "gullible_vulnerable", "sleep_apnea", "compression_socks", "special_diet", "no_dme", "uses_dme"),
      "details": string (brief reason from the SP text)
    }
  ],
  "contacts": [
    {
      "contact_type": string (one of: "legal_guardian", "parent", "step_parent", "sibling", "grandparent", "service_provider", "healthcare_provider", "pcp", "dentist", "other"),
      "first_name": string,
      "last_name": string,
      "relationship": string | null,
      "organization": string | null,
      "email": string | null,
      "phone_1": string | null,
      "phone_2": string | null,
      "is_legal_rep": boolean,
      "invite_to_sp_meeting": boolean,
      "is_rep_payee": boolean
    }
  ],
  "goals": [
    {
      "goal_text": string,
      "service_supporting": string | null,
      "paid_or_nonpaid": "paid" | "nonpaid",
      "status": "active"
    }
  ],
  "medications": [
    {
      "medication_name": string,
      "dosage_frequency": string | null,
      "purpose": string | null,
      "side_effects": string | null,
      "is_supplement": boolean
    }
  ]
}`;

export interface SpExtractionResult {
  client: Partial<Record<keyof ClientFormData, string | number | boolean | null>>;
  special_considerations: Array<{ consideration: string; details: string }>;
  contacts: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  medications: Array<Record<string, unknown>>;
}

export function extractedToFormData(result: SpExtractionResult): ClientFormData {
  const c = result.client;
  return {
    first_name: str(c.first_name),
    last_name: str(c.last_name),
    nickname: str(c.nickname),
    dob: str(c.dob),
    gender: str(c.gender),
    medicaid_id: str(c.medicaid_id),
    iconnect_id: str(c.iconnect_id),
    address_street: str(c.address_street),
    address_city: str(c.address_city),
    address_state: str(c.address_state) || "FL",
    address_zip: str(c.address_zip),
    phone: str(c.phone),
    email: str(c.email),
    region: str(c.region),
    spoken_language: str(c.spoken_language) || "English",
    alternate_communication: str(c.alternate_communication),
    living_setting: str(c.living_setting) || "family_home",
    coordination_type: "full_home", // not in SP — user sets manually
    sp_effective_date: str(c.sp_effective_date),
    primary_diagnosis: str(c.primary_diagnosis),
    secondary_diagnosis: str(c.secondary_diagnosis),
    other_diagnoses: str(c.other_diagnoses),
    legal_status: str(c.legal_status),
    allergies: str(c.allergies),
    weight: str(c.weight),
    height: str(c.height),
    iq: c.iq != null ? String(c.iq) : "",
    has_safety_plan: Boolean(c.has_safety_plan),
    disaster_plan_date: str(c.disaster_plan_date),
    is_cdc: false,
    cdc_start_date: "",
  };
}

export function extractedToConsiderations(
  result: SpExtractionResult
): ConsiderationEntry[] {
  const extracted = new Map(
    result.special_considerations.map((sc) => [sc.consideration, sc.details])
  );
  return ALL_CONSIDERATIONS.map((key) => ({
    consideration: key,
    checked: extracted.has(key),
    details: extracted.get(key) ?? "",
  }));
}

function str(val: unknown): string {
  if (val == null) return "";
  return String(val);
}
