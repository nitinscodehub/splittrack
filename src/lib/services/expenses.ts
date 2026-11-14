import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyExpenseAdded } from "@/lib/notify";
import { computeShares, LedgerError, type LedgerShare } from "@/lib/ledger";
import { parseExpenseDate } from "@/lib/date";
import type { ExpenseInput } from "@/lib/validators";
import { assertFriends } from "@/lib/services/friends";

interface ValidatedSplit {
  participantIds: string[];
  shares: LedgerShare[];
  payerName: string;
  participantNames: Map<string, string>;
}

async function validateAndComputeSplit(actor: User, input: ExpenseInput): Promise<ValidatedSplit> {
  const uniqueParticipants = [...new Set(input.participantIds)];
  if (uniqueParticipants.length !== input.participantIds.length) {
    throw new ApiError(422, "The same person is added twice.", "DUPLICATE_PARTICIPANT");
  }
  if (uniqueParticipants.length < 2) {
    throw new ApiError(422, "Pick at least one friend.", "MIN_PARTICIPANTS");
  }
  if (!uniqueParticipants.includes(input.payerId)) {
    throw new ApiError(422, "The person who paid must be in the bill.", "PAYER_NOT_PARTICIPANT");
  }
  if (!uniqueParticipants.includes(actor.id)) {
    throw new ApiError(422, "You must be in the bill.", "ACTOR_NOT_PARTICIPANT");
  }

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueParticipants } },
    select: { id: true, name: true },
  });
  if (users.length !== uniqueParticipants.length) {
    throw new ApiError(422, "One or more people no longer exist.", "USER_NOT_FOUND");
  }

  if (input.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: input.groupId },
      include: { members: { select: { userId: true } } },
    });
    if (!group) throw new ApiError(404, "Group not found.", "GROUP_NOT_FOUND");
    const memberIds = new Set(group.members.map((member) => member.userId));
    if (!memberIds.has(actor.id)) {
      throw new ApiError(403, "You're not a member of this group.", "NOT_GROUP_MEMBER");
    }
    for (const participantId of uniqueParticipants) {
      if (!memberIds.has(participantId)) {
        throw new ApiError(422, "Everyone in the bill must be in the group.", "NOT_GROUP_MEMBER");
      }
    }
  } else {
    for (const participantId of uniqueParticipants) {
      if (participantId !== actor.id) await assertFriends(actor.id, participantId);
    }
    for (const participantId of uniqueParticipants) {
      if (participantId !== input.payerId) await assertFriends(input.payerId, participantId);
    }
  }

  let shares: LedgerShare[];
  try {
    shares = computeShares({
      totalPaise: input.totalPaise,
      participantIds: uniqueParticipants,
      mode: input.splitMode,
      customShares: input.customShares,
    });
  } catch (error) {
    if (error instanceof LedgerError) throw new ApiError(422, error.message, "INVALID_SPLIT");
    throw error;
  }

  const participantNames = new Map(users.map((user) => [user.id, user.name]));
  return {
    participantIds: uniqueParticipants,
    shares,
    payerName: participantNames.get(input.payerId) ?? "Someone",
    participantNames,
  };
}

function normalizeCategory(category: string | null | undefined): string | null {
  const trimmed = category?.trim();
  return trimmed ? trimmed : null;
}

export async function createExpense(actor: User, input: ExpenseInput): Promise<string> {
  const split = await validateAndComputeSplit(actor, input);

  let date: Date;
  try {
    date = parseExpenseDate(input.date);
  } catch {
    throw new ApiError(422, "Enter a valid bill date.", "INVALID_DATE");
  }

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        payerId: input.payerId,
        groupId: input.groupId ?? null,
        totalPaise: input.totalPaise,
        description: input.description,
        category: normalizeCategory(input.category),
        date,
        createdById: actor.id,
        shares: { create: split.shares.map((share) => ({ ...share })) },
      },
    });

    await tx.auditLog.create({
      data: {
        entity: "EXPENSE",
        entityId: created.id,
        action: "CREATED",
        actorId: actor.id,
        expenseId: created.id,
        diff: {
          after: {
            description: input.description,
            totalPaise: input.totalPaise,
            payerId: input.payerId,
            participantIds: split.participantIds,
            shares: split.shares,
            category: normalizeCategory(input.category),
            date: date.toISOString(),
            groupId: input.groupId ?? null,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  await notifyExpenseAdded({
    actorId: actor.id,
    payerName: split.payerName,
    description: input.description,
    totalPaise: input.totalPaise,
    shares: split.shares,
  });

  return expense.id;
}

export async function updateExpense(
  actor: User,
  expenseId: string,
  input: ExpenseInput,
): Promise<void> {
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      shares: { select: { userId: true, sharePaise: true } },
      payer: { select: { id: true, name: true } },
    },
  });
  if (!existing || existing.deletedAt) {
    throw new ApiError(404, "Bill not found.", "EXPENSE_NOT_FOUND");
  }

  const wasParticipant = existing.shares.some((share) => share.userId === actor.id);
  if (!wasParticipant && existing.createdById !== actor.id && existing.payerId !== actor.id) {
    throw new ApiError(403, "Only people in this bill can edit it.", "FORBIDDEN");
  }

  const split = await validateAndComputeSplit(actor, { ...input, groupId: existing.groupId });

  let date: Date;
  try {
    date = parseExpenseDate(input.date);
  } catch {
    throw new ApiError(422, "Enter a valid bill date.", "INVALID_DATE");
  }

  const before = {
    description: existing.description,
    totalPaise: existing.totalPaise,
    payerId: existing.payerId,
    category: existing.category,
    date: existing.date.toISOString(),
    shares: existing.shares,
  };

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expenseId },
      data: {
        payerId: input.payerId,
        totalPaise: input.totalPaise,
        description: input.description,
        category: normalizeCategory(input.category),
        date,
      },
    });

    await tx.expenseShare.deleteMany({ where: { expenseId } });
    await tx.expenseShare.createMany({
      data: split.shares.map((share) => ({
        expenseId,
        userId: share.userId,
        sharePaise: share.sharePaise,
      })),
    });

    await tx.auditLog.create({
      data: {
        entity: "EXPENSE",
        entityId: expenseId,
        action: "UPDATED",
        actorId: actor.id,
        expenseId,
        diff: {
          before,
          after: {
            description: input.description,
            totalPaise: input.totalPaise,
            payerId: input.payerId,
            participantIds: split.participantIds,
            shares: split.shares,
            category: normalizeCategory(input.category),
            date: date.toISOString(),
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });
  });
}

export async function deleteExpense(actor: User, expenseId: string): Promise<void> {
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      shares: { select: { userId: true, sharePaise: true } },
      payer: { select: { name: true } },
    },
  });
  if (!existing || existing.deletedAt) {
    throw new ApiError(404, "Bill not found.", "EXPENSE_NOT_FOUND");
  }

  const wasParticipant = existing.shares.some((share) => share.userId === actor.id);
  if (!wasParticipant && existing.createdById !== actor.id && existing.payerId !== actor.id) {
    throw new ApiError(403, "Only people in this bill can delete it.", "FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({ where: { id: expenseId }, data: { deletedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        entity: "EXPENSE",
        entityId: expenseId,
        action: "DELETED",
        actorId: actor.id,
        expenseId,
        diff: {
          before: {
            description: existing.description,
            totalPaise: existing.totalPaise,
            payerId: existing.payerId,
            category: existing.category,
            date: existing.date.toISOString(),
            shares: existing.shares,
          },
        },
      },
    });
  });
}
