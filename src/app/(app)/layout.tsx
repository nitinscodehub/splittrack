import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/session";
import { getFriends } from "@/lib/services/friends";
import { getGroupsForUser } from "@/lib/services/groups";
import type { AppGroup, AppUser } from "@/types/app";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) {
    redirect(`/verify?email=${encodeURIComponent(user.email)}`);
  }

  const [friends, groups] = await Promise.all([
    getFriends(user.id),
    getGroupsForUser(user.id),
  ]);

  const appUser: AppUser = {
    id: user.id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };

  const appGroups: AppGroup[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    createdById: group.createdById,
    members: group.members,
    createdAt: group.createdAt,
    expenseCount: group.expenseCount,
  }));

  return (
    <AppShell user={appUser} friends={friends} groups={appGroups}>
      {children}
    </AppShell>
  );
}
