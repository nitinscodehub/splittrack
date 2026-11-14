import { describe, expect, it } from "vitest";
import {
  buildNetMatrix,
  computeShares,
  getNetForUser,
  getPairNet,
  getAggregateNet,
  getTotals,
  LedgerError,
  recomputeNetMatrix,
  simplifyDebts,
  splitByExact,
  splitByPercent,
  splitEqual,
  type LedgerExpense,
  type LedgerSettlement,
} from "@/lib/ledger";

const A = "user_a";
const B = "user_b";
const C = "user_c";
const D = "user_d";

function expense(
  id: string,
  payerId: string,
  totalPaise: number,
  participants: string[],
  overrides: Partial<LedgerExpense> = {},
): LedgerExpense {
  return {
    id,
    payerId,
    shares: splitEqual(totalPaise, participants),
    ...overrides,
  };
}

function settlement(
  id: string,
  fromUserId: string,
  toUserId: string,
  amountPaise: number,
  status: LedgerSettlement["status"] = "CONFIRMED",
): LedgerSettlement {
  return { id, fromUserId, toUserId, amountPaise, status };
}

describe("splitEqual", () => {
  it("splits ₹100 equally between four people", () => {
    const shares = splitEqual(10000, [A, B, C, D]);
    expect(shares).toEqual([
      { userId: A, sharePaise: 2500 },
      { userId: B, sharePaise: 2500 },
      { userId: C, sharePaise: 2500 },
      { userId: D, sharePaise: 2500 },
    ]);
  });

  it("distributes remainder paise deterministically, never losing a paisa", () => {
    const first = splitEqual(10000, [C, A, B]);
    const second = splitEqual(10000, [B, C, A]);

    expect(first).toEqual([
      { userId: A, sharePaise: 3334 },
      { userId: B, sharePaise: 3333 },
      { userId: C, sharePaise: 3333 },
    ]);
    expect(second).toEqual(first);
    expect(first.reduce((sum, share) => sum + share.sharePaise, 0)).toBe(10000);
  });

  it("handles ₹0.01 across two people", () => {
    const shares = splitEqual(1, [B, A]);
    expect(shares).toEqual([
      { userId: A, sharePaise: 1 },
      { userId: B, sharePaise: 0 },
    ]);
  });

  it("rejects negative and fractional amounts", () => {
    expect(() => splitEqual(-1, [A, B])).toThrow(LedgerError);
    expect(() => splitEqual(10.5, [A, B])).toThrow(LedgerError);
  });
});

describe("custom splits", () => {
  it("accepts exact shares that sum to the total", () => {
    expect(
      splitByExact(10000, [
        { userId: A, sharePaise: 3000 },
        { userId: B, sharePaise: 7000 },
      ]),
    ).toEqual([
      { userId: A, sharePaise: 3000 },
      { userId: B, sharePaise: 7000 },
    ]);
  });

  it("rejects exact shares that don't sum to the total", () => {
    expect(() =>
      splitByExact(10000, [
        { userId: A, sharePaise: 3000 },
        { userId: B, sharePaise: 6000 },
      ]),
    ).toThrow(/must add up/i);
  });

  it("converts percentages (basis points) without float drift", () => {
    const shares = splitByPercent(101, [
      { userId: B, percentBps: 5000 },
      { userId: A, percentBps: 5000 },
    ]);
    expect(shares).toEqual([
      { userId: B, sharePaise: 50 },
      { userId: A, sharePaise: 51 },
    ]);
    expect(shares.reduce((sum, share) => sum + share.sharePaise, 0)).toBe(101);
  });

  it("rejects percentages that don't add to 100%", () => {
    expect(() =>
      splitByPercent(1000, [
        { userId: A, percentBps: 5000 },
        { userId: B, percentBps: 4999 },
      ]),
    ).toThrow(/100%/);
  });

  it("computes exact and percent custom splits from a client payload", () => {
    expect(
      computeShares({
        totalPaise: 10000,
        participantIds: [A, B],
        mode: "exact",
        customShares: [
          { userId: A, value: 2500 },
          { userId: B, value: 7500 },
        ],
      }),
    ).toEqual([
      { userId: A, sharePaise: 2500 },
      { userId: B, sharePaise: 7500 },
    ]);

    expect(
      computeShares({
        totalPaise: 10000,
        participantIds: [A, B],
        mode: "percent",
        customShares: [
          { userId: A, value: 2500 },
          { userId: B, value: 7500 },
        ],
      }),
    ).toEqual([
      { userId: A, sharePaise: 2500 },
      { userId: B, sharePaise: 7500 },
    ]);
  });
});

describe("accumulation", () => {
  it("accumulates debts across multiple payments by the same payer", () => {
    const expenses = [
      expense("e1", A, 10000, [A, B, C, D]),
      expense("e2", A, 10000, [A, B, C, D]),
    ];
    const matrix = buildNetMatrix(expenses);

    expect(getPairNet(matrix, A, B)).toBe(5000);
    expect(getPairNet(matrix, A, C)).toBe(5000);
    expect(getPairNet(matrix, A, D)).toBe(5000);
    expect(getPairNet(matrix, B, A)).toBe(-5000);
  });
});

