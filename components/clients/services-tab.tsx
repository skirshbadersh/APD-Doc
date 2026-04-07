"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate } from "@/lib/utils";
import type { Service } from "@/lib/types/database";

type FormState = {
  procedure_code: string;
  service_name: string;
  service_code: string;
  provider_name: string;
  begin_date: string;
  end_date: string;
  rate: string;
  units: string;
  amount: string;
  status: string;
  notes: string;
  fiscal_year: string;
};

const EMPTY_FORM: FormState = {
  procedure_code: "",
  service_name: "",
  service_code: "",
  provider_name: "",
  begin_date: "",
  end_date: "",
  rate: "",
  units: "",
  amount: "",
  status: "",
  notes: "",
  fiscal_year: "",
};

function toForm(s: Service): FormState {
  return {
    procedure_code: s.procedure_code ?? "",
    service_name: s.service_name,
    service_code: s.service_code ?? "",
    provider_name: s.provider_name ?? "",
    begin_date: s.begin_date ?? "",
    end_date: s.end_date ?? "",
    rate: s.rate?.toString() ?? "",
    units: s.units?.toString() ?? "",
    amount: s.amount?.toString() ?? "",
    status: s.status ?? "",
    notes: s.notes ?? "",
    fiscal_year: s.fiscal_year?.toString() ?? "",
  };
}

function toPayload(form: FormState, clientId: string) {
  return {
    client_id: clientId,
    procedure_code: form.procedure_code || null,
    service_name: form.service_name,
    service_code: form.service_code || null,
    provider_name: form.provider_name || null,
    begin_date: form.begin_date || null,
    end_date: form.end_date || null,
    rate: form.rate ? parseFloat(form.rate) : null,
    units: form.units ? parseInt(form.units) : null,
    amount: form.amount ? parseFloat(form.amount) : null,
    status: form.status || null,
    notes: form.notes || null,
    fiscal_year: form.fiscal_year ? parseInt(form.fiscal_year) : null,
  };
}

export function ServicesTab({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Service[];
}) {
  const [items, setItems] = useState<Service[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditingId(s.id);
    setForm(toForm(s));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.service_name) { toast.error("Service name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = toPayload(form, clientId);

    if (editingId) {
      const { data, error } = await supabase.from("services").update(payload).eq("id", editingId).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => prev.map((s) => (s.id === editingId ? data : s)));
    } else {
      const { data, error } = await supabase.from("services").insert(payload).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => [...prev, data]);
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const prev = items;
    setItems((p) => p.filter((s) => s.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error(error.message); setItems(prev); }
  }

  function fmt$(v: number | null | undefined) {
    return v != null ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Begin</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.service_name}</TableCell>
                  <TableCell>{s.provider_name || "—"}</TableCell>
                  <TableCell>{s.begin_date ? formatDate(s.begin_date) : "—"}</TableCell>
                  <TableCell>{s.end_date ? formatDate(s.end_date) : "—"}</TableCell>
                  <TableCell className="text-right">{fmt$(s.rate)}</TableCell>
                  <TableCell className="text-right">{fmt$(s.amount)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
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
        <p className="text-center py-8 text-muted-foreground">No services yet.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Procedure Code</Label>
                <Input placeholder="e.g. G9012:UC:U5" value={form.procedure_code} onChange={(e) => setForm({ ...form, procedure_code: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Service Code</Label>
                <Input placeholder="e.g. 4400" value={form.service_code} onChange={(e) => setForm({ ...form, service_code: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Provider Name</Label>
              <Input value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Begin Date</Label>
                <Input type="date" value={form.begin_date} onChange={(e) => setForm({ ...form, begin_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rate ($)</Label>
                <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Units</Label>
                <Input type="number" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Input placeholder="e.g. Region Review Approved" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fiscal Year</Label>
                <Input type="number" placeholder="e.g. 2026" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
