"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { WorkQueue } from "@/components/dashboard/work-queue";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import type { WorkQueueRow } from "@/lib/queries/dashboard";
import { useTranslation } from "@/lib/i18n/context";

export default function DashboardPage() {
  const { t } = useTranslation();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<WorkQueueRow[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch calendar entries for this month
    const { data: calEntries } = await supabase
      .from("annual_calendar")
      .select("*")
      .eq("month", month)
      .eq("year", year);

    if (!calEntries || calEntries.length === 0) {
      setRows([]);
      setOverdueCount(0);
      setLoading(false);
      return;
    }

    // Fetch client names
    const clientIds = [...new Set(calEntries.map((e) => e.client_id))];
    const { data: clients } = await supabase
      .from("clients")
      .select("id, first_name, last_name, nickname")
      .in("id", clientIds)
      .eq("is_active", true);

    const clientMap = new Map(
      (clients ?? []).map((c) => [c.id, c])
    );

    // Fetch most recent note per client for "Last Contact" column
    const { data: recentNotes } = await supabase
      .from("progress_notes")
      .select("client_id, note_date")
      .in("client_id", clientIds)
      .order("note_date", { ascending: false });

    const lastContactMap = new Map<string, string>();
    for (const note of recentNotes ?? []) {
      if (!lastContactMap.has(note.client_id)) {
        lastContactMap.set(note.client_id, note.note_date);
      }
    }

    const workRows: WorkQueueRow[] = calEntries
      .filter((e) => clientMap.has(e.client_id))
      .map((e) => {
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
          last_contact_date: lastContactMap.get(e.client_id) ?? null,
        };
      });

    setRows(workRows);

    // Fetch overdue count (pending entries before this month)
    const { count } = await supabase
      .from("annual_calendar")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`);

    setOverdueCount(count ?? 0);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleMonthChange(m: number, y: number) {
    setMonth(m);
    setYear(y);
  }

  async function handleGenerateAll() {
    setGenerating(true);
    try {
      const res = await fetch("/api/notes/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t("dashboard.generatedDrafts", { count: data.generated }));
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("dashboard.generateFailed"));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector month={month} year={year} onChange={handleMonthChange} />
          {rows.length > 0 && (
            <Button
              variant="outline"
              onClick={handleGenerateAll}
              disabled={generating}
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              {generating ? t("dashboard.generating") : t("dashboard.generateAllDrafts")}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <StatsBar rows={rows} overdueCount={overdueCount} />
          <WorkQueue rows={rows} month={month} year={year} />
        </>
      )}
    </div>
  );
}
