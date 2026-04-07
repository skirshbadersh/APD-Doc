import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getClient,
  getClientConsiderations,
  getClientContacts,
  getClientServices,
  getClientGoals,
  getClientMedications,
} from "@/lib/queries/clients";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Pencil, Calendar, FileText, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { COORDINATION_LABELS, LIVING_LABELS, CONSIDERATION_LABELS } from "@/lib/constants";
import { ContactsTab } from "@/components/clients/contacts-tab";
import { ServicesTab } from "@/components/clients/services-tab";
import { GoalsTab } from "@/components/clients/goals-tab";
import { MedicationsTab } from "@/components/clients/medications-tab";
import { ScheduleOverview } from "@/components/clients/schedule-overview";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientDetailPage({
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
    { data: calendar },
  ] = await Promise.all([
    getClient(supabase, id),
    getClientConsiderations(supabase, id),
    getClientContacts(supabase, id),
    getClientServices(supabase, id),
    getClientGoals(supabase, id),
    getClientMedications(supabase, id),
    supabase.from("annual_calendar").select("*").eq("client_id", id).order("year").order("month"),
  ]);

  if (error || !client) notFound();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {client.first_name} {client.last_name}
            {client.nickname ? ` "${client.nickname}"` : ""}
          </h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary">
              {COORDINATION_LABELS[client.coordination_type] ?? client.coordination_type}
            </Badge>
            <Badge variant="outline">
              {LIVING_LABELS[client.living_setting] ?? client.living_setting}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${id}/calendar`} className={buttonVariants({ variant: "outline" })}>
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Link>
          <Link href={`/clients/${id}/notes`} className={buttonVariants({ variant: "outline" })}>
            <FileText className="h-4 w-4 mr-2" />
            Notes
          </Link>
          <Link href={`/clients/${id}/events`} className={buttonVariants({ variant: "outline" })}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Events
          </Link>
          <Link href={`/clients/${id}/edit`} className={buttonVariants()}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="services">Services ({services?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="goals">Goals ({goals?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="medications">Medications ({medications?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* ---- Overview ---- */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <ScheduleOverview clientId={id} calendar={calendar ?? []} />

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Date of Birth" value={client.dob ? formatDate(client.dob) : null} />
                <Field label="Gender" value={client.gender} />
                <Field label="Medicaid ID" value={client.medicaid_id} />
                <Field label="iConnect ID" value={client.iconnect_id} />
                <Field label="Language" value={client.spoken_language} />
                <Field label="Alt. Communication" value={client.alternate_communication} />
                <Field label="Phone" value={client.phone} />
                <Field label="Email" value={client.email} />
              </dl>
              <Separator className="my-4" />
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    value={
                      [client.address_street, client.address_city, client.address_state, client.address_zip]
                        .filter(Boolean)
                        .join(", ") || null
                    }
                  />
                </div>
                <Field label="Region" value={client.region} />
                <Field label="Legal Status" value={client.legal_status} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Coordination</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field
                  label="SP Effective Date"
                  value={client.sp_effective_date ? formatDate(client.sp_effective_date) : null}
                />
                <Field
                  label="Living Setting"
                  value={LIVING_LABELS[client.living_setting]}
                />
                <Field
                  label="Coordination Type"
                  value={COORDINATION_LABELS[client.coordination_type]}
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diagnoses</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Primary" value={client.primary_diagnosis} />
                <Field label="Secondary" value={client.secondary_diagnosis} />
                <div className="sm:col-span-2">
                  <Field label="Other" value={client.other_diagnoses} />
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Allergies" value={client.allergies} />
                <Field label="Weight" value={client.weight} />
                <Field label="Height" value={client.height} />
                <Field label="IQ" value={client.iq?.toString()} />
              </dl>
            </CardContent>
          </Card>

          {considerations && considerations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Special Considerations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {considerations.map((c) => (
                    <Badge key={c.id} variant="secondary" className="py-1">
                      {CONSIDERATION_LABELS[c.consideration as keyof typeof CONSIDERATION_LABELS] ?? c.consideration}
                      {c.details ? `: ${c.details}` : ""}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Other</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Safety Plan" value={client.has_safety_plan ? "Yes" : "No"} />
                <Field
                  label="Disaster Plan Date"
                  value={client.disaster_plan_date ? formatDate(client.disaster_plan_date) : null}
                />
                <Field label="CDC+ Participant" value={client.is_cdc ? "Yes" : "No"} />
                <Field
                  label="CDC Start Date"
                  value={client.cdc_start_date ? formatDate(client.cdc_start_date) : null}
                />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- CRUD Tabs ---- */}
        <TabsContent value="contacts">
          <ContactsTab clientId={id} initial={contacts ?? []} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab clientId={id} initial={services ?? []} />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsTab clientId={id} initial={goals ?? []} />
        </TabsContent>
        <TabsContent value="medications">
          <MedicationsTab clientId={id} initial={medications ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
