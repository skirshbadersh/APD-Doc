"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { WorkQueueRow } from "@/lib/queries/dashboard";

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function StatsBar({
  rows,
  overdueCount,
}: {
  rows: WorkQueueRow[];
  overdueCount: number;
}) {
  const totalClients = rows.length;
  let notesNeeded = 0;
  let completed = 0;

  for (const row of rows) {
    if (row.contact_1_type) {
      notesNeeded++;
      if (row.contact_1_note_id) completed++;
    }
    if (row.contact_2_type) {
      notesNeeded++;
      if (row.contact_2_note_id) completed++;
    }
  }

  const remaining = notesNeeded - completed;
  const pct = notesNeeded > 0 ? Math.round((completed / notesNeeded) * 100) : 0;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-6 justify-between">
          <div className="flex gap-6">
            <Stat label="Clients" value={totalClients} />
            <Stat label="Notes Needed" value={notesNeeded} />
            <Stat label="Completed" value={completed} color="text-green-600" />
            <Stat label="Remaining" value={remaining} color={remaining > 0 ? "text-yellow-600" : ""} />
            {overdueCount > 0 && (
              <Stat label="Overdue" value={overdueCount} color="text-red-600" />
            )}
          </div>
          <div className="flex items-center gap-3 min-w-[200px]">
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground w-10 text-right">{pct}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
