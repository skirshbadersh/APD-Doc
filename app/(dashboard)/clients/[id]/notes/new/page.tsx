import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getClient, getClientConsiderations, getClientContacts,
  getClientServices, getClientGoals, getClientMedications,
} from "@/lib/queries/clients";
import { NoteGeneratorClient } from "@/components/notes/note-generator-client";

export default async function NewNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Determine month/year (from query params or current date)
  const now = new Date();
  const month = sp.month ? parseInt(sp.month) : now.getMonth() + 1;
  const year = sp.year ? parseInt(sp.year) : now.getFullYear();

  const [
    { data: client, error },
    { data: considerations },
    { data: contacts },
    { data: services },
    { data: goals },
    { data: medications },
    { data: profile },
    { data: calendarEntry },
    { data: events },
  ] = await Promise.all([
    getClient(supabase, id),
    getClientConsiderations(supabase, id),
    getClientContacts(supabase, id),
    getClientServices(supabase, id),
    getClientGoals(supabase, id),
    getClientMedications(supabase, id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("annual_calendar")
      .select("*")
      .eq("client_id", id)
      .eq("month", month)
      .eq("year", year)
      .single(),
    supabase
      .from("client_events")
      .select("*")
      .eq("client_id", id)
      .is("documented_in_note_id", null)
      .order("event_date", { ascending: false }),
  ]);

  if (error || !client) notFound();

  return (
    <NoteGeneratorClient
      client={client}
      contacts={contacts ?? []}
      services={services ?? []}
      goals={goals ?? []}
      medications={medications ?? []}
      considerations={considerations ?? []}
      events={events ?? []}
      profile={profile}
      calendarEntry={calendarEntry}
      month={month}
      year={year}
    />
  );
}
