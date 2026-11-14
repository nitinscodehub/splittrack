import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  jsonOk,
  parseJson,
  withApi,
} from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/services/friends";
import { getPairNetBetween } from "@/lib/balances";
import { notifyManualReminder } from "@/lib/notify";
import { getIstDateKey } from "@/lib/date";
import { reminderSchema } from "@/lib/validators";
import { formatINR } from "@/lib/money";

export async function POST(request: Request): Promise<Response> {
  return withApi(async () => {
    assertSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit(`remind:${user.id}`, 30, 60 * 60 * 1000);

    const input = await parseJson(request, reminderSchema);

    if (!(await areFriends(user.id, input.toUserId))) {
      throw new ApiError(403, "You can only remind friends.", "NOT_FRIENDS");
    }

    const net = await getPairNetBetween(user.id, input.toUserId);
    if (net <= 0) {
      throw new ApiError(422, "This person does not have to pay you anything.", "NOTHING_OWED");
    }

    const dateKey = getIstDateKey();
    const sentForKey = `manual:${user.id}:${input.toUserId}:${dateKey}`;
    const cooldownStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const existing = await prisma.reminderLog.findFirst({
      where: {
        sentForKey: { startsWith: `manual:${user.id}:${input.toUserId}:` },
        sentAt: { gte: cooldownStart },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(
        429,
        "You already reminded this person in the last 24 hours.",
        "REMINDER_COOLDOWN",
      );
    }

    const counterparty = await prisma.user.findUnique({
      where: { id: input.toUserId },
      select: { name: true, remindersOptOut: true },
    });
    if (!counterparty) throw new ApiError(404, "Person not found.", "NOT_FOUND");
    if (counterparty.remindersOptOut) {
      throw new ApiError(
        409,
        `${counterparty.name} has turned off reminder emails.`,
        "REMINDERS_OPTED_OUT",
      );
    }

    try {
      await prisma.reminderLog.create({
        data: {
          userId: input.toUserId,
          kind: "MANUAL",
          sentForKey,
          meta: { fromUserId: user.id, amountPaise: net },
        },
      });
    } catch {
      throw new ApiError(
        429,
        "You already reminded this person in the last 24 hours.",
        "REMINDER_COOLDOWN",
      );
    }

    await notifyManualReminder({
      fromUserId: user.id,
      toUserId: input.toUserId,
      amountPaise: net,
    });

    return jsonOk({ sent: true, amountFormatted: formatINR(net) });
  });
}

export const dynamic = "force-dynamic";
