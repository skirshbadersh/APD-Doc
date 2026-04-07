"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkQueueRow, UrgencyLevel } from "@/lib/queries/dashboard";
import { getUrgency, urgencySortKey } from "@/lib/queries/dashboard";
import type { NoteCategory } from "@/lib/types/database";
import { Search } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

function categoryLabel(category: string | null, t: (key: string) => string): string {
  if (!category) return category ?? "";
  return t("noteCategory." + category);
}

const DOT_COLORS: Record<UrgencyLevel, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-400",
  green: "bg-green-500",
};

function ContactCell({
  type,
  category,
  noteId,
}: {
  type: string | null;
  category: string | null;
  noteId: string | null;
}) {
  const { t } = useTranslation();
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  const label = categoryLabel(category, t);
  const done = !!noteId;
  return (
    <span className={`text-xs ${done ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
      {type} — {label} {done ? t("workQueue.done") : t("workQueue.pending")}
    </span>
  );
}

function DueDescription({ row }: { row: WorkQueueRow }) {
  const { t } = useTranslation();
  const items: { key: string; label: string }[] = [];

  if (row.is_sp_meeting_month) items.push({ key: "sp_meeting", label: t("workQueue.dueSPMeetingFF") });
  else if (row.is_ff_month) items.push({ key: "ff", label: t("workQueue.dueFFQuarterly") });
  if (row.is_home_visit_month) items.push({ key: "home_visit", label: t("workQueue.dueHomeVisit") });
  if (row.is_hurricane_month) items.push({ key: "hurricane", label: t("workQueue.dueHurricanePrepTC") });
  if (row.is_pre_sp_month) items.push({ key: "pre_sp", label: t("workQueue.duePreSPTC") });
  if (row.is_sp_delivery_month) items.push({ key: "sp_delivery", label: t("workQueue.dueSPDeliveryADM") });
  if (row.is_sa_month) items.push({ key: "sa", label: t("workQueue.dueSADistributionADM") });
  if (row.is_provider_review_month) items.push({ key: "provider_review", label: t("workQueue.dueProviderReview") });

  // If nothing special, show the basic contact types
  if (items.length === 0) {
    const types: string[] = [];
    if (row.contact_1_type) types.push(`${row.contact_1_type} — ${categoryLabel(row.contact_1_category, t)}`);
    if (row.contact_2_type && row.contact_2_type !== row.contact_1_type) types.push(`${row.contact_2_type} — ${categoryLabel(row.contact_2_category, t)}`);
    else if (row.contact_2_type) types.push(`${row.contact_2_type} — ${t("noteCategory.monthly_tc")}`);
    return (
      <div className="text-xs text-muted-foreground space-y-0.5">
        {types.map((typ, i) => <div key={i}>{typ}</div>)}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge
          key={item.key}
          variant={item.key === "sp_meeting" ? "destructive" : item.key === "ff" ? "default" : "outline"}
          className="text-[10px] py-0"
        >
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

function daysAgo(dateStr: string | null, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (!dateStr) return t("relative.never");
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return t("relative.today");
  if (diff === 1) return t("relative.yesterday");
  if (diff < 7) return t("relative.daysAgo", { count: diff });
  if (diff < 30) return t("relative.weeksAgo", { count: Math.floor(diff / 7) });
  return t("relative.monthsAgo", { count: Math.floor(diff / 30) });
}

export function WorkQueue({
  rows,
  month,
  year,
}: {
  rows: WorkQueueRow[];
  month: number;
  year: number;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const sorted = [...rows]
    .map((r) => ({ ...r, urgency: getUrgency(r, month, year) }))
    .sort((a, b) => {
      const uDiff = urgencySortKey(a.urgency) - urgencySortKey(b.urgency);
      if (uDiff !== 0) return uDiff;
      return a.client_last_name.localeCompare(b.client_last_name);
    });

  const filtered = search
    ? sorted.filter(
        (r) =>
          `${r.client_first_name} ${r.client_last_name}`
            .toLowerCase()
            .includes(search.toLowerCase())
      )
    : sorted;

  function getStartHref(row: WorkQueueRow): string | null {
    const hasPending = (row.contact_1_type && !row.contact_1_note_id) ||
                       (row.contact_2_type && !row.contact_2_note_id);
    if (!hasPending) return null;
    return `/clients/${row.client_id}/notes/new?month=${row.month}&year=${row.year}`;
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("workQueue.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t("workQueue.client")}</TableHead>
                <TableHead>{t("workQueue.whatsDue")}</TableHead>
                <TableHead>{t("workQueue.contact1")}</TableHead>
                <TableHead>{t("workQueue.contact2")}</TableHead>
                <TableHead>{t("workQueue.lastContact")}</TableHead>
                <TableHead className="w-20">{t("workQueue.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const startHref = getStartHref(row);
                return (
                  <TableRow key={row.calendar_id}>
                    <TableCell>
                      <div className={`h-3 w-3 rounded-full ${DOT_COLORS[row.urgency]}`} />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${row.client_id}`}
                        className="font-medium text-primary hover:underline text-sm"
                      >
                        {row.client_last_name}, {row.client_first_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DueDescription row={row} />
                    </TableCell>
                    <TableCell>
                      <ContactCell
                        type={row.contact_1_type}
                        category={row.contact_1_category}
                        noteId={row.contact_1_note_id}
                      />
                    </TableCell>
                    <TableCell>
                      <ContactCell
                        type={row.contact_2_type}
                        category={row.contact_2_category}
                        noteId={row.contact_2_note_id}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${!row.last_contact_date ? "text-red-500" : "text-muted-foreground"}`}>
                        {row.last_contact_date ? (
                          <span title={formatDate(row.last_contact_date)}>{daysAgo(row.last_contact_date, t)}</span>
                        ) : (
                          t("relative.never")
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {startHref ? (
                        <Link
                          href={startHref}
                          className={buttonVariants({ size: "sm" })}
                        >
                          {t("workQueue.start")}
                        </Link>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">{t("workQueue.done")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : rows.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          {t("workQueue.emptyMonth")}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          {t("workQueue.noSearchResults")}
        </div>
      )}
    </div>
  );
}
