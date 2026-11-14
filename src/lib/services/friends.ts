import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { notifyFriendRequest } from "@/lib/notify";
import { toPublicUser } from "@/lib/session";
import { sendInviteEmail } from "@/lib/notify";
import { absoluteUrl, randomToken } from "@/lib/utils";
import type { PublicUser } from "@/lib/validators";

export type FriendshipState = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  direction: "incoming" | "outgoing";
};

export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(friendship);
}

export async function assertFriends(a: string, b: string): Promise<void> {
  if (!(await areFriends(a, b))) {
    throw new ApiError(403, "You can only share bills with accepted friends.", "NOT_FRIENDS");
  }
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  return friendships.map((friendship) =>
    friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId,
  );
}

export async function getFriends(userId: string): Promise<PublicUser[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, userId: true, name: true, avatarUrl: true } },
      addressee: { select: { id: true, userId: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return friendships
    .map((friendship) =>
      friendship.requesterId === userId ? friendship.addressee : friendship.requester,
    )
    .map(toPublicUser);
}

export type FriendSuggestion = PublicUser & {
  mutualFriends: number;
  mutualFriendNames: string[];
};

/**
 * People followed by the user's friends (second-degree connections).
 * Only accepted friends are used, and anyone with an existing friendship
 * request is excluded so the same person is not suggested twice.
 */
export async function getFriendSuggestions(
  userId: string,
  limit = 8,
): Promise<FriendSuggestion[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, userId: true, name: true, avatarUrl: true } },
      addressee: { select: { id: true, userId: true, name: true, avatarUrl: true } },
    },
  });

  const friendById = new Map<string, PublicUser>();
  for (const friendship of friendships) {
    const friend =
      friendship.requesterId === userId ? friendship.addressee : friendship.requester;
    friendById.set(friend.id, toPublicUser(friend));
  }
  if (friendById.size === 0) return [];

  const existingFriendships = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });

  const excluded = new Set<string>([userId, ...friendById.keys()]);
  for (const friendship of existingFriendships) {
    excluded.add(
      friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId,
    );
  }

  const friendIds = [...friendById.keys()];
  const friendConnections = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: { in: friendIds } }, { addresseeId: { in: friendIds } }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const mutualsByCandidate = new Map<string, Set<string>>();
  for (const connection of friendConnections) {
    const requesterIsFriend = friendById.has(connection.requesterId);
    const addresseeIsFriend = friendById.has(connection.addresseeId);

    let candidateId: string | undefined;
    let mutualFriendId: string | undefined;

    if (requesterIsFriend && !addresseeIsFriend) {
      candidateId = connection.addresseeId;
      mutualFriendId = connection.requesterId;
    } else if (addresseeIsFriend && !requesterIsFriend) {
      candidateId = connection.requesterId;
      mutualFriendId = connection.addresseeId;
    } else {
      continue;
    }

    if (!candidateId || !mutualFriendId || excluded.has(candidateId)) continue;

    const mutuals = mutualsByCandidate.get(candidateId) ?? new Set<string>();
    mutuals.add(mutualFriendId);
    mutualsByCandidate.set(candidateId, mutuals);
  }

  if (mutualsByCandidate.size === 0) return [];

  const candidateIds = [...mutualsByCandidate.keys()];
  const users = await prisma.user.findMany({
    where: { id: { in: candidateIds }, emailVerified: { not: null } },
    select: { id: true, userId: true, name: true, avatarUrl: true },
  });

  return users
    .map((user) => {
      const mutualIds = [...(mutualsByCandidate.get(user.id) ?? [])];
      return {
        ...toPublicUser(user),
        mutualFriends: mutualIds.length,
        mutualFriendNames: mutualIds
          .map((id) => friendById.get(id)?.name)
          .filter((name): name is string => Boolean(name))
          .slice(0, 2),
      };
    })
    .sort(
      (a, b) =>
        b.mutualFriends - a.mutualFriends ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    )
    .slice(0, Math.max(1, Math.min(limit, 20)));
}

