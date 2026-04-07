import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClient } from "@/lib/queries/clients";
import { getNote } from "@/lib/queries/notes";
import { NoteViewClient } from "@/components/notes/note-view-client";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { id, noteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client, error: clientErr } = await getClient(supabase, id);
  if (clientErr || !client) notFound();

  const { data: note, error: noteErr } = await getNote(supabase, noteId);
  if (noteErr || !note) notFound();

  return (
    <NoteViewClient client={client} note={note} />
  );
}
