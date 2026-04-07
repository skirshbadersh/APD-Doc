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
import { useTranslation } from "@/lib/i18n/context";

export function ProfileSetupModal({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const { t } = useTranslation();
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
          <DialogTitle>{t("profile.completeTitle")}</DialogTitle>
          <DialogDescription>
            {t("profile.completeDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup-fullName">{t("profile.fullName")}</Label>
            <Input
              id="setup-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-qoName">{t("profile.qoName")}</Label>
            <Input
              id="setup-qoName"
              placeholder={t("profile.qoNamePlaceholder")}
              value={qoName}
              onChange={(e) => setQoName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-qoPhone">{t("profile.qoPhone")}</Label>
            <Input
              id="setup-qoPhone"
              type="tel"
              placeholder={t("profile.qoPhonePlaceholder")}
              value={qoPhone}
              onChange={(e) => setQoPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-qoEmail">{t("profile.qoEmail")}</Label>
            <Input
              id="setup-qoEmail"
              type="email"
              placeholder={t("profile.qoEmailPlaceholder")}
              value={qoEmail}
              onChange={(e) => setQoEmail(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.saving") : t("profile.saveAndContinue")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
