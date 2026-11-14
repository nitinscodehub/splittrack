import { prisma } from "@/lib/prisma";
import {
  buildNetMatrix,
  getNetForUser,
  getPairNet,
  getTotals,
  type LedgerSettlement,
  type LedgerExpense,
} from "@/lib/ledger";
import type { PublicUser } from "@/lib/validators";

export interface BalanceItem {
  kind: "expense" | "settlement";
  id: string;
  date: string;
  description: string;
  amountPaise: number;
  /** Positive effect on your net position (i.e. reduces what you owe / increases what you're owed). */
  signedDeltaPaise: number;
  direction: "you-owe" | "owes-you" | "you-paid" | "they-paid";
  category: string | null;
}

export interface BalanceUser extends PublicUser {
  upiId: string | null;
}

export interface FriendBalance {
  user: BalanceUser;
  netPaise: number;
  items: BalanceItem[];
  lastActivityAt: string;
}

export interface BalanceOverview {
  pairs: FriendBalance[];
  totals: { youOwePaise: number; youAreOwedPaise: number; netPaise: number };
}

interface ExpenseRow {
  id: string;
  payerId: string;
  description: string;
  category: string | null;
  date: Date;
  createdAt: Date;
  shares: Array<{ userId: string; sharePaise: number }>;
}

interface SettlementRow {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
  note: string | null;
  createdAt: Date;
}

export function computeBalanceOverview(input: {
  userId: string;
  expenses: ExpenseRow[];
  settlements: SettlementRow[];
  users: Map<string, BalanceUser>;
}): BalanceOverview {
  const { userId } = input;
  const ledgerExpenses: LedgerExpense[] = input.expenses.map((expense) => ({
    id: expense.id,
    payerId: expense.payerId,
    description: expense.description,
    category: expense.category,
    date: expense.date,
    shares: expense.shares,
  }));

  const ledgerSettlements: LedgerSettlement[] = input.settlements.map((settlement) => ({
    id: settlement.id,
    fromUserId: settlement.fromUserId,
    toUserId: settlement.toUserId,
    amountPaise: settlement.amountPaise,
    status: "CONFIRMED",
    note: settlement.note,
    createdAt: settlement.createdAt,
  }));

  const matrix = buildNetMatrix(ledgerExpenses, ledgerSettlements);
  const entries = getNetForUser(matrix, userId);

  const itemsByOther = new Map<string, BalanceItem[]>();
  const activityByOther = new Map<string, number>();

  const pushItem = (otherId: string, item: BalanceItem) => {
    const list = itemsByOther.get(otherId) ?? [];
    list.push(item);
    itemsByOther.set(otherId, list);
    activityByOther.set(
      otherId,
      Math.max(activityByOther.get(otherId) ?? 0, new Date(item.date).getTime()),
    );
  };

  for (const expense of input.expenses) {
    if (expense.payerId === userId) {
      for (const share of expense.shares) {
        if (share.userId === userId || share.sharePaise <= 0) continue;
        pushItem(share.userId, {
          kind: "expense",
          id: expense.id,
          date: expense.date.toISOString(),
          description: expense.description,
          amountPaise: share.sharePaise,
          signedDeltaPaise: share.sharePaise,
          direction: "owes-you",
          category: expense.category,
        });
      }
    } else {
      const myShare = expense.shares.find((share) => share.userId === userId);
      if (!myShare || myShare.sharePaise <= 0) continue;
      pushItem(expense.payerId, {
        kind: "expense",
        id: expense.id,
        date: expense.date.toISOString(),
        description: expense.description,
        amountPaise: myShare.sharePaise,
        signedDeltaPaise: -myShare.sharePaise,
        direction: "you-owe",
        category: expense.category,
      });
    }
  }

  for (const settlement of input.settlements) {
    if (settlement.fromUserId === userId) {
      pushItem(settlement.toUserId, {
        kind: "settlement",
        id: settlement.id,
        date: settlement.createdAt.toISOString(),
        description: settlement.note?.trim() ? `Payment · ${settlement.note}` : "Payment sent",
        amountPaise: settlement.amountPaise,
        signedDeltaPaise: settlement.amountPaise,
        direction: "you-paid",
        category: null,
      });
    } else {
      pushItem(settlement.fromUserId, {
        kind: "settlement",
        id: settlement.id,
        date: settlement.createdAt.toISOString(),
        description: settlement.note?.trim() ? `Payment · ${settlement.note}` : "Payment received",
        amountPaise: settlement.amountPaise,
        signedDeltaPaise: -settlement.amountPaise,
        direction: "they-paid",
        category: null,
      });
    }
  }

  const pairs: FriendBalance[] = entries
    .map((entry) => {
      const user = input.users.get(entry.userId);
      if (!user) return null;
      const items = (itemsByOther.get(entry.userId) ?? []).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return {
        user,
        netPaise: entry.netPaise,
        items,
        lastActivityAt: new Date(activityByOther.get(entry.userId) ?? 0).toISOString(),
      };
    })
    .filter((pair): pair is FriendBalance => pair !== null && pair.netPaise !== 0)
    .sort((a, b) => Math.abs(b.netPaise) - Math.abs(a.netPaise));

  return { pairs, totals: getTotals(entries) };
}

export async function getBalanceOverview(userId: string): Promise<BalanceOverview> {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: {
        deletedAt: null,
        OR: [{ payerId: userId }, { shares: { some: { userId } } }],
      },
      select: {
        id: true,
        payerId: true,
        description: true,
        category: true,
        date: true,
        createdAt: true,
        shares: { select: { userId: true, sharePaise: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.settlement.findMany({
      where: {
        status: "CONFIRMED",
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      select: {
        id: true,
        fromUserId: true,
        toUserId: true,
        amountPaise: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const otherIds = new Set<string>();
  for (const expense of expenses) {
    otherIds.add(expense.payerId);
    for (const share of expense.shares) otherIds.add(share.userId);
  }
  for (const settlement of settlements) {
    otherIds.add(settlement.fromUserId);
    otherIds.add(settlement.toUserId);
  }
  otherIds.delete(userId);

  const users = await prisma.user.findMany({
    where: { id: { in: [...otherIds] } },
    select: { id: true, userId: true, name: true, avatarUrl: true, upiId: true },
  });

  return computeBalanceOverview({
    userId,
    expenses,
    settlements,
    users: new Map(users.map((user) => [user.id, user])),
  });
}

/** Net position for a pair: positive => `otherId` owes `userId`, negative => `userId` owes. */
export async function getPairBalance(userId: string, otherId: string): Promise<number> {
  const overview = await getBalanceOverview(userId);
  const pair = overview.pairs.find((entry) => entry.user.id === otherId);
  return pair?.netPaise ?? 0;
}

export async function getPairNetBetween(userId: string, otherId: string): Promise<number> {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: {
        deletedAt: null,
        OR: [
          { payerId: userId, shares: { some: { userId: otherId } } },
          { payerId: otherId, shares: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        payerId: true,
        shares: { select: { userId: true, sharePaise: true } },
      },
    }),
    prisma.settlement.findMany({
      where: {
        status: "CONFIRMED",
        OR: [
          { fromUserId: userId, toUserId: otherId },
          { fromUserId: otherId, toUserId: userId },
        ],
      },
      select: { id: true, fromUserId: true, toUserId: true, amountPaise: true, status: true },
    }),
  ]);

  const matrix = buildNetMatrix(
    expenses.map((expense) => ({ ...expense, shares: expense.shares })),
    settlements,
  );
  return getPairNet(matrix, userId, otherId);
}
