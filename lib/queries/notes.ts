import type { SupabaseClient } from "@supabase/supabase-js";

export async function getClientNotes(supabase: SupabaseClient, clientId: string) {
  return supabase
    .from("progress_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("note_date", { ascending: false });
}

export async function getNote(supabase: SupabaseClient, noteId: string) {
  return supabase
    .from("progress_notes")
    .select("*")
    .eq("id", noteId)
    .single();
}

/**
 * After saving a note, link it to the calendar entry and update status.
 */
export async function linkNoteToCalendar(
  supabase: SupabaseClient,
  clientId: string,
  noteId: string,
  month: number,
  year: number,
  contactSlot: 1 | 2
) {
  // Find the calendar entry for this client/month/year
  const { data: calEntry } = await supabase
    .from("annual_calendar")
    .select("*")
    .eq("client_id", clientId)
    .eq("month", month)
    .eq("year", year)
    .single();

  if (!calEntry) return;

  const updateField = contactSlot === 1
    ? { required_contact_1_note_id: noteId }
    : { required_contact_2_note_id: noteId };

  await supabase
    .from("annual_calendar")
    .update(updateField)
    .eq("id", calEntry.id);

  // Check if both contacts are done → mark complete
  const updated = { ...calEntry, ...updateField };
  const contact1Done = !!updated.required_contact_1_note_id || !updated.required_contact_1_type;
  const contact2Done = !!updated.required_contact_2_note_id || !updated.required_contact_2_type;

  if (contact1Done && contact2Done) {
    await supabase
      .from("annual_calendar")
      .update({ status: "complete" })
      .eq("id", calEntry.id);
  } else {
    await supabase
      .from("annual_calendar")
      .update({ status: "in_progress" })
      .eq("id", calEntry.id);
  }
}

/**
 * Determine which contact slot (1 or 2) a note matches in the calendar.
 */
export function matchContactSlot(
  calEntry: { required_contact_1_category: string | null; required_contact_2_category: string | null; required_contact_1_note_id: string | null; required_contact_2_note_id: string | null },
  noteCategory: string
): 1 | 2 {
  if (calEntry.required_contact_1_category === noteCategory && !calEntry.required_contact_1_note_id) return 1;
  if (calEntry.required_contact_2_category === noteCategory && !calEntry.required_contact_2_note_id) return 2;
  // Default: fill whichever slot is empty
  if (!calEntry.required_contact_1_note_id) return 1;
  return 2;
}
