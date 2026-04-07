"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import type { Profile } from "@/lib/types/database";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [qoName, setQoName] = useState(profile?.qo_name || "");
  const [qoPhone, setQoPhone] = useState(profile?.qo_phone || "");
  const [qoEmail, setQoEmail] = useState(profile?.qo_email || "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-fullName">Full Name</Label>
            <Input
              id="settings-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-qoName">QO Name (Qualified Organization)</Label>
            <Input
              id="settings-qoName"
              value={qoName}
              onChange={(e) => setQoName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-qoPhone">QO Phone</Label>
            <Input
              id="settings-qoPhone"
              type="tel"
              value={qoPhone}
              onChange={(e) => setQoPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-qoEmail">QO Email</Label>
            <Input
              id="settings-qoEmail"
              type="email"
              value={qoEmail}
              onChange={(e) => setQoEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
