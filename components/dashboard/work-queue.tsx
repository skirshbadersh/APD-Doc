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

const CATEGORY_SHORT: Partial<Record<NoteCategory, string>> = {
  monthly_tc: "Monthly",
  monthly_ff: "Monthly",
  quarterly_provider_review: "Quarterly Review",
  hurricane_season: "Hurricane Prep",
  service_auth_new_fy: "SA Distribution",
  pre_sp_activities: "Pre-SP Activities",
  sp_meeting_ff: "SP Meeting",
  sp_delivery: "SP Delivery",
  provider_contact: "Provider",
  adm_cp_adjustment: "CP Adjust",
  adm_sa_distribution: "SA Dist",
  cdc_related: "CDC",
  developing_resources: "Resources",
  custom: "Custom",
};

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
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  const label = CATEGORY_SHORT[category as NoteCategory] ?? category;
  const done = !!noteId;
  return (
    <span className={`text-xs ${done ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
      {type} — {label} {done ? "Done" : "Pending"}
    </span>
  );
}

function DueDescription({ row }: { row: WorkQueueRow }) {
  const items: string[] = [];

  if (row.is_sp_meeting_month) items.push("SP Meeting FF");
  else if (row.is_ff_month) items.push("FF — Quarterly");
  if (row.is_home_visit_month) items.push("Home Visit");
  if (row.is_hurricane_month) items.push("Hurricane Prep TC");
  if (row.is_pre_sp_month) items.push("Pre-SP TC");
  if (row.is_sp_delivery_month) items.push("SP Delivery ADM");
  if (row.is_sa_month) items.push("SA Distribution ADM");
  if (row.is_provider_review_month) items.push("Provider Review");

  // If nothing special, show the basic contact types
  if (items.length === 0) {
    const types: string[] = [];
    if (row.contact_1_type) types.push(`${row.contact_1_type} — ${CATEGORY_SHORT[row.contact_1_category as NoteCategory] ?? "Monthly"}`);
    if (row.contact_2_type && row.contact_2_type !== row.contact_1_type) types.push(`${row.contact_2_type} — ${CATEGORY_SHORT[row.contact_2_category as NoteCategory] ?? "Monthly"}`);
    else if (row.contact_2_type) types.push(`${row.contact_2_type} — Monthly`);
    return (
      <div className="text-xs text-muted-foreground space-y-0.5">
        {types.map((t, i) => <div key={i}>{t}</div>)}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge
          key={item}
          variant={item.includes("SP Meeting") ? "destructive" : item.includes("FF") ? "default" : "outline"}
          className="text-[10px] py-0"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
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
          placeholder="Search clients..."
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
                <TableHead>Client</TableHead>
                <TableHead>What's Due</TableHead>
                <TableHead>Contact 1</TableHead>
                <TableHead>Contact 2</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead className="w-20">Actions</TableHead>
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
                          <span title={formatDate(row.last_contact_date)}>{daysAgo(row.last_contact_date)}</span>
                        ) : (
                          "Never"
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {startHref ? (
                        <Link
                          href={startHref}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Start
                        </Link>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">Done</span>
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
          No calendar entries for this month. Add clients with SP effective dates to populate the work queue.
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No clients match your search.
        </div>
      )}
    </div>
  );
}
