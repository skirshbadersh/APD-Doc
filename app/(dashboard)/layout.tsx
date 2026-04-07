import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ProfileSetupModal } from "@/components/layout/profile-setup-modal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const needsSetup = !profile?.qo_name;

  return (
    <DashboardShell user={user} profile={profile}>
      {needsSetup && <ProfileSetupModal profile={profile} />}
      {children}
    </DashboardShell>
  );
}
