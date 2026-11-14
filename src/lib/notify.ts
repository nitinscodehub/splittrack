import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/utils";
import { formatINR } from "@/lib/money";
import { unsubscribeUrl } from "@/lib/subscription";
import {
  dailyCreditorEmail,
  dailyDebtorEmail,
  expenseEmail,
  friendRequestEmail,
  inviteEmail,
  manualReminderEmail,
  otpEmail,
  settlementEmail,
  type ReminderRow,
} from "@/lib/emails/templates";

/**
 * Notification helpers. Every function is best-effort: a failed email must
 * never roll back the database mutation that triggered it.
 */

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendOtpEmail(input: {
  to: string;
  name: string;
  code: string;
  purpose: "SIGNUP" | "RESET";
}): Promise<boolean> {
  const content = otpEmail({ name: input.name, code: input.code, purpose: input.purpose });
  return sendEmail({ to: input.to, ...content });
}

export async function sendInviteEmail(input: {
  inviterName: string;
  inviteUrl: string;
  email?: string;
}): Promise<void> {
  if (!input.email) return;
  try {
    const content = inviteEmail(input);
    await sendEmail({ to: input.email, ...content });
  } catch (error) {
    console.error("[notify] invite failed", error);
  }
}

export async function notifyExpenseAdded(input: {
  actorId: string;
  payerName: string;
  description: string;
  totalPaise: number;
  shares: Array<{ userId: string; sharePaise: number }>;
}): Promise<void> {
  try {
    const participantIds = input.shares.filter((share) => share.sharePaise > 0).map((s) => s.userId);
    if (participantIds.length === 0) return;

    const [actor, recipients] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.actorId }, select: { name: true } }),
      prisma.user.findMany({
        where: { id: { in: participantIds }, notifyExpense: true },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const actorName = actor?.name ?? "A friend";

    await Promise.all(
      recipients.map(async (recipient) => {
        const share = input.shares.find((entry) => entry.userId === recipient.id);
        if (!share) return;
        const content = expenseEmail({
          recipientName: recipient.name,
          actorName,
          payerName: input.payerName,
          description: input.description,
          totalFormatted: formatINR(input.totalPaise),
          shareFormatted: formatINR(share.sharePaise),
          appUrl: appUrl(),
        });
        await sendEmail({ to: recipient.email, ...content });
      }),
    );
  } catch (error) {
    console.error("[notify] expense failed", error);
  }
}

export async function notifyFriendRequest(friendshipId: string): Promise<void> {
  try {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: { select: { name: true } },
        addressee: { select: { name: true, email: true, notifyFriendRequest: true } },
      },
    });
    if (!friendship || !friendship.addressee.notifyFriendRequest) return;

    const content = friendRequestEmail({
      recipientName: friendship.addressee.name,
      actorName: friendship.requester.name,
      appUrl: appUrl(),
    });
    await sendEmail({ to: friendship.addressee.email, ...content });
  } catch (error) {
    console.error("[notify] friend request failed", error);
  }
}

export async function notifySettlementMarked(settlementId: string): Promise<void> {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true, email: true, notifySettlement: true } },
      },
    });
    if (!settlement || !settlement.toUser.notifySettlement) return;

    const content = settlementEmail({
      recipientName: settlement.toUser.name,
      actorName: settlement.fromUser.name,
      amountFormatted: formatINR(settlement.amountPaise),
      status: "marked",
      note: settlement.note,
      appUrl: appUrl(),
    });
    await sendEmail({ to: settlement.toUser.email, ...content });
  } catch (error) {
    console.error("[notify] settlement marked failed", error);
  }
}

export async function notifySettlementResolved(
  settlementId: string,
  status: "confirmed" | "rejected",
): Promise<void> {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { name: true, email: true, notifySettlement: true } },
        toUser: { select: { name: true } },
      },
    });
    if (!settlement || !settlement.fromUser.notifySettlement) return;

    const content = settlementEmail({
      recipientName: settlement.fromUser.name,
      actorName: settlement.toUser.name,
      amountFormatted: formatINR(settlement.amountPaise),
      status,
      note: settlement.note,
      appUrl: appUrl(),
    });
    await sendEmail({ to: settlement.fromUser.email, ...content });
  } catch (error) {
    console.error("[notify] settlement resolved failed", error);
  }
}

export async function notifyManualReminder(input: {
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
}): Promise<void> {
  try {
    const [from, to] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.fromUserId }, select: { name: true } }),
      prisma.user.findUnique({
        where: { id: input.toUserId },
        select: { name: true, email: true, remindersOptOut: true },
      }),
    ]);
    if (!from || !to || to.remindersOptOut) return;

    const content = manualReminderEmail({
      recipientName: to.name,
      actorName: from.name,
      amountFormatted: formatINR(input.amountPaise),
      appUrl: appUrl(),
      unsubscribeUrl: unsubscribeUrl(input.toUserId),
    });
    await sendEmail({ to: to.email, ...content });
  } catch (error) {
    console.error("[notify] manual reminder failed", error);
  }
}

export async function sendDailyDebtorEmail(input: {
  userId: string;
  rows: ReminderRow[];
  totalPaise: number;
}): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true, email: true, remindersOptOut: true },
  });
  if (!user || user.remindersOptOut) return false;

  const content = dailyDebtorEmail({
    name: user.name,
    rows: input.rows,
    totalFormatted: formatINR(input.totalPaise),
    appUrl: appUrl(),
    unsubscribeUrl: unsubscribeUrl(input.userId),
  });
  return sendEmail({ to: user.email, ...content });
}

export async function sendDailyCreditorEmail(input: {
  userId: string;
  rows: ReminderRow[];
  totalPaise: number;
}): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true, email: true, remindersOptOut: true, notifyDailyCreditor: true },
  });
  if (!user || user.remindersOptOut || !user.notifyDailyCreditor) return false;

  const content = dailyCreditorEmail({
    name: user.name,
    rows: input.rows,
    totalFormatted: formatINR(input.totalPaise),
    appUrl: appUrl(),
    unsubscribeUrl: unsubscribeUrl(input.userId),
  });
  return sendEmail({ to: user.email, ...content });
}
