"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { AnnualCalendar, NoteCategory } from "@/lib/types/database";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const CAT_LABELS: Partial<Record<NoteCategory, string>> = {
  monthly_tc: "Monthly TC",
  monthly_ff: "Monthly FF",
  quarterly_provider_review: "Quarterly Review",
  hurricane_season: "Hurricane Prep",
  service_auth_new_fy: "SA Distribution",
  pre_sp_activities: "Pre-SP",
  sp_meeting_ff: "SP Meeting FF",
  sp_delivery: "SP Delivery",
};

function monthsAway(entry: AnnualCalendar): string {
  const now = new Date();
  const entryDate = new Date(entry.year, entry.month - 1, 1);
  const diff = (entryDate.getFullYear() - now.getFullYear()) * 12 + entryDate.getMonth() - now.getMonth();
  if (diff === 0) return "this month";
  if (diff === 1) return "next month";
  if (diff < 0) return `${Math.abs(diff)} month${Math.abs(diff) > 1 ? "s" : ""} ago`;
  return `in ${diff} month${diff > 1 ? "s" : ""}`;
}

export function ScheduleOverview({
  clientId,
  calendar,
}: {
  clientId: string;
  calendar: AnnualCalendar[];
}) {
  if (calendar.length === 0) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentEntry = calendar.find((e) => e.month === currentMonth && e.year === currentYear);
  const nextFF = calendar.find((e) => e.is_ff_month && !e.required_contact_1_note_id && (e.year > currentYear || (e.year === currentYear && e.month >= currentMonth)));
  const nextHomeVisit = calendar.find((e) => e.is_home_visit_month && (e.year > currentYear || (e.year === currentYear && e.month >= currentMonth)));
  const nextSpMeeting = calendar.find((e) => e.is_sp_meeting_month);
  const nextSpDelivery = calendar.find((e) => e.is_sp_delivery_month);

  // Overdue entries
  const overdue = calendar.filter(
    (e) => e.status === "pending" && (e.year < currentYear || (e.year === currentYear && e.month < currentMonth))
  );

  // Current month progress
  let currentDone = 0;
  let currentTotal = 0;
  if (currentEntry) {
    if (currentEntry.required_contact_1_type) { currentTotal++; if (currentEntry.required_contact_1_note_id) currentDone++; }
    if (currentEntry.required_contact_2_type) { currentTotal++; if (currentEntry.required_contact_2_note_id) currentDone++; }
  }

  // Find what's due now (first unfilled slot this month)
  let dueNowType: string | null = null;
  let dueNowCat: string | null = null;
  let dueNowSlot: 1 | 2 = 1;
  if (currentEntry) {
    if (currentEntry.required_contact_1_type && !currentEntry.required_contact_1_note_id) {
      dueNowType = currentEntry.required_contact_1_type;
      dueNowCat = currentEntry.required_contact_1_category;
      dueNowSlot = 1;
    } else if (currentEntry.required_contact_2_type && !currentEntry.required_contact_2_note_id) {
      dueNowType = currentEntry.required_contact_2_type;
      dueNowCat = currentEntry.required_contact_2_category;
      dueNowSlot = 2;
    }
  }

  // Special flags this month
  const flags: string[] = [];
  if (currentEntry?.is_ff_month) flags.push("FF Due");
  if (currentEntry?.is_home_visit_month) flags.push("Home Visit");
  if (currentEntry?.is_hurricane_month) flags.push("Hurricane Prep");
  if (currentEntry?.is_provider_review_month) flags.push("Provider Review");
  if (currentEntry?.is_sa_month) flags.push("SA Month");
  if (currentEntry?.is_pre_sp_month) flags.push("Pre-SP");
  if (currentEntry?.is_sp_meeting_month) flags.push("SP Meeting");
  if (currentEntry?.is_sp_delivery_month) flags.push("SP Delivery");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Schedule Overview</span>
          {currentEntry && (
            <span className="text-sm font-normal text-muted-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear} — {currentDone} of {currentTotal} contacts complete
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue */}
        {overdue.length > 0 && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950 rounded-md p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {overdue.length} overdue contact{overdue.length > 1 ? "s" : ""} from prior months
            </span>
          </div>
        )}

        {/* Due now */}
        {dueNowType && dueNowCat ? (
          <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-950 rounded-md p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="text-sm font-medium">
                Due now: {dueNowType} — {CAT_LABELS[dueNowCat as NoteCategory] ?? dueNowCat}
              </span>
            </div>
            <Link
              href={`/clients/${clientId}/notes/new?month=${currentMonth}&year=${currentYear}`}
              className={buttonVariants({ size: "sm" })}
            >
              Start
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        ) : currentEntry && currentDone === currentTotal && currentTotal > 0 ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 rounded-md p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">All contacts complete for {MONTH_NAMES[currentMonth]}</span>
          </div>
        ) : null}

        {/* Special flags */}
        {flags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">This month:</span>
            <div className="flex gap-1">
              {flags.map((f) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
            </div>
          </div>
        )}

        {/* Upcoming milestones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {nextFF && (
            <div>
              <p className="text-muted-foreground">Next FF</p>
              <p className="font-medium">{MONTH_NAMES[nextFF.month]} {nextFF.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextFF)}</p>
            </div>
          )}
          {nextHomeVisit && (
            <div>
              <p className="text-muted-foreground">Next Home Visit</p>
              <p className="font-medium">{MONTH_NAMES[nextHomeVisit.month]} {nextHomeVisit.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextHomeVisit)}</p>
            </div>
          )}
          {nextSpMeeting && (
            <div>
              <p className="text-muted-foreground">SP Meeting</p>
              <p className="font-medium">{MONTH_NAMES[nextSpMeeting.month]} {nextSpMeeting.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextSpMeeting)}</p>
            </div>
          )}
          {nextSpDelivery && (
            <div>
              <p className="text-muted-foreground">SP Delivery</p>
              <p className="font-medium">{MONTH_NAMES[nextSpDelivery.month]} {nextSpDelivery.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextSpDelivery)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
