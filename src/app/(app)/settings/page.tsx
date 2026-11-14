import type { Metadata } from "next";
import { SettingsClient, type SettingsUser } from "@/components/settings-client";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const settingsUser: SettingsUser = {
    id: user.id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    upiId: user.upiId,
    notifyExpense: user.notifyExpense,
    notifySettlement: user.notifySettlement,
    notifyFriendRequest: user.notifyFriendRequest,
    notifyDailyCreditor: user.notifyDailyCreditor,
    remindersOptOut: user.remindersOptOut,
    userIdChangedAt: user.userIdChangedAt?.toISOString() ?? null,
    emailVerified: user.emailVerified?.toISOString() ?? null,
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your public profile, UPI ID, notification choices and account security."
      />
      <SettingsClient user={settingsUser} />
    </div>
  );
}
