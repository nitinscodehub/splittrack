import { prisma } from "@/lib/prisma";
import type { PublicUser } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export interface AuditView {
  id: string;
  action: string;
  actor: PublicUser;
  diff: Prisma.JsonValue;
  createdAt: string;
}

export interface ExpenseFeedItem {
  id: string;
  description: string;
  category: string | null;
  totalPaise: number;
  date: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  groupId: string | null;
  groupName: string | null;
  payer: PublicUser;
  createdBy: PublicUser;
  shares: Array<{ user: PublicUser; sharePaise: number }>;
  auditLogs: AuditView[];
}

export interface SettlementFeedItem {
  id: string;
  amountPaise: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
  from: PublicUser;
  to: PublicUser;
}

export interface ActivityFeed {
  expenses: ExpenseFeedItem[];
  settlements: SettlementFeedItem[];
}

const publicUserSelect = { id: true, userId: true, name: true, avatarUrl: true } as const;

export async function getActivityFeed(userId: string): Promise<ActivityFeed> {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: {
        OR: [{ payerId: userId }, { shares: { some: { userId } } }],
      },
      include: {
        payer: { select: publicUserSelect },
        createdBy: { select: publicUserSelect },
        group: { select: { name: true } },
        shares: {
          include: { user: { select: publicUserSelect } },
          orderBy: { sharePaise: "desc" },
        },
        auditLogs: {
          include: { actor: { select: publicUserSelect } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 400,
    }),
    prisma.settlement.findMany({
      where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
      include: {
        fromUser: { select: publicUserSelect },
        toUser: { select: publicUserSelect },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return {
    expenses: expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      totalPaise: expense.totalPaise,
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
      deletedAt: expense.deletedAt?.toISOString() ?? null,
      groupId: expense.groupId,
      groupName: expense.group?.name ?? null,
      payer: expense.payer,
      createdBy: expense.createdBy,
      shares: expense.shares.map((share) => ({
        user: share.user,
        sharePaise: share.sharePaise,
      })),
      auditLogs: expense.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: log.actor,
        diff: log.diff,
        createdAt: log.createdAt.toISOString(),
      })),
    })),
    settlements: settlements.map((settlement) => ({
      id: settlement.id,
      amountPaise: settlement.amountPaise,
      status: settlement.status,
      note: settlement.note,
      createdAt: settlement.createdAt.toISOString(),
      confirmedAt: settlement.confirmedAt?.toISOString() ?? null,
      from: settlement.fromUser,
      to: settlement.toUser,
    })),
  };
}

export async function getRecentActivity(userId: string, limit = 8): Promise<ActivityFeed> {
  const feed = await getActivityFeed(userId);
  return {
    expenses: feed.expenses
      .filter((expense) => !expense.deletedAt)
      .slice(0, limit),
    settlements: feed.settlements.slice(0, Math.max(2, Math.floor(limit / 2))),
  };
}

export interface DashboardChartPoint {
  label: string;
  yourSharePaise: number;
  paidPaise: number;
}

export async function getDashboardChart(userId: string): Promise<DashboardChartPoint[]> {
  const since = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      date: { gte: since },
      OR: [{ payerId: userId }, { shares: { some: { userId } } }],
    },
    select: {
      payerId: true,
      totalPaise: true,
      date: true,
      shares: { where: { userId }, select: { sharePaise: true } },
    },
    orderBy: { date: "asc" },
  });

  const buckets: DashboardChartPoint[] = [];
  const now = new Date();
  for (let weekOffset = 7; weekOffset >= 0; weekOffset -= 1) {
    const end = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inWeek = expenses.filter((expense) => expense.date >= start && expense.date < end);
    let yourSharePaise = 0;
    let paidPaise = 0;
    for (const expense of inWeek) {
      yourSharePaise += expense.shares[0]?.sharePaise ?? 0;
      if (expense.payerId === userId) paidPaise += expense.totalPaise;
    }
    buckets.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      yourSharePaise,
      paidPaise,
    });
  }
  return buckets;
}
