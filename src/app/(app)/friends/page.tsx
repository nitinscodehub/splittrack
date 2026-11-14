import type { Metadata } from "next";
import { FriendsHub } from "@/components/friends-hub";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/session";
import { getFriendRequests, getFriends } from "@/lib/services/friends";
import { getGroupsForUser } from "@/lib/services/groups";
import { redirect } from "next/navigation";
import type { AppGroup, AppUser } from "@/types/app";

export const metadata: Metadata = { title: "Friends" };
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [friends, requests, groups] = await Promise.all([
    getFriends(user.id),
    getFriendRequests(user.id),
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
        title="Friends & groups"
        description="Connect with the people you share bills with. Only accepted friends can be added to a bill."
      />
      <FriendsHub
        currentUser={currentUser}
        friends={friends}
        requests={requests}
        groups={appGroups}
      />
    </div>
  );
}
