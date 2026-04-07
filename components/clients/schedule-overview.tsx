"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, AlertCircle, CheckCircle2, Clock, CalendarRange } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { getMonthNames1 } from "@/lib/i18n/format";
import type { AnnualCalendar, NoteCategory } from "@/lib/types/database";

export function ScheduleOverview({
  clientId,
  calendar,
}: {
  clientId: string;
  calendar: AnnualCalendar[];
}) {
  const { t, locale } = useTranslation();
  const MONTH_NAMES = getMonthNames1(locale);

  function monthsAway(entry: AnnualCalendar): string {
    const now = new Date();
    const entryDate = new Date(entry.year, entry.month - 1, 1);
    const diff = (entryDate.getFullYear() - now.getFullYear()) * 12 + entryDate.getMonth() - now.getMonth();
    if (diff === 0) return t("schedule.thisMonthRelative");
    if (diff === 1) return t("schedule.nextMonthRelative");
    if (diff < 0) {
      const abs = Math.abs(diff);
      return t(abs > 1 ? "schedule.monthsAgo" : "schedule.monthAgo", { count: abs });
    }
    return t(diff > 1 ? "schedule.inMonths" : "schedule.inMonth", { count: diff });
  }

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
  if (currentEntry?.is_ff_month) flags.push(t("schedule.ffDue"));
  if (currentEntry?.is_home_visit_month) flags.push(t("schedule.homeVisit"));
  if (currentEntry?.is_hurricane_month) flags.push(t("schedule.hurricanePrep"));
  if (currentEntry?.is_provider_review_month) flags.push(t("schedule.providerReview"));
  if (currentEntry?.is_sa_month) flags.push(t("schedule.saMonth"));
  if (currentEntry?.is_pre_sp_month) flags.push(t("schedule.preSP"));
  if (currentEntry?.is_sp_meeting_month) flags.push(t("schedule.spMeetingFlag"));
  if (currentEntry?.is_sp_delivery_month) flags.push(t("schedule.spDeliveryFlag"));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>{t("schedule.title")}</span>
          {currentEntry && (
            <span className="text-sm font-normal text-muted-foreground">
              {MONTH_NAMES[currentMonth]} {currentYear} — {t("schedule.contactsComplete", { done: currentDone, total: currentTotal })}
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
              {t(overdue.length > 1 ? "schedule.overdueContacts" : "schedule.overdueContactsOne", { count: overdue.length })}
            </span>
          </div>
        )}

        {/* Due now */}
        {dueNowType && dueNowCat ? (
          <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-950 rounded-md p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="text-sm font-medium">
                {t("schedule.dueNow")} {dueNowType} — {t("noteCategory." + dueNowCat)}
              </span>
            </div>
            <Link
              href={`/clients/${clientId}/notes/new?month=${currentMonth}&year=${currentYear}`}
              className={buttonVariants({ size: "sm" })}
            >
              {t("schedule.start")}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        ) : currentEntry && currentDone === currentTotal && currentTotal > 0 ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 rounded-md p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{t("schedule.allComplete", { month: MONTH_NAMES[currentMonth] })}</span>
          </div>
        ) : null}

        {/* Special flags */}
        {flags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("schedule.thisMonth")}</span>
            <div className="flex gap-1">
              {flags.map((f) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
            </div>
          </div>
        )}

        {/* Upcoming milestones */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {nextFF && (
            <div>
              <p className="text-muted-foreground">{t("schedule.nextFF")}</p>
              <p className="font-medium">{MONTH_NAMES[nextFF.month]} {nextFF.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextFF)}</p>
            </div>
          )}
          {nextHomeVisit && (
            <div>
              <p className="text-muted-foreground">{t("schedule.nextHomeVisit")}</p>
              <p className="font-medium">{MONTH_NAMES[nextHomeVisit.month]} {nextHomeVisit.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextHomeVisit)}</p>
            </div>
          )}
          {nextSpMeeting && (
            <div>
              <p className="text-muted-foreground">{t("schedule.spMeeting")}</p>
              <p className="font-medium">{MONTH_NAMES[nextSpMeeting.month]} {nextSpMeeting.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextSpMeeting)}</p>
            </div>
          )}
          {nextSpDelivery && (
            <div>
              <p className="text-muted-foreground">{t("schedule.spDelivery")}</p>
              <p className="font-medium">{MONTH_NAMES[nextSpDelivery.month]} {nextSpDelivery.year}</p>
              <p className="text-xs text-muted-foreground">{monthsAway(nextSpDelivery)}</p>
            </div>
          )}
        </div>

        {/* Full year preview link */}
        <div className="pt-2">
          <Link
            href={`/clients/${clientId}/notes/year`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <CalendarRange className="h-4 w-4 mr-2" />
            {t("schedule.generateFullYear")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