describe("automatic pairwise netting (section 6 scenario)", () => {
  it("cancels mutual debts while leaving the other debts intact", () => {
    const expenses = [
      expense("e1", A, 10000, [A, B, C, D]),
      expense("e2", A, 10000, [A, B, C, D]),
      expense("e3", B, 20000, [A, B, C, D]),
    ];
    const matrix = buildNetMatrix(expenses);

    // A–B nets to zero: B's 50 share-credit cancels B's 50 owed to A.
    expect(getPairNet(matrix, A, B)).toBe(0);
    expect(getPairNet(matrix, B, A)).toBe(0);

    // C and D each owe ₹50 to A and ₹50 to B.
    expect(getPairNet(matrix, A, C)).toBe(5000);
    expect(getPairNet(matrix, A, D)).toBe(5000);
    expect(getPairNet(matrix, B, C)).toBe(5000);
    expect(getPairNet(matrix, B, D)).toBe(5000);

    // No debt between C and D.
    expect(getPairNet(matrix, C, D)).toBe(0);
  });

  it("reports A's net position and totals", () => {
    const expenses = [
      expense("e1", A, 10000, [A, B, C, D]),
      expense("e2", A, 10000, [A, B, C, D]),
      expense("e3", B, 20000, [A, B, C, D]),
    ];
    const matrix = buildNetMatrix(expenses);
    const entries = getNetForUser(matrix, A);
    const totals = getTotals(entries);

    expect(entries).toEqual([
      { userId: C, netPaise: 5000 },
      { userId: D, netPaise: 5000 },
      { userId: B, netPaise: 0 },
    ]);
    expect(totals).toEqual({
      youOwePaise: 0,
      youAreOwedPaise: 10000,
      netPaise: 10000,
    });
  });
});

describe("settlements", () => {
  it("reduces a debt on full settlement", () => {
    const expenses = [expense("e1", A, 10000, [A, B])];
    const matrix = buildNetMatrix(expenses, [settlement("s1", B, A, 5000)]);
    expect(getPairNet(matrix, A, B)).toBe(0);
  });

  it("supports partial settlements and keeps the remainder", () => {
    const expenses = [expense("e1", A, 10000, [A, B])];
    const matrix = buildNetMatrix(expenses, [settlement("s1", B, A, 3000)]);
    expect(getPairNet(matrix, A, B)).toBe(2000);
  });

  it("ignores pending and rejected settlements", () => {
    const expenses = [expense("e1", A, 10000, [A, B])];
    const pending = buildNetMatrix(expenses, [settlement("s1", B, A, 3000, "PENDING")]);
    const rejected = buildNetMatrix(expenses, [settlement("s1", B, A, 3000, "REJECTED")]);
    expect(getPairNet(pending, A, B)).toBe(5000);
    expect(getPairNet(rejected, A, B)).toBe(5000);
  });

  it("flips direction when someone overpays", () => {
    const expenses = [expense("e1", A, 10000, [A, B])];
    const matrix = buildNetMatrix(expenses, [settlement("s1", B, A, 7000)]);
    expect(getPairNet(matrix, A, B)).toBe(-2000);
  });
});

describe("edits and deletes", () => {
  it("recomputes balances after an expense is edited", () => {
    const original = expense("e1", A, 900, [A, B, C]);
    expect(getPairNet(buildNetMatrix([original]), A, B)).toBe(300);

    const edited: LedgerExpense = {
      ...original,
      shares: splitEqual(1200, [A, B, C]),
    };
    expect(getPairNet(buildNetMatrix([edited]), A, B)).toBe(400);
  });

  it("recomputes balances after an expense is deleted", () => {
    const original = expense("e1", A, 900, [A, B, C]);
    const deleted: LedgerExpense = { ...original, deletedAt: new Date().toISOString() };

    expect(getPairNet(recomputeNetMatrix([deleted]), A, B)).toBe(0);
    expect(getPairNet(recomputeNetMatrix([original]), A, B)).toBe(300);
  });
});

describe("simplifyDebts", () => {
  it("produces minimal settlement transfers without touching records", () => {
    const expenses = [
      expense("e1", A, 10000, [A, B, C]),
      expense("e2", B, 6000, [A, B, C]),
    ];
    const matrix = buildNetMatrix(expenses);
    const entries = getAggregateNet(matrix);
    const transfers = simplifyDebts(entries);

    expect(transfers).toHaveLength(2);
    expect(transfers.reduce((sum, transfer) => sum + transfer.amountPaise, 0)).toBe(
      entries.filter((entry) => entry.netPaise > 0).reduce((sum, entry) => sum + entry.netPaise, 0),
    );
  });

  it("nets a simple creditor/debtor pair", () => {
    const transfers = simplifyDebts([
      { userId: A, netPaise: 5000 },
      { userId: B, netPaise: -5000 },
      { userId: C, netPaise: 0 },
    ]);
    expect(transfers).toEqual([{ fromUserId: B, toUserId: A, amountPaise: 5000 }]);
  });
});
