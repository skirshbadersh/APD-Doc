import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getClient, getClientConsiderations, getClientContacts,
  getClientServices, getClientGoals, getClientMedications,
} from "@/lib/queries/clients";
import { YearPreviewClient } from "@/components/notes/year-preview-client";

export default async function YearPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: client, error },
    { data: considerations },
    { data: contacts },
    { data: services },
    { data: goals },
    { data: medications },
    { data: profile },
    { data: calendar },
  ] = await Promise.all([
    getClient(supabase, id),
    getClientConsiderations(supabase, id),
    getClientContacts(supabase, id),
    getClientServices(supabase, id),
    getClientGoals(supabase, id),
    getClientMedications(supabase, id),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("annual_calendar").select("*").eq("client_id", id).order("year").order("month"),
  ]);

  if (error || !client) notFound();

  return (
    <YearPreviewClient
      client={client}
      contacts={contacts ?? []}
      services={services ?? []}
      goals={goals ?? []}
      medications={medications ?? []}
      considerations={considerations ?? []}
      profile={profile}
      calendar={calendar ?? []}
    />
  );
}
