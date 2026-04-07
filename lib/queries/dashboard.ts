import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkQueueRow {
  client_id: string;
  client_first_name: string;
  client_last_name: string;
  client_nickname: string | null;
  calendar_id: string;
  sp_year: string;
  month: number;
  year: number;
  contact_1_type: string | null;
  contact_1_category: string | null;
  contact_1_note_id: string | null;
  contact_2_type: string | null;
  contact_2_category: string | null;
  contact_2_note_id: string | null;
  is_ff_month: boolean;
  is_home_visit_month: boolean;
  is_provider_review_month: boolean;
  is_hurricane_month: boolean;
  is_sa_month: boolean;
  is_pre_sp_month: boolean;
  is_sp_meeting_month: boolean;
  is_sp_delivery_month: boolean;
  cal_status: string;
  last_contact_date: string | null;
}

/**
 * Fetch the work queue for a given month/year across all clients.
 * Joins annual_calendar with clients to get names.
 */
export async function getWorkQueue(
  supabase: SupabaseClient,
  month: number,
  year: number
) {
  // Fetch calendar entries for this month
  const { data: calEntries, error: calError } = await supabase
    .from("annual_calendar")
    .select("*")
    .eq("month", month)
    .eq("year", year);

  if (calError || !calEntries) return { data: [], error: calError };

  if (calEntries.length === 0) return { data: [], error: null };

  // Fetch all client IDs from these entries
  const clientIds = [...new Set(calEntries.map((e: any) => e.client_id))];
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, nickname")
    .in("id", clientIds)
    .eq("is_active", true);

  if (clientError) return { data: [], error: clientError };

  const clientMap = new Map(
    (clients ?? []).map((c: any) => [c.id, c])
  );

  // Build work queue rows
  const rows: WorkQueueRow[] = calEntries
    .filter((e: any) => clientMap.has(e.client_id))
    .map((e: any) => {
      const client = clientMap.get(e.client_id)!;
      return {
        client_id: e.client_id,
        client_first_name: client.first_name,
        client_last_name: client.last_name,
        client_nickname: client.nickname,
        calendar_id: e.id,
        sp_year: e.sp_year,
        month: e.month,
        year: e.year,
        contact_1_type: e.required_contact_1_type,
        contact_1_category: e.required_contact_1_category,
        contact_1_note_id: e.required_contact_1_note_id,
        contact_2_type: e.required_contact_2_type,
        contact_2_category: e.required_contact_2_category,
        contact_2_note_id: e.required_contact_2_note_id,
        is_ff_month: e.is_ff_month,
        is_home_visit_month: e.is_home_visit_month,
        is_provider_review_month: e.is_provider_review_month,
        is_hurricane_month: e.is_hurricane_month,
        is_sa_month: e.is_sa_month,
        is_pre_sp_month: e.is_pre_sp_month,
        is_sp_meeting_month: e.is_sp_meeting_month,
        is_sp_delivery_month: e.is_sp_delivery_month,
        cal_status: e.status,
        last_contact_date: null,
      };
    });

  return { data: rows, error: null };
}

/**
 * Get overdue calendar entries (pending entries from prior months).
 */
export async function getOverdueCount(
  supabase: SupabaseClient,
  currentMonth: number,
  currentYear: number
) {
  // Entries that are pending and before the current month
  const { count, error } = await supabase
    .from("annual_calendar")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .or(`year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})`);

  return { count: count ?? 0, error };
}

export type UrgencyLevel = "red" | "yellow" | "orange" | "green";

/**
 * Determine urgency level for a work queue row.
 */
export function getUrgency(row: WorkQueueRow, selectedMonth: number, selectedYear: number): UrgencyLevel {
  const hasContact1 = !!row.contact_1_type;
  const hasContact2 = !!row.contact_2_type;
  const done1 = !!row.contact_1_note_id;
  const done2 = !hasContact2 || !!row.contact_2_note_id;

  // All done
  if (done1 && done2) return "green";

  // Check if overdue (from prior month)
  const isCurrentOrFuture =
    row.year > selectedYear ||
    (row.year === selectedYear && row.month >= selectedMonth);
  if (!isCurrentOrFuture) return "red";

  // Partially done
  if (done1 || (hasContact2 && !!row.contact_2_note_id)) return "orange";

  // Not started
  return "yellow";
}

export function urgencySortKey(u: UrgencyLevel): number {
  switch (u) {
    case "red": return 0;
    case "yellow": return 1;
    case "orange": return 2;
    case "green": return 3;
  }
}
