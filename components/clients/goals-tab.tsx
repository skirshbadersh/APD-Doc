"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Goal, GoalStatus } from "@/lib/types/database";

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  achieved: "Achieved",
  discontinued: "Discontinued",
  carried_over: "Carried Over",
};

const STATUS_COLORS: Record<GoalStatus, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  achieved: "secondary",
  discontinued: "destructive",
  carried_over: "outline",
};

type FormState = {
  sp_year: string;
  goal_text: string;
  service_supporting: string;
  paid_or_nonpaid: string;
  progress_notes: string;
  status: GoalStatus;
};

const EMPTY_FORM: FormState = {
  sp_year: "",
  goal_text: "",
  service_supporting: "",
  paid_or_nonpaid: "nonpaid",
  progress_notes: "",
  status: "active",
};

function toForm(g: Goal): FormState {
  return {
    sp_year: g.sp_year ?? "",
    goal_text: g.goal_text,
    service_supporting: g.service_supporting ?? "",
    paid_or_nonpaid: g.paid_or_nonpaid,
    progress_notes: g.progress_notes ?? "",
    status: g.status,
  };
}

export function GoalsTab({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Goal[];
}) {
  const [items, setItems] = useState<Goal[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(g: Goal) {
    setEditingId(g.id);
    setForm(toForm(g));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.goal_text) { toast.error("Goal text is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      client_id: clientId,
      sp_year: form.sp_year || null,
      goal_text: form.goal_text,
      service_supporting: form.service_supporting || null,
      paid_or_nonpaid: form.paid_or_nonpaid,
      progress_notes: form.progress_notes || null,
      status: form.status,
    };

    if (editingId) {
      const { data, error } = await supabase.from("goals").update(payload).eq("id", editingId).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => prev.map((g) => (g.id === editingId ? data : g)));
    } else {
      const { data, error } = await supabase.from("goals").insert(payload).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => [...prev, data]);
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems((p) => p.filter((g) => g.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) { toast.error(error.message); setItems(prev); }
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Goal</TableHead>
                <TableHead>SP Year</TableHead>
                <TableHead>Paid/Nonpaid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium">{g.goal_text}</p>
                    {g.service_supporting && (
                      <p className="text-xs text-muted-foreground truncate">{g.service_supporting}</p>
                    )}
                  </TableCell>
                  <TableCell>{g.sp_year || "—"}</TableCell>
                  <TableCell className="capitalize">{g.paid_or_nonpaid}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_COLORS[g.status]}>{STATUS_LABELS[g.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center py-8 text-muted-foreground">No goals yet.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Goal" : "Add Goal"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Goal Text *</Label>
              <Textarea value={form.goal_text} onChange={(e) => setForm({ ...form, goal_text: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SP Year</Label>
                <Input placeholder="e.g. 2025-2026" value={form.sp_year} onChange={(e) => setForm({ ...form, sp_year: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Paid / Nonpaid</Label>
                <select
                  value={form.paid_or_nonpaid}
                  onChange={(e) => setForm({ ...form, paid_or_nonpaid: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="paid">Paid</option>
                  <option value="nonpaid">Nonpaid</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service Supporting</Label>
              <Input value={form.service_supporting} onChange={(e) => setForm({ ...form, service_supporting: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Progress Notes</Label>
              <Textarea value={form.progress_notes} onChange={(e) => setForm({ ...form, progress_notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