export async function searchUsers(
  actorId: string,
  query: string,
): Promise<Array<PublicUser & { friendship: FriendshipState | null }>> {
  const normalized = query.trim();
  const users = await prisma.user.findMany({
    where: {
      id: { not: actorId },
      emailVerified: { not: null },
      OR: [
        { userId: { contains: normalized, mode: "insensitive" } },
        { name: { contains: normalized, mode: "insensitive" } },
        { email: normalized.toLowerCase() },
      ],
    },
    take: 12,
    orderBy: { name: "asc" },
    select: { id: true, userId: true, name: true, avatarUrl: true },
  });

  if (users.length === 0) return [];

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: actorId, addresseeId: { in: users.map((user) => user.id) } },
        { addresseeId: actorId, requesterId: { in: users.map((user) => user.id) } },
      ],
    },
  });

  const byOtherId = new Map<string, FriendshipState>();
  for (const friendship of friendships) {
    const otherId = friendship.requesterId === actorId ? friendship.addresseeId : friendship.requesterId;
    byOtherId.set(otherId, {
      id: friendship.id,
      status: friendship.status,
      direction: friendship.requesterId === actorId ? "outgoing" : "incoming",
    });
  }

  return users.map((user) => ({
    ...user,
    friendship: byOtherId.get(user.id) ?? null,
  }));
}

export async function sendFriendRequest(
  actor: User,
  targetId: string,
): Promise<{ autoAccepted: boolean }> {
  if (targetId === actor.id) {
    throw new ApiError(422, "You can't add yourself.", "SELF_FRIEND");
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || !target.emailVerified) {
    throw new ApiError(404, "That person isn't available.", "USER_NOT_FOUND");
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: actor.id, addresseeId: targetId },
        { requesterId: targetId, addresseeId: actor.id },
      ],
    },
  });

  if (existing?.status === "ACCEPTED") {
    throw new ApiError(409, "You're already friends.", "ALREADY_FRIENDS");
  }

  if (existing?.status === "PENDING") {
    if (existing.requesterId === targetId) {
      const accepted = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      await logAudit({
        entity: "FRIENDSHIP",
        entityId: accepted.id,
        action: "CONFIRMED",
        actorId: actor.id,
        diff: { requesterId: accepted.requesterId, addresseeId: accepted.addresseeId },
      });
      return { autoAccepted: true };
    }
    throw new ApiError(409, "You already sent a request.", "REQUEST_PENDING");
  }

  let friendshipId: string;
  if (existing) {
    const updated = await prisma.friendship.update({
      where: { id: existing.id },
      data: {
        requesterId: actor.id,
        addresseeId: targetId,
        status: "PENDING",
        respondedAt: null,
      },
    });
    friendshipId = updated.id;
  } else {
    const created = await prisma.friendship.create({
      data: { requesterId: actor.id, addresseeId: targetId, status: "PENDING" },
    });
    friendshipId = created.id;
  }

  await logAudit({
    entity: "FRIENDSHIP",
    entityId: friendshipId,
    action: "CREATED",
    actorId: actor.id,
    diff: { requesterId: actor.id, addresseeId: targetId },
  });

  await notifyFriendRequest(friendshipId);
  return { autoAccepted: false };
}

export async function respondToFriendRequest(
  actor: User,
  friendshipId: string,
  action: "accept" | "reject",
): Promise<void> {
  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship) throw new ApiError(404, "Request not found.", "NOT_FOUND");
  if (friendship.addresseeId !== actor.id) {
    throw new ApiError(403, "Only the person who got the request can respond.", "FORBIDDEN");
  }
  if (friendship.status !== "PENDING") {
    throw new ApiError(409, "This request was already answered.", "ALREADY_RESOLVED");
  }

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: {
      status: action === "accept" ? "ACCEPTED" : "REJECTED",
      respondedAt: new Date(),
    },
  });

  await logAudit({
    entity: "FRIENDSHIP",
    entityId: friendshipId,
    action: action === "accept" ? "CONFIRMED" : "REJECTED",
    actorId: actor.id,
    diff: { action },
  });
}

