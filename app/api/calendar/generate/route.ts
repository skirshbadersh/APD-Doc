import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAnnualCalendar } from "@/lib/calendar/generate-calendar";
import type { CoordinationType, LivingSetting } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  try {
    const { client_id } = await request.json();

    if (!client_id) {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("sp_effective_date, coordination_type, living_setting, id")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.sp_effective_date) {
      return NextResponse.json(
        { error: "Client has no SP effective date set" },
        { status: 400 }
      );
    }

    // Delete ALL existing calendar entries for this client
    const spDate = new Date(client.sp_effective_date);
    const spYear = `${spDate.getFullYear()}-${spDate.getFullYear() + 1}`;

    await supabase
      .from("annual_calendar")
      .delete()
      .eq("client_id", client_id);

    // Generate the calendar
    const entries = generateAnnualCalendar({
      sp_effective_date: spDate,
      coordination_type: client.coordination_type as CoordinationType,
      living_setting: client.living_setting as LivingSetting,
    });

    // Insert into database
    const { data: calendar, error: insertError } = await supabase
      .from("annual_calendar")
      .insert(
        entries.map((entry) => ({
          client_id,
          ...entry,
        }))
      )
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ calendar, sp_year: spYear });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
