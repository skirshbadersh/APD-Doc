import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClient } from "@/lib/queries/clients";
import { getClientNotes } from "@/lib/queries/notes";
import { NotesListClient } from "@/components/notes/notes-list-client";

export default async function ClientNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client, error } = await getClient(supabase, id);
  if (error || !client) notFound();

  const { data: notes } = await getClientNotes(supabase, id);

  return (
    <NotesListClient
      clientId={id}
      clientName={`${client.first_name} ${client.last_name}`}
      initialNotes={notes ?? []}
    />
  );
}
