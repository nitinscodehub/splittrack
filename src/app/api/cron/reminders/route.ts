import { Prisma } from "@prisma/client";
import { jsonError, jsonOk, withApi } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getBalanceOverview } from "@/lib/balances";
import { getIstDateKey } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { sendDailyCreditorEmail, sendDailyDebtorEmail } from "@/lib/notify";
import type { ReminderRow } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function claimReminder(input: {
  userId: string;
  kind: string;
  sentForKey: string;
  meta: Prisma.InputJsonValue;
}): Promise<boolean> {
  const existing = await prisma.reminderLog.findUnique({
    where: { sentForKey: input.sentForKey },
    select: { id: true },
  });
  if (existing) return false;

  try {
    await prisma.reminderLog.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        sentForKey: input.sentForKey,
        meta: input.meta,
      },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}

async function releaseReminder(sentForKey: string): Promise<void> {
  await prisma.reminderLog.deleteMany({ where: { sentForKey } });
}

/**
 * Daily cron at 03:30 UTC (09:00 AM IST).
 * Vercel invokes this with `Authorization: Bearer $CRON_SECRET`.
 * ReminderLog.sentForKey makes the route idempotent for the day.
 */
export async function GET(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET) {
    return jsonError(500, "CRON_SECRET is not configured.", "CRON_NOT_CONFIGURED");
  }
  if (!isAuthorized(request)) {
    return jsonError(401, "Unauthorized.", "UNAUTHORIZED");
  }

  return withApi(async () => {
    const dateKey = getIstDateKey();

    const users = await prisma.user.findMany({
      where: {
        emailVerified: { not: null },
        remindersOptOut: false,
      },
      select: { id: true, name: true },
      take: 500,
    });

    let debtorEmails = 0;
    let creditorEmails = 0;

    for (const user of users) {
      const overview = await getBalanceOverview(user.id);
      let userSent = false;

      const debtPairs = overview.pairs.filter((pair) => pair.netPaise < 0);
      if (debtPairs.length > 0) {
        const rows: ReminderRow[] = debtPairs.map((pair) => ({
          name: pair.user.name,
          amountFormatted: formatINR(-pair.netPaise),
          detail: `${pair.items.length} entr${pair.items.length === 1 ? "y" : "ies"} in your history`,
        }));
        const claimed = await claimReminder({
          userId: user.id,
          kind: "DAILY_DEBTOR",
          sentForKey: `daily-debtor:${user.id}:${dateKey}`,
          meta: {
            rows: rows.map((row) => ({ ...row })),
            totalPaise: overview.totals.youOwePaise,
          } as unknown as Prisma.InputJsonValue,
        });
        if (claimed) {
          const sent = await sendDailyDebtorEmail({
            userId: user.id,
            rows,
            totalPaise: overview.totals.youOwePaise,
          });
          if (sent) {
            debtorEmails += 1;
            userSent = true;
          } else {
            await releaseReminder(`daily-debtor:${user.id}:${dateKey}`);
          }
        }
      }

      const creditPairs = overview.pairs.filter((pair) => pair.netPaise > 0);
      if (creditPairs.length > 0) {
        const rows: ReminderRow[] = creditPairs.map((pair) => ({
          name: pair.user.name,
          amountFormatted: formatINR(pair.netPaise),
          detail: `${pair.items.length} entr${pair.items.length === 1 ? "y" : "ies"} in your history`,
        }));
        const claimed = await claimReminder({
          userId: user.id,
          kind: "DAILY_CREDITOR",
          sentForKey: `daily-creditor:${user.id}:${dateKey}`,
          meta: {
            rows: rows.map((row) => ({ ...row })),
            totalPaise: overview.totals.youAreOwedPaise,
          } as unknown as Prisma.InputJsonValue,
        });
        if (claimed) {
          const sent = await sendDailyCreditorEmail({
            userId: user.id,
            rows,
            totalPaise: overview.totals.youAreOwedPaise,
          });
          if (sent) {
            creditorEmails += 1;
            userSent = true;
          } else {
            await releaseReminder(`daily-creditor:${user.id}:${dateKey}`);
          }
        }
      }

      if (userSent) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastReminderSentAt: new Date() },
        });
      }
    }

    return jsonOk({
      ok: true,
      dateKey,
      usersChecked: users.length,
      debtorEmails,
      creditorEmails,
    });
  });
}
