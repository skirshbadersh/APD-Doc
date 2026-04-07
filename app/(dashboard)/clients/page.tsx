import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/queries/clients";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const COORDINATION_LABELS: Record<string, string> = {
  full_home: "Full — Family Home",
  full_gh: "Full — Group Home",
  full_supported_living: "Full — Supported Living",
  limited: "Limited",
};

const CAT_SHORT: Record<string, string> = {
  monthly_tc: "Monthly TC",
  monthly_ff: "Monthly FF",
  quarterly_provider_review: "Quarterly Review",
  hurricane_season: "Hurricane Prep",
  service_auth_new_fy: "SA Distribution",
  pre_sp_activities: "Pre-SP",
  sp_meeting_ff: "SP Meeting",
  sp_delivery: "SP Delivery",
};

type ClientWithStatus = {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  coordination_type: string;
  sp_effective_date: string | null;
  monthStatus: "green" | "yellow" | "orange" | "red" | "none";
  nextDue: string | null;
};

const DOT_COLORS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  orange: "bg-orange-400",
  red: "bg-red-500",
  none: "bg-gray-300",
};

const STATUS_SORT: Record<string, number> = {
  red: 0,
  yellow: 1,
  orange: 2,
  none: 3,
  green: 4,
};

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clients } = await getClients(supabase);

  if (!clients || clients.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-muted-foreground">0 active clients</p>
          </div>
          <Link href="/clients/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Link>
        </div>
        <div className="border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No clients yet.</p>
          <Link href="/clients/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Client
          </Link>
        </div>
      </div>
    );
  }

  // Fetch current month calendar data for all clients
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const clientIds = clients.map((c) => c.id);
  const { data: calEntries } = await supabase
    .from("annual_calendar")
    .select("client_id, month, year, status, required_contact_1_type, required_contact_1_category, required_contact_1_note_id, required_contact_2_type, required_contact_2_category, required_contact_2_note_id")
    .in("client_id", clientIds)
    .or(`and(month.eq.${currentMonth},year.eq.${currentYear}),and(status.eq.pending,or(year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})))`);

  // Build lookup: clientId -> current month entry + overdue flag
  const currentMonthMap = new Map<string, typeof calEntries extends (infer T)[] | null ? T : never>();
  const overdueMap = new Map<string, boolean>();

  for (const e of calEntries ?? []) {
    const isCurrentMonth = e.month === currentMonth && e.year === currentYear;
    const isOverdue = e.status === "pending" && (e.year < currentYear || (e.year === currentYear && e.month < currentMonth));
    if (isCurrentMonth) currentMonthMap.set(e.client_id, e);
    if (isOverdue) overdueMap.set(e.client_id, true);
  }

  const enriched: ClientWithStatus[] = clients.map((c) => {
    const cal = currentMonthMap.get(c.id);
    const hasOverdue = overdueMap.has(c.id);
    let monthStatus: ClientWithStatus["monthStatus"] = "none";
    let nextDue: string | null = null;

    if (hasOverdue) {
      monthStatus = "red";
    } else if (cal) {
      const has1 = !!cal.required_contact_1_type;
      const has2 = !!cal.required_contact_2_type;
      const done1 = !!cal.required_contact_1_note_id;
      const done2 = !has2 || !!cal.required_contact_2_note_id;

      if (done1 && done2) monthStatus = "green";
      else if (done1 || (has2 && !!cal.required_contact_2_note_id)) monthStatus = "orange";
      else monthStatus = "yellow";

      // Next due action
      if (!done1 && cal.required_contact_1_type) {
        nextDue = `${cal.required_contact_1_type} — ${CAT_SHORT[cal.required_contact_1_category!] ?? cal.required_contact_1_category}`;
      } else if (!done2 && cal.required_contact_2_type) {
        nextDue = `${cal.required_contact_2_type} — ${CAT_SHORT[cal.required_contact_2_category!] ?? cal.required_contact_2_category}`;
      }
    }

    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      nickname: c.nickname,
      coordination_type: c.coordination_type,
      sp_effective_date: c.sp_effective_date,
      monthStatus,
      nextDue,
    };
  });

  // Sort by urgency
  enriched.sort((a, b) => {
    const diff = (STATUS_SORT[a.monthStatus] ?? 3) - (STATUS_SORT[b.monthStatus] ?? 3);
    if (diff !== 0) return diff;
    return a.last_name.localeCompare(b.last_name);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            {clients.length} active client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/clients/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Link>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead>Coordination</TableHead>
              <TableHead>SP Date</TableHead>
              <TableHead>This Month</TableHead>
              <TableHead>Next Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enriched.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className={`h-3 w-3 rounded-full ${DOT_COLORS[c.monthStatus]}`} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/clients/${c.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {c.last_name}, {c.first_name}
                    {c.nickname ? ` "${c.nickname}"` : ""}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {COORDINATION_LABELS[c.coordination_type] ?? c.coordination_type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {c.sp_effective_date ? formatDate(c.sp_effective_date) : "—"}
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${
                    c.monthStatus === "green" ? "text-green-600" :
                    c.monthStatus === "red" ? "text-red-600" :
                    c.monthStatus === "orange" ? "text-orange-600" :
                    c.monthStatus === "yellow" ? "text-yellow-600" :
                    "text-muted-foreground"
                  }`}>
                    {c.monthStatus === "green" ? "Complete" :
                     c.monthStatus === "red" ? "Overdue" :
                     c.monthStatus === "orange" ? "Partial" :
                     c.monthStatus === "yellow" ? "Pending" :
                     "No calendar"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.nextDue ?? (c.monthStatus === "green" ? "All done" : "—")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
