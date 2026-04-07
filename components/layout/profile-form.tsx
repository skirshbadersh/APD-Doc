"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import toast from "react-hot-toast";
import type { Profile } from "@/lib/types/database";
import { useTranslation } from "@/lib/i18n/context";

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const { t } = useTranslation();
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

    toast.success(t("profile.updated"));
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-fullName">{t("profile.fullName")}</Label>
            <Input
              id="settings-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-qoName">{t("profile.qoName")}</Label>
            <Input
              id="settings-qoName"
              value={qoName}
              onChange={(e) => setQoName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-qoPhone">{t("profile.qoPhone")}</Label>
            <Input
              id="settings-qoPhone"
              type="tel"
              value={qoPhone}
              onChange={(e) => setQoPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-qoEmail">{t("profile.qoEmail")}</Label>
            <Input
              id="settings-qoEmail"
              type="email"
              value={qoEmail}
              onChange={(e) => setQoEmail(e.target.value)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("settings.language")}</Label>
              <p className="text-sm text-muted-foreground">{t("settings.languageDesc")}</p>
            </div>
            <LocaleToggle />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? t("common.saving") : t("common.save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
