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
import type { Contact, ContactTypeEnum } from "@/lib/types/database";

const CONTACT_TYPE_LABELS: Record<ContactTypeEnum, string> = {
  legal_guardian: "Legal Guardian",
  parent: "Parent",
  step_parent: "Step Parent",
  sibling: "Sibling",
  grandparent: "Grandparent",
  service_provider: "Service Provider",
  healthcare_provider: "Healthcare Provider",
  pcp: "PCP",
  dentist: "Dentist",
  other: "Other",
};

type FormState = {
  contact_type: ContactTypeEnum;
  first_name: string;
  last_name: string;
  relationship: string;
  organization: string;
  email: string;
  phone_1: string;
  phone_2: string;
  is_legal_rep: boolean;
  invite_to_sp_meeting: boolean;
  is_rep_payee: boolean;
};

const EMPTY_FORM: FormState = {
  contact_type: "other",
  first_name: "",
  last_name: "",
  relationship: "",
  organization: "",
  email: "",
  phone_1: "",
  phone_2: "",
  is_legal_rep: false,
  invite_to_sp_meeting: false,
  is_rep_payee: false,
};

function toForm(c: Contact): FormState {
  return {
    contact_type: c.contact_type,
    first_name: c.first_name,
    last_name: c.last_name,
    relationship: c.relationship ?? "",
    organization: c.organization ?? "",
    email: c.email ?? "",
    phone_1: c.phone_1 ?? "",
    phone_2: c.phone_2 ?? "",
    is_legal_rep: c.is_legal_rep,
    invite_to_sp_meeting: c.invite_to_sp_meeting,
    is_rep_payee: c.is_rep_payee,
  };
}

export function ContactsTab({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Contact[];
}) {
  const [items, setItems] = useState<Contact[]>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(c: Contact) {
    setEditingId(c.id);
    setForm(toForm(c));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.first_name || !form.last_name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      client_id: clientId,
      contact_type: form.contact_type,
      first_name: form.first_name,
      last_name: form.last_name,
      relationship: form.relationship || null,
      organization: form.organization || null,
      email: form.email || null,
      phone_1: form.phone_1 || null,
      phone_2: form.phone_2 || null,
      is_legal_rep: form.is_legal_rep,
      invite_to_sp_meeting: form.invite_to_sp_meeting,
      is_rep_payee: form.is_rep_payee,
    };

    if (editingId) {
      const { data, error } = await supabase
        .from("contacts")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => prev.map((c) => (c.id === editingId ? data : c)));
    } else {
      const { data, error } = await supabase
        .from("contacts")
        .insert(payload)
        .select()
        .single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setItems((prev) => [...prev, data]);
    }
    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    setItems((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setItems(initial);
    }
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.first_name} {c.last_name}
                    {c.is_legal_rep && (
                      <Badge variant="secondary" className="ml-2">LR</Badge>
                    )}
                  </TableCell>
                  <TableCell>{CONTACT_TYPE_LABELS[c.contact_type]}</TableCell>
                  <TableCell>{c.relationship || "—"}</TableCell>
                  <TableCell>{c.phone_1 || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
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
        <p className="text-center py-8 text-muted-foreground">No contacts yet.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={form.contact_type}
                onChange={(e) => setForm({ ...form, contact_type: e.target.value as ContactTypeEnum })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone 1</Label>
                <Input value={form.phone_1} onChange={(e) => setForm({ ...form, phone_1: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone 2</Label>
                <Input value={form.phone_2} onChange={(e) => setForm({ ...form, phone_2: e.target.value })} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_legal_rep} onCheckedChange={(v) => setForm({ ...form, is_legal_rep: !!v })} />
                <Label className="font-normal">Legal Representative</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.invite_to_sp_meeting} onCheckedChange={(v) => setForm({ ...form, invite_to_sp_meeting: !!v })} />
                <Label className="font-normal">Invite to SP Meeting</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.is_rep_payee} onCheckedChange={(v) => setForm({ ...form, is_rep_payee: !!v })} />
                <Label className="font-normal">Representative Payee (SSI)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
