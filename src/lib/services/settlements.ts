import type { User } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifySettlementMarked, notifySettlementResolved } from "@/lib/notify";
import { getPairNetBetween } from "@/lib/balances";
import { assertFriends } from "@/lib/services/friends";
import type { PublicUser } from "@/lib/validators";
import type { SettlementInput } from "@/lib/validators";

export interface SettlementView {
  id: string;
  amountPaise: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
  from: PublicUser;
  to: PublicUser;
}

export async function createSettlement(actor: User, input: SettlementInput): Promise<string> {
  if (input.toUserId === actor.id) {
    throw new ApiError(422, "You can't mark a payment to yourself.", "SELF_SETTLEMENT");
  }
  await assertFriends(actor.id, input.toUserId);

  const creditor = await prisma.user.findUnique({ where: { id: input.toUserId } });
  if (!creditor) throw new ApiError(404, "Person not found.", "USER_NOT_FOUND");

  const [net, pending] = await Promise.all([
    getPairNetBetween(actor.id, input.toUserId),
    prisma.settlement.aggregate({
      where: { fromUserId: actor.id, toUserId: input.toUserId, status: "PENDING" },
      _sum: { amountPaise: true },
    }),
  ]);
  const outstanding = net < 0 ? -net : 0;
  if (outstanding === 0) {
    throw new ApiError(422, "You don't have to pay this person right now.", "NOTHING_OWED");
  }
  const pendingPaise = pending._sum.amountPaise ?? 0;
  const available = Math.max(0, outstanding - pendingPaise);
  if (input.amountPaise > available) {
    throw new ApiError(
      422,
      pendingPaise > 0
        ? "That is more than what is left after your waiting payment."
        : "Payment can't be more than what you have to pay.",
      "AMOUNT_TOO_HIGH",
    );
  }

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.settlement.create({
      data: {
        fromUserId: actor.id,
        toUserId: input.toUserId,
        amountPaise: input.amountPaise,
        note: input.note?.trim() || null,
        status: "PENDING",
      },
    });

    await tx.auditLog.create({
      data: {
        entity: "SETTLEMENT",
        entityId: created.id,
        action: "CREATED",
        actorId: actor.id,
        diff: {
          fromUserId: actor.id,
          toUserId: input.toUserId,
          amountPaise: input.amountPaise,
          note: input.note ?? null,
        },
      },
    });

    return created;
  });

  await notifySettlementMarked(settlement.id);
  return settlement.id;
}

export async function respondToSettlement(
  actor: User,
  settlementId: string,
  action: "confirm" | "reject",
): Promise<void> {
  const settlement = await prisma.settlement.findUnique({ where: { id: settlementId } });
  if (!settlement) throw new ApiError(404, "Payment not found.", "NOT_FOUND");
  if (settlement.toUserId !== actor.id) {
    throw new ApiError(403, "Only the person getting the money can confirm this payment.", "FORBIDDEN");
  }
  if (settlement.status !== "PENDING") {
    throw new ApiError(409, "This payment was already handled.", "ALREADY_RESOLVED");
  }

  await prisma.$transaction(async (tx) => {
    await tx.settlement.update({
      where: { id: settlementId },
      data: {
        status: action === "confirm" ? "CONFIRMED" : "REJECTED",
        confirmedAt: action === "confirm" ? new Date() : null,
      },
    });

    await tx.auditLog.create({
      data: {
        entity: "SETTLEMENT",
        entityId: settlementId,
        action: action === "confirm" ? "CONFIRMED" : "REJECTED",
        actorId: actor.id,
        diff: {
          fromUserId: settlement.fromUserId,
          toUserId: settlement.toUserId,
          amountPaise: settlement.amountPaise,
          action,
        },
      },
    });
  });

  await notifySettlementResolved(settlementId, action === "confirm" ? "confirmed" : "rejected");
}

export async function getPendingSettlements(userId: string): Promise<SettlementView[]> {
  const settlements = await prisma.settlement.findMany({
    where: {
      status: "PENDING",
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    include: {
      fromUser: { select: { id: true, userId: true, name: true, avatarUrl: true } },
      toUser: { select: { id: true, userId: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return settlements.map((settlement) => ({
    id: settlement.id,
    amountPaise: settlement.amountPaise,
    status: settlement.status,
    note: settlement.note,
    createdAt: settlement.createdAt.toISOString(),
    confirmedAt: settlement.confirmedAt?.toISOString() ?? null,
    from: settlement.fromUser,
    to: settlement.toUser,
  }));
}

export async function getSettlementById(settlementId: string): Promise<SettlementView | null> {
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: {
      fromUser: { select: { id: true, userId: true, name: true, avatarUrl: true } },
      toUser: { select: { id: true, userId: true, name: true, avatarUrl: true } },
    },
  });
  if (!settlement) return null;
  return {
    id: settlement.id,
    amountPaise: settlement.amountPaise,
    status: settlement.status,
    note: settlement.note,
    createdAt: settlement.createdAt.toISOString(),
    confirmedAt: settlement.confirmedAt?.toISOString() ?? null,
    from: settlement.fromUser,
    to: settlement.toUser,
  };
}
