import { type Prisma } from "@prisma/client";
import { randomToken } from "@/lib/utils";
import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  getClientIp,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { settingsSchema, deleteAccountSchema } from "@/lib/validators";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { accountDeletedEmail } from "@/lib/emails/templates";
import { absoluteUrl } from "@/lib/utils";

function safeUser(user: {
  id: string;
  userId: string;
  name: string;
  email: string;
  upiId: string | null;
  notifyExpense: boolean;
  notifySettlement: boolean;
  notifyFriendRequest: boolean;
  notifyDailyCreditor: boolean;
  remindersOptOut: boolean;
  userIdChangedAt: Date | null;
  emailVerified: Date | null;
}) {
  return {
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
}

export async function PATCH(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`settings:${user.id}`, 30, 10 * 60 * 1000);

    const input = await parseJson(request, settingsSchema);
    const data: Prisma.UserUpdateInput = {};

    if (input.name !== undefined) data.name = input.name;

    if (input.userId !== undefined && input.userId !== user.userId) {
      if (user.userIdChangedAt) {
        throw new ApiError(409, "You can only change your public ID once.", "USER_ID_LOCKED");
      }
      const existing = await prisma.user.findUnique({
        where: { userId: input.userId },
        select: { id: true },
      });
      if (existing) throw new ApiError(409, "That public ID is already taken.", "USER_ID_TAKEN");
      data.userId = input.userId;
      data.userIdChangedAt = new Date();
    }

    if (input.upiId !== undefined) {
      data.upiId = input.upiId.trim() === "" ? null : input.upiId.trim();
    }

    if (input.notifyExpense !== undefined) data.notifyExpense = input.notifyExpense;
    if (input.notifySettlement !== undefined) data.notifySettlement = input.notifySettlement;
    if (input.notifyFriendRequest !== undefined) data.notifyFriendRequest = input.notifyFriendRequest;
    if (input.notifyDailyCreditor !== undefined) data.notifyDailyCreditor = input.notifyDailyCreditor;
    if (input.remindersOptOut !== undefined) data.remindersOptOut = input.remindersOptOut;

    if (Object.keys(data).length === 0) {
      return jsonOk({ user: safeUser(user) });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data });

    await logAudit({
      entity: "USER",
      entityId: user.id,
      action: "UPDATED",
      actorId: user.id,
      diff: { fields: Object.keys(data) },
    });

    return jsonOk({ user: safeUser(updated) });
  });
}

export async function DELETE(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    const ip = getClientIp(request);
    enforceRateLimit(`delete-account:${ip}`, 5, 60 * 60 * 1000);

    const input = await parseJson(request, deleteAccountSchema);
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Incorrect password.", "INVALID_PASSWORD");

    const anonymizedEmail = `deleted+${user.id}@splittrack.invalid`;
    const anonymizedUserId = `deleted_${randomToken(6)}`;
    const placeholderHash = await hashPassword(randomToken(24));

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          entity: "USER",
          entityId: user.id,
          action: "DELETED",
          actorId: user.id,
          diff: { anonymized: true },
        },
      });

      await tx.settlement.updateMany({
        where: { toUserId: user.id, status: "PENDING" },
        data: { status: "REJECTED", confirmedAt: null },
      });
      await tx.settlement.deleteMany({
        where: { fromUserId: user.id, status: "PENDING" },
      });
      await tx.friendship.deleteMany({
        where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
      });
      await tx.invite.deleteMany({ where: { inviterId: user.id } });
      await tx.otpCode.deleteMany({ where: { OR: [{ userId: user.id }, { email: user.email }] } });
      await tx.reminderLog.deleteMany({ where: { userId: user.id } });
      await tx.group.deleteMany({ where: { createdById: user.id } });
      await tx.groupMember.deleteMany({ where: { userId: user.id } });

      await tx.user.update({
        where: { id: user.id },
        data: {
          name: "Deleted member",
          email: anonymizedEmail,
          userId: anonymizedUserId,
          passwordHash: placeholderHash,
          emailVerified: null,
          avatarUrl: null,
          upiId: null,
          userIdChangedAt: null,
          remindersOptOut: true,
          notifyExpense: false,
          notifySettlement: false,
          notifyFriendRequest: false,
          notifyDailyCreditor: false,
          lastReminderSentAt: null,
        },
      });
    });

    const content = accountDeletedEmail({
      name: user.name,
      appUrl: absoluteUrl("/").replace(/\/$/, ""),
    });
    await sendEmail({ to: user.email, ...content });

    return jsonOk({ deleted: true });
  });
}

export const dynamic = "force-dynamic";
