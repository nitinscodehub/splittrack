import type { Metadata } from "next";
import { ActivityFeed } from "@/components/activity-feed";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/session";
import { getActivityFeed } from "@/lib/services/activity";
import { getFriends } from "@/lib/services/friends";
import { getGroupsForUser } from "@/lib/services/groups";
import { redirect } from "next/navigation";
import type { AppGroup, AppUser } from "@/types/app";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [feed, friends, groups] = await Promise.all([
    getActivityFeed(user.id),
    getFriends(user.id),
    getGroupsForUser(user.id),
  ]);

  const currentUser: AppUser = {
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
    <div>
      <PageHeader
        title="History"
        description="Every bill and payment you are part of, including edits and deletions. Everyone in the bill can see it."
      />
      <ActivityFeed
        feed={feed}
        currentUser={currentUser}
        friends={friends}
        groups={appGroups}
      />
    </div>
  );
}
