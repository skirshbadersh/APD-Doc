import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClient } from "@/lib/queries/clients";
import { CalendarGrid } from "@/components/calendar/calendar-grid";

export default async function ClientCalendarPage({
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

  const { data: calendar } = await supabase
    .from("annual_calendar")
    .select("*")
    .eq("client_id", id)
    .order("year", { ascending: true })
    .order("month", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">
        Annual Calendar: {client.first_name} {client.last_name}
      </h1>
      <p className="text-muted-foreground mb-6">
        {client.sp_effective_date
          ? `SP Year: ${new Date(client.sp_effective_date).getFullYear()}-${new Date(client.sp_effective_date).getFullYear() + 1}`
          : "No SP effective date set"}
      </p>
      <CalendarGrid
        clientId={id}
        entries={calendar ?? []}
        hasSpDate={!!client.sp_effective_date}
        spEffectiveMonth={client.sp_effective_date ? new Date(client.sp_effective_date + "T12:00:00").getMonth() + 1 : undefined}
      />
    </div>
  );
}
