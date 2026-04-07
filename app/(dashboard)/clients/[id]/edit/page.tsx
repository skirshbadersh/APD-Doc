import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClient, getClientConsiderations } from "@/lib/queries/clients";
import { ClientForm } from "@/components/clients/client-form";

export default async function EditClientPage({
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

  const { data: considerations } = await getClientConsiderations(supabase, id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Edit: {client.first_name} {client.last_name}
      </h1>
      <ClientForm
        mode="edit"
        client={client}
        existingConsiderations={considerations}
        userId={user.id}
      />
    </div>
  );
}
