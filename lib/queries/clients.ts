import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, ClientSpecialConsideration, SpecialConsideration } from "@/lib/types/database";

export async function getClients(supabase: SupabaseClient) {
  return supabase
    .from("clients")
    .select("*")
    .eq("is_active", true)
    .order("last_name", { ascending: true });
}

export async function getClient(supabase: SupabaseClient, id: string) {
  return supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
}

export async function getClientConsiderations(supabase: SupabaseClient, clientId: string) {
  return supabase
    .from("client_special_considerations")
    .select("*")
    .eq("client_id", clientId);
}

export async function getClientContacts(supabase: SupabaseClient, clientId: string) {
  return supabase
    .from("contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("is_legal_rep", { ascending: false });
}

export async function getClientServices(supabase: SupabaseClient, clientId: string) {
  return supabase
    .from("services")
    .select("*")
    .eq("client_id", clientId)
    .order("service_name");
}

export async function getClientGoals(supabase: SupabaseClient, clientId: string) {
  return supabase
    .from("goals")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
}

export async function getClientMedications(supabase: SupabaseClient, clientId: string) {
  return supabase
    .from("medications")
    .select("*")
    .eq("client_id", clientId)
    .order("medication_name");
}

export type ClientFormData = {
  first_name: string;
  last_name: string;
  nickname: string;
  dob: string;
  gender: string;
  medicaid_id: string;
  iconnect_id: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  phone: string;
  email: string;
  region: string;
  spoken_language: string;
  alternate_communication: string;
  living_setting: string;
  coordination_type: string;
  sp_effective_date: string;
  primary_diagnosis: string;
  secondary_diagnosis: string;
  other_diagnoses: string;
  legal_status: string;
  allergies: string;
  weight: string;
  height: string;
  iq: string;
  has_safety_plan: boolean;
  disaster_plan_date: string;
  is_cdc: boolean;
  cdc_start_date: string;
};

export type ConsiderationEntry = {
  consideration: SpecialConsideration;
  checked: boolean;
  details: string;
};

export type ExtractedSubData = {
  contacts?: Array<Record<string, unknown>>;
  goals?: Array<Record<string, unknown>>;
  medications?: Array<Record<string, unknown>>;
  services?: Array<Record<string, unknown>>;
};

export async function createClient(
  supabase: SupabaseClient,
  userId: string,
  formData: ClientFormData,
  considerations: ConsiderationEntry[],
  extractedSubData?: ExtractedSubData
) {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      user_id: userId,
      first_name: formData.first_name,
      last_name: formData.last_name,
      nickname: formData.nickname || null,
      dob: formData.dob || null,
      gender: formData.gender || null,
      medicaid_id: formData.medicaid_id || null,
      iconnect_id: formData.iconnect_id || null,
      address_street: formData.address_street || null,
      address_city: formData.address_city || null,
      address_state: formData.address_state || "FL",
      address_zip: formData.address_zip || null,
      phone: formData.phone || null,
      email: formData.email || null,
      region: formData.region || null,
      spoken_language: formData.spoken_language || "English",
      alternate_communication: formData.alternate_communication || null,
      living_setting: formData.living_setting || "family_home",
      coordination_type: formData.coordination_type || "full_home",
      sp_effective_date: formData.sp_effective_date || null,
      primary_diagnosis: formData.primary_diagnosis || null,
      secondary_diagnosis: formData.secondary_diagnosis || null,
      other_diagnoses: formData.other_diagnoses || null,
      legal_status: formData.legal_status || null,
      allergies: formData.allergies || null,
      weight: formData.weight || null,
      height: formData.height || null,
      iq: formData.iq ? parseInt(formData.iq) : null,
      has_safety_plan: formData.has_safety_plan,
      disaster_plan_date: formData.disaster_plan_date || null,
      is_cdc: formData.is_cdc,
      cdc_start_date: formData.cdc_start_date || null,
    })
    .select()
    .single();

  if (clientError) return { data: null, error: clientError };

  const checked = considerations.filter((c) => c.checked);
  if (checked.length > 0) {
    const { error: consError } = await supabase
      .from("client_special_considerations")
      .insert(
        checked.map((c) => ({
          client_id: client.id,
          consideration: c.consideration,
          details: c.details || null,
        }))
      );
    if (consError) return { data: client, error: consError };
  }

  // Save extracted sub-table data (contacts, goals, medications)
  if (extractedSubData) {
    if (extractedSubData.contacts?.length) {
      await supabase.from("contacts").insert(
        extractedSubData.contacts.map((c) => ({ ...c, client_id: client.id }))
      );
    }
    if (extractedSubData.goals?.length) {
      await supabase.from("goals").insert(
        extractedSubData.goals.map((g) => ({ ...g, client_id: client.id }))
      );
    }
    if (extractedSubData.medications?.length) {
      await supabase.from("medications").insert(
        extractedSubData.medications.map((m) => ({ ...m, client_id: client.id }))
      );
    }
    if (extractedSubData.services?.length) {
      await supabase.from("services").insert(
        extractedSubData.services.map((s) => ({ ...s, client_id: client.id }))
      );
    }
  }

  return { data: client, error: null };
}

export async function updateClient(
  supabase: SupabaseClient,
  clientId: string,
  formData: ClientFormData,
  considerations: ConsiderationEntry[]
) {
  const { error: clientError } = await supabase
    .from("clients")
    .update({
      first_name: formData.first_name,
      last_name: formData.last_name,
      nickname: formData.nickname || null,
      dob: formData.dob || null,
      gender: formData.gender || null,
      medicaid_id: formData.medicaid_id || null,
      iconnect_id: formData.iconnect_id || null,
      address_street: formData.address_street || null,
      address_city: formData.address_city || null,
      address_state: formData.address_state || "FL",
      address_zip: formData.address_zip || null,
      phone: formData.phone || null,
      email: formData.email || null,
      region: formData.region || null,
      spoken_language: formData.spoken_language || "English",
      alternate_communication: formData.alternate_communication || null,
      living_setting: formData.living_setting || "family_home",
      coordination_type: formData.coordination_type || "full_home",
      sp_effective_date: formData.sp_effective_date || null,
      primary_diagnosis: formData.primary_diagnosis || null,
      secondary_diagnosis: formData.secondary_diagnosis || null,
      other_diagnoses: formData.other_diagnoses || null,
      legal_status: formData.legal_status || null,
      allergies: formData.allergies || null,
      weight: formData.weight || null,
      height: formData.height || null,
      iq: formData.iq ? parseInt(formData.iq) : null,
      has_safety_plan: formData.has_safety_plan,
      disaster_plan_date: formData.disaster_plan_date || null,
      is_cdc: formData.is_cdc,
      cdc_start_date: formData.cdc_start_date || null,
    })
    .eq("id", clientId);

  if (clientError) return { error: clientError };

  // Delete existing considerations and re-insert checked ones
  await supabase
    .from("client_special_considerations")
    .delete()
    .eq("client_id", clientId);

  const checked = considerations.filter((c) => c.checked);
  if (checked.length > 0) {
    const { error: consError } = await supabase
      .from("client_special_considerations")
      .insert(
        checked.map((c) => ({
          client_id: clientId,
          consideration: c.consideration,
          details: c.details || null,
        }))
      );
    if (consError) return { error: consError };
  }

  return { error: null };
}
