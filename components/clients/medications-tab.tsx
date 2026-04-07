"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Medication } from "@/lib/types/database";

type FormState = {
  medication_name: string;
  dosage_frequency: string;
  purpose: string;
  side_effects: string;
  is_supplement: boolean;
};

const EMPTY_FORM: FormState = {
  medication_name: "",
  dosage_frequency: "",
  purpose: "",
  side_effects: "",
  is_supplement: false,
};

function toForm(m: Medication): FormState {
  return {
    medication_name: m.medication_name,
    dosage_frequency: m.dosage_frequency ?? "",
    purpose: m.purpose ?? "",
    side_effects: m.side_effects ?? "",
    is_supplement: m.is_supplement,
  };
}

export function MedicationsTab({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Medication[];
}) {
  const [items, setItems] = useState<Medication[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(m: Medication) {
    setEditingId(m.id);
    setForm(toForm(m));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.medication_name) { toast.error("Medication name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      client_id: clientId,
      medication_name: form.medication_name,
      dosage_frequency: form.dosage_frequency || null,
      purpose: form.purpose || null,
      side_effects: form.side_effects || null,
      is_supplement: form.is_supplement,
    };

    if (editingId) {
      const { data, error } = await supabase.from("medications").update(payload).eq("id", editingId).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => prev.map((m) => (m.id === editingId ? data : m)));
    } else {
      const { data, error } = await supabase.from("medications").insert(payload).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => [...prev, data]);
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems((p) => p.filter((m) => m.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("medications").delete().eq("id", id);
    if (error) { toast.error(error.message); setItems(prev); }
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Medication
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead>Dosage / Frequency</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Side Effects</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.medication_name}
                    {m.is_supplement && (
                      <Badge variant="outline" className="ml-2">Supplement</Badge>
                    )}
                  </TableCell>
                  <TableCell>{m.dosage_frequency || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{m.purpose || "—"}</TableCell>
                  <TableCell>{m.side_effects || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
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
        <p className="text-center py-8 text-muted-foreground">No medications yet.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Medication" : "Add Medication"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medication Name *</Label>
              <Input value={form.medication_name} onChange={(e) => setForm({ ...form, medication_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Dosage / Frequency</Label>
              <Input placeholder="e.g. 1 TAB/mg, Daily" value={form.dosage_frequency} onChange={(e) => setForm({ ...form, dosage_frequency: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Side Effects</Label>
              <Input placeholder="e.g. N/A" value={form.side_effects} onChange={(e) => setForm({ ...form, side_effects: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_supplement} onCheckedChange={(v) => setForm({ ...form, is_supplement: !!v })} />
              <Label className="font-normal">This is a supplement / vitamin</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Medication"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
