"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import toast from "react-hot-toast";
import type { AnnualCalendar, ContactType, NoteCategory, CalendarEntryStatus } from "@/lib/types/database";
import { getRotationTopics, type FocusTopic } from "@/lib/templates/helpers";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CATEGORY_LABELS: Partial<Record<NoteCategory, string>> = {
  monthly_tc: "Monthly TC",
  monthly_ff: "Monthly FF",
  quarterly_provider_review: "Quarterly Review",
  hurricane_season: "Hurricane Prep",
  service_auth_new_fy: "SA Distribution",
  pre_sp_activities: "Pre-SP",
  sp_meeting_ff: "SP Meeting FF",
  sp_delivery: "SP Delivery",
  provider_contact: "Provider Contact",
  adm_cp_adjustment: "CP Adjustment",
  adm_sa_distribution: "SA Distribution",
  cdc_related: "CDC",
  developing_resources: "Resources",
  custom: "Custom",
};

const TOPIC_LABELS: Partial<Record<FocusTopic, string>> = {
  service_satisfaction: "Service satisfaction",
  goal_progress: "Goal progress",
  choose_services_providers: "Choice of providers",
  medication_education: "Medication education",
  daily_routines: "Daily routines",
  community_integration: "Community integration",
  bill_of_rights: "Bill of Rights",
  satisfaction_personal_life: "Life satisfaction",
  health_deep_dive: "Health review",
  ane_education: "ANE education",
  safety_discussion: "Safety",
  natural_community_supports: "Natural supports",
  developing_resources: "Resources",
  choose_where_to_live: "Residential choice",
  choose_to_work: "Employment",
  informed_choice: "Informed choice",
  qsi_education: "QSI education",
  people_treated_fairly: "Fair treatment",
  inclusion: "Inclusion",
  healthcare_provider_satisfaction: "Healthcare satisfaction",
  hipaa_privacy: "HIPAA/Privacy",
};

const STATUS_STYLES: Record<CalendarEntryStatus, string> = {
  pending: "border-yellow-300 bg-yellow-50 dark:bg-yellow-950",
  in_progress: "border-blue-300 bg-blue-50 dark:bg-blue-950",
  complete: "border-green-300 bg-green-50 dark:bg-green-950",
  skipped: "border-gray-300 bg-gray-50 dark:bg-gray-950",
};

function ContactRow({
  slot,
  type,
  category,
  noteId,
  clientId,
  month,
  year,
  halfLabel,
}: {
  slot: 1 | 2;
  type: ContactType | null;
  category: NoteCategory | null;
  noteId: string | null;
  clientId: string;
  month: number;
  year: number;
  halfLabel: string;
}) {
  if (!type || !category) return null;
  const done = !!noteId;
  const variant = type === "FF" ? "default" : type === "ADM" ? "outline" : "secondary";
  return (
    <div className="flex items-center justify-between gap-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] text-muted-foreground w-3 shrink-0">{slot}.</span>
        <Badge variant={variant} className="text-[10px] shrink-0">
          {type} — {CATEGORY_LABELS[category] ?? category}
        </Badge>
        {done && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
      </div>
      {!done && (
        <span className="text-[10px] text-muted-foreground shrink-0">{halfLabel}</span>
      )}
    </div>
  );
}

export function CalendarGrid({
  clientId,
  entries,
  hasSpDate,
  spEffectiveMonth,
}: {
  clientId: string;
  entries: AnnualCalendar[];
  hasSpDate: boolean;
  spEffectiveMonth?: number;
}) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate calendar");
      }
      toast.success("Calendar regenerated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate calendar");
    } finally {
      setRegenerating(false);
    }
  }

  function getMonthInSpYear(entry: AnnualCalendar): number {
    if (!spEffectiveMonth) return 1;
    return ((entry.month - 1 - (spEffectiveMonth - 1) + 12) % 12) + 1;
  }

  if (!hasSpDate) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Set an SP effective date on the client profile to generate a calendar.
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">No calendar entries yet.</p>
        <Button onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Calendar"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Regenerate Calendar
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((entry) => {
          const mInSp = getMonthInSpYear(entry);
          const topics = getRotationTopics(mInSp);
          const now = new Date();
          const isPast = entry.year < now.getFullYear() || (entry.year === now.getFullYear() && entry.month < now.getMonth() + 1);
          const isCurrent = entry.year === now.getFullYear() && entry.month === now.getMonth() + 1;

          return (
            <Card
              key={entry.id}
              className={`border-2 ${STATUS_STYLES[entry.status]} ${isCurrent ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {MONTH_NAMES[entry.month]} {entry.year}
                    {isCurrent && <span className="text-xs font-normal text-primary ml-1">(now)</span>}
                  </CardTitle>
                  <Badge
                    variant={
                      entry.status === "complete"
                        ? "default"
                        : entry.status === "in_progress"
                          ? "secondary"
                          : isPast && entry.status === "pending"
                            ? "destructive"
                            : "outline"
                    }
                    className="text-[10px] capitalize"
                  >
                    {isPast && entry.status === "pending" ? "overdue" : entry.status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {/* Contacts */}
                <div className="space-y-1.5">
                  <ContactRow
                    slot={1}
                    type={entry.required_contact_1_type}
                    category={entry.required_contact_1_category}
                    noteId={entry.required_contact_1_note_id}
                    clientId={clientId}
                    month={entry.month}
                    year={entry.year}
                    halfLabel="1st-15th"
                  />
                  <ContactRow
                    slot={2}
                    type={entry.required_contact_2_type}
                    category={entry.required_contact_2_category}
                    noteId={entry.required_contact_2_note_id}
                    clientId={clientId}
                    month={entry.month}
                    year={entry.year}
                    halfLabel="16th-end"
                  />
                </div>

                {/* Topic preview */}
                {topics.length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    <span className="font-medium">Topics: </span>
                    {topics.map((t) => TOPIC_LABELS[t] ?? t).join(", ")}
                  </div>
                )}

                {/* Start button */}
                {(entry.status === "pending" || entry.status === "in_progress") && (
                  <Link
                    href={`/clients/${clientId}/notes/new?month=${entry.month}&year=${entry.year}`}
                    className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full mt-1"}
                  >
                    {entry.status === "in_progress" ? "Continue" : "Start Notes"}
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
