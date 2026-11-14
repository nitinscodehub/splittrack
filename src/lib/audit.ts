import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface AuditInput {
  entity: "EXPENSE" | "SETTLEMENT" | "FRIENDSHIP" | "GROUP" | "USER" | "INVITE";
  entityId: string;
  action: "CREATED" | "UPDATED" | "DELETED" | "CONFIRMED" | "REJECTED";
  actorId: string;
  diff: Prisma.InputJsonValue;
  expenseId?: string | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      actorId: input.actorId,
      diff: input.diff,
      expenseId: input.expenseId ?? null,
    },
  });
}