export async function createInvite(
  actor: User,
  email?: string,
): Promise<{ token: string; url: string }> {
  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.invite.create({
    data: {
      token,
      inviterId: actor.id,
      email: email ? email.toLowerCase() : null,
      expiresAt,
    },
  });

  await logAudit({
    entity: "INVITE",
    entityId: token,
    action: "CREATED",
    actorId: actor.id,
    diff: { email: email ?? null, expiresAt: expiresAt.toISOString() },
  });

  const url = absoluteUrl(`/invite/${token}`);
  await sendInviteEmail({ inviterName: actor.name, inviteUrl: url, email });
  return { token, url };
}

async function connectUsers(userA: string, userB: string): Promise<void> {
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userA, addresseeId: userB },
        { requesterId: userB, addresseeId: userA },
      ],
    },
  });

  if (existing) {
    if (existing.status !== "ACCEPTED") {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
    }
    return;
  }

  await prisma.friendship.create({
    data: {
      requesterId: userA,
      addresseeId: userB,
      status: "ACCEPTED",
      respondedAt: new Date(),
    },
  });
}

export async function acceptInvite(actor: User, token: string): Promise<void> {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) throw new ApiError(404, "Invite not found.", "INVITE_NOT_FOUND");
  if (invite.usedById) throw new ApiError(409, "This invite was already used.", "INVITE_USED");
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new ApiError(410, "This invite has expired.", "INVITE_EXPIRED");
  }
  if (invite.inviterId === actor.id) {
    throw new ApiError(422, "You can't accept your own invite.", "OWN_INVITE");
  }

  await connectUsers(invite.inviterId, actor.id);
  await prisma.invite.update({
    where: { id: invite.id },
    data: { usedById: actor.id, usedAt: new Date() },
  });
  await logAudit({
    entity: "INVITE",
    entityId: invite.id,
    action: "CONFIRMED",
    actorId: actor.id,
    diff: { inviterId: invite.inviterId, usedById: actor.id },
  });
}

/** Called after a new account verifies its email — auto-connects invite links. */
export async function connectViaInviteToken(token: string, newUserId: string): Promise<void> {
  try {
    const invite = await prisma.invite.findUnique({ where: { token } });
    if (!invite || invite.usedById || invite.expiresAt.getTime() < Date.now()) return;
    if (invite.inviterId === newUserId) return;

    await connectUsers(invite.inviterId, newUserId);
    await prisma.invite.update({
      where: { id: invite.id },
      data: { usedById: newUserId, usedAt: new Date() },
    });
    await logAudit({
      entity: "INVITE",
      entityId: invite.id,
      action: "CONFIRMED",
      actorId: newUserId,
      diff: { inviterId: invite.inviterId, usedById: newUserId, via: "signup" },
    });
  } catch (error) {
    console.error("[invite] auto-connect failed", error);
  }
}

/** Email invites auto-connect on verification, even without the token. */
export async function connectPendingEmailInvites(user: User): Promise<void> {
  try {
    const invites = await prisma.invite.findMany({
      where: { email: user.email, usedById: null, expiresAt: { gt: new Date() } },
    });
    for (const invite of invites) {
      if (invite.inviterId === user.id) continue;
      await connectUsers(invite.inviterId, user.id);
      await prisma.invite.update({
        where: { id: invite.id },
        data: { usedById: user.id, usedAt: new Date() },
      });
    }
  } catch (error) {
    console.error("[invite] email auto-connect failed", error);
  }
}

export type FriendRequestView = {
  id: string;
  createdAt: string;
  user: PublicUser;
};

export async function getFriendRequests(userId: string): Promise<{
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
}> {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: { requester: { select: { id: true, userId: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { requesterId: userId, status: "PENDING" },
      include: { addressee: { select: { id: true, userId: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    incoming: incoming.map((friendship) => ({
      id: friendship.id,
      createdAt: friendship.createdAt.toISOString(),
      user: friendship.requester,
    })),
    outgoing: outgoing.map((friendship) => ({
      id: friendship.id,
      createdAt: friendship.createdAt.toISOString(),
      user: friendship.addressee,
    })),
  };
}
