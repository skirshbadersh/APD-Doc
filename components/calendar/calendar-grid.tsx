"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Loader2, CheckCircle2, CalendarRange } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useTranslation } from "@/lib/i18n/context";
import { getMonthNames1 } from "@/lib/i18n/format";
import type { AnnualCalendar, ContactType, NoteCategory, CalendarEntryStatus } from "@/lib/types/database";
import { getRotationTopics, type FocusTopic } from "@/lib/templates/helpers";

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
  t,
}: {
  slot: 1 | 2;
  type: ContactType | null;
  category: NoteCategory | null;
  noteId: string | null;
  clientId: string;
  month: number;
  year: number;
  halfLabel: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!type || !category) return null;
  const done = !!noteId;
  const variant = type === "FF" ? "default" : type === "ADM" ? "outline" : "secondary";
  return (
    <div className="flex items-center justify-between gap-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[10px] text-muted-foreground w-3 shrink-0">{slot}.</span>
        <Badge variant={variant} className="text-[10px] shrink-0">
          {type} — {t("noteCategory." + category)}
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
  const { t, locale } = useTranslation();
  const MONTH_NAMES = getMonthNames1(locale);
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
      toast.success(t("calendar.regenerated"));
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
          {t("calendar.setSpDate")}
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-muted-foreground">{t("calendar.noEntries")}</p>
        <Button onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("calendar.generating")}
            </>
          ) : (
            t("calendar.generateCalendar")
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Link href={`/clients/${clientId}/notes/year`} className={buttonVariants({ variant: "outline" })}>
          <CalendarRange className="h-4 w-4 mr-2" />
          {t("calendar.generateFullYear")}
        </Link>
        <Button variant="outline" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t("calendar.regenerate")}
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
                    {isCurrent && <span className="text-xs font-normal text-primary ml-1">{t("calendar.now")}</span>}
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
                    {isPast && entry.status === "pending" ? t("calendar.overdue") : t("calendar." + (entry.status === "in_progress" ? "inProgress" : entry.status))}
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
                    halfLabel={t("calendar.halfFirst")}
                    t={t}
                  />
                  <ContactRow
                    slot={2}
                    type={entry.required_contact_2_type}
                    category={entry.required_contact_2_category}
                    noteId={entry.required_contact_2_note_id}
                    clientId={clientId}
                    month={entry.month}
                    year={entry.year}
                    halfLabel={t("calendar.halfSecond")}
                    t={t}
                  />
                </div>

                {/* Topic preview */}
                {topics.length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    <span className="font-medium">{t("calendar.topics")} </span>
                    {topics.map((tp) => t("topic." + tp)).join(", ")}
                  </div>
                )}

                {/* Start button */}
                {(entry.status === "pending" || entry.status === "in_progress") && (
                  <Link
                    href={`/clients/${clientId}/notes/new?month=${entry.month}&year=${entry.year}`}
                    className={buttonVariants({ variant: "outline", size: "sm" }) + " w-full mt-1"}
                  >
                    {entry.status === "in_progress" ? t("calendar.continue") : t("calendar.startNotes")}
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
