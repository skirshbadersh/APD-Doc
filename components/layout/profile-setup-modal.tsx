"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Profile } from "@/lib/types/database";

export function ProfileSetupModal({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [qoName, setQoName] = useState("");
  const [qoPhone, setQoPhone] = useState("");
  const [qoEmail, setQoEmail] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        qo_name: qoName,
        qo_phone: qoPhone,
        qo_email: qoEmail,
      })
      .eq("id", profile?.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Enter your Qualified Organization details. This info appears in
            your progress notes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup-fullName">Full Name</Label>
            <Input
              id="setup-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-qoName">QO Name (Qualified Organization)</Label>
            <Input
              id="setup-qoName"
              placeholder="e.g. ABC Support Services, LLC"
              value={qoName}
              onChange={(e) => setQoName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-qoPhone">QO Phone</Label>
            <Input
              id="setup-qoPhone"
              type="tel"
              placeholder="(305) 555-0100"
              value={qoPhone}
              onChange={(e) => setQoPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-qoEmail">QO Email</Label>
            <Input
              id="setup-qoEmail"
              type="email"
              placeholder="office@qo.com"
              value={qoEmail}
              onChange={(e) => setQoEmail(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
