import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClient } from "@/lib/queries/clients";
import { EventsClient } from "@/components/events/events-client";

export default async function ClientEventsPage({
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

  const { data: events } = await supabase
    .from("client_events")
    .select("*")
    .eq("client_id", id)
    .order("event_date", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">
        Events: {client.first_name} {client.last_name}
      </h1>
      <p className="text-muted-foreground mb-6">
        Track real-life changes that affect progress notes
      </p>
      <EventsClient clientId={id} initial={events ?? []} />
    </div>
  );
}
