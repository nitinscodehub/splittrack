import type { User } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { assertFriends } from "@/lib/services/friends";
import type { PublicUser } from "@/lib/validators";

export interface GroupView {
  id: string;
  name: string;
  createdAt: string;
  createdById: string;
  members: PublicUser[];
  expenseCount: number;
}

export async function getGroupsForUser(userId: string): Promise<GroupView[]> {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, userId: true, name: true, avatarUrl: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { expenses: { where: { deletedAt: null } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    createdAt: group.createdAt.toISOString(),
    createdById: group.createdById,
    members: group.members.map((member) => member.user),
    expenseCount: group._count.expenses,
  }));
}

async function validateMembers(actorId: string, memberIds: string[]): Promise<string[]> {
  const unique = [...new Set(memberIds)].filter((id) => id !== actorId);
  if (unique.length === 0) {
    throw new ApiError(422, "Add at least one friend to the group.", "MIN_MEMBERS");
  }
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  if (users.length !== unique.length) {
    throw new ApiError(422, "One or more people no longer exist.", "USER_NOT_FOUND");
  }
  for (const memberId of unique) {
    await assertFriends(actorId, memberId);
  }
  return unique;
}

export async function createGroup(
  actor: User,
  input: { name: string; memberIds: string[] },
): Promise<string> {
  const memberIds = await validateMembers(actor.id, input.memberIds);

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.group.create({
      data: {
        name: input.name,
        createdById: actor.id,
        members: {
          create: [
            { userId: actor.id, role: "OWNER" },
            ...memberIds.map((userId) => ({ userId, role: "MEMBER" as const })),
          ],
        },
      },
    });

    await tx.auditLog.create({
      data: {
        entity: "GROUP",
        entityId: created.id,
        action: "CREATED",
        actorId: actor.id,
        diff: { name: input.name, memberIds: [actor.id, ...memberIds] },
      },
    });

    return created;
  });

  return group.id;
}

export async function updateGroup(
  actor: User,
  groupId: string,
  input: { name?: string; memberIds?: string[] },
): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group) throw new ApiError(404, "Group not found.", "NOT_FOUND");
  if (group.createdById !== actor.id) {
    throw new ApiError(403, "Only the group owner can edit it.", "FORBIDDEN");
  }

  const before = {
    name: group.name,
    memberIds: group.members.map((member) => member.userId),
  };

  let memberIds: string[] | null = null;
  if (input.memberIds) {
    memberIds = await validateMembers(actor.id, input.memberIds);
  }

  await prisma.$transaction(async (tx) => {
    if (input.name) {
      await tx.group.update({ where: { id: groupId }, data: { name: input.name } });
    }

    if (memberIds) {
      await tx.groupMember.deleteMany({
        where: { groupId, userId: { not: group.createdById } },
      });
      await tx.groupMember.createMany({
        data: memberIds.map((userId) => ({ groupId, userId, role: "MEMBER" as const })),
        skipDuplicates: true,
      });
    }

    await tx.auditLog.create({
      data: {
        entity: "GROUP",
        entityId: groupId,
        action: "UPDATED",
        actorId: actor.id,
        diff: {
          before,
          after: {
            name: input.name ?? group.name,
            memberIds: memberIds ? [group.createdById, ...memberIds] : before.memberIds,
          },
        },
      },
    });
  });
}

export async function deleteGroup(actor: User, groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });
  if (!group) throw new ApiError(404, "Group not found.", "NOT_FOUND");
  if (group.createdById !== actor.id) {
    throw new ApiError(403, "Only the group owner can delete it.", "FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    await tx.group.delete({ where: { id: groupId } });
    await tx.auditLog.create({
      data: {
        entity: "GROUP",
        entityId: groupId,
        action: "DELETED",
        actorId: actor.id,
        diff: {
          before: {
            name: group.name,
            memberIds: group.members.map((member) => member.userId),
          },
        },
      },
    });
  });
}
