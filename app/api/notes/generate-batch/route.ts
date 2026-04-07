import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNote } from "@/lib/templates";
import { snapToWeekday } from "@/lib/calendar/weekday-utils";
import { getMonthInSpYear } from "@/lib/templates/helpers";
import type { TemplateContext } from "@/lib/templates/types";
import type { ContactType, NoteCategory } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  try {
    const { month, year } = await request.json();
    if (!month || !year) {
      return NextResponse.json({ error: "month and year are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch pending calendar entries for this month
    const { data: calEntries } = await supabase
      .from("annual_calendar")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .in("status", ["pending", "in_progress"]);

    if (!calEntries || calEntries.length === 0) {
      return NextResponse.json({ generated: 0 });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    let generated = 0;

    for (const cal of calEntries) {
      // For each unfilled contact slot, generate a draft
      const slots: Array<{ type: ContactType; category: NoteCategory; slot: 1 | 2 }> = [];

      if (cal.required_contact_1_type && !cal.required_contact_1_note_id) {
        slots.push({ type: cal.required_contact_1_type, category: cal.required_contact_1_category, slot: 1 });
      }
      if (cal.required_contact_2_type && !cal.required_contact_2_note_id) {
        slots.push({ type: cal.required_contact_2_type, category: cal.required_contact_2_category, slot: 2 });
      }

      if (slots.length === 0) continue;

      // Fetch client data
      const [
        { data: client },
        { data: contacts },
        { data: services },
        { data: goals },
        { data: medications },
        { data: considerations },
      ] = await Promise.all([
        supabase.from("clients").select("*").eq("id", cal.client_id).single(),
        supabase.from("contacts").select("*").eq("client_id", cal.client_id),
        supabase.from("services").select("*").eq("client_id", cal.client_id),
        supabase.from("goals").select("*").eq("client_id", cal.client_id),
        supabase.from("medications").select("*").eq("client_id", cal.client_id),
        supabase.from("client_special_considerations").select("*").eq("client_id", cal.client_id),
      ]);

      if (!client) continue;

      const lg = (contacts ?? []).find((c: any) => c.is_legal_rep);
      const contactWith = lg
        ? `${client.first_name} ${client.last_name} and ${lg.first_name} ${lg.last_name}`
        : `${client.first_name} ${client.last_name}`;

      // Generate a weekday date for this note
      const noteDate = snapToWeekday(new Date(year, month - 1, 10)); // 10th of the month as default

      for (const { type, category, slot } of slots) {
        const ctx: TemplateContext = {
          client,
          contacts: contacts ?? [],
          services: services ?? [],
          goals: goals ?? [],
          medications: medications ?? [],
          considerations: considerations ?? [],
          events: [],
          profile: profile ?? { id: "", full_name: "WSC", qo_name: null, qo_phone: null, qo_email: null, created_at: "", updated_at: "" },
          noteDate,
          contactType: type,
          noteCategory: category,
          isHomeVisit: cal.is_home_visit_month && type === "FF",
          contactWith,
          spYear: cal.sp_year,
          monthInSpYear: getMonthInSpYear(noteDate, client.sp_effective_date),
          contactSlot: slot,
        };

        const text = generateNote(category, ctx) || `[Draft — ${type} ${category}]`;

        const { data: note } = await supabase
          .from("progress_notes")
          .insert({
            client_id: cal.client_id,
            note_date: noteDate.toISOString().split("T")[0],
            contact_type: type,
            contact_with: contactWith,
            note_category: category,
            generated_text: text,
            final_text: text,
            is_home_visit: cal.is_home_visit_month && type === "FF",
            status: "draft",
            sp_year: cal.sp_year,
          })
          .select()
          .single();

        if (note) {
          // Link to calendar
          const updateField = slot === 1
            ? { required_contact_1_note_id: note.id }
            : { required_contact_2_note_id: note.id };
          await supabase.from("annual_calendar").update(updateField).eq("id", cal.id);
          generated++;
        }
      }

      // Update calendar status
      await supabase.from("annual_calendar").update({ status: "in_progress" }).eq("id", cal.id);
    }

    return NextResponse.json({ generated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
