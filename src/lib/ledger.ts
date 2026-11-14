/**
 * SplitTrack ledger engine (pure, money is always integer paise).
 *
 * Sign convention for the net matrix:
 *   matrix.get(creditor)?.get(debtor) === amount the debtor owes the creditor.
 * Negative entries are allowed after settlements and are netted before display.
 */

export type Paise = number;

export type SettlementStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface LedgerShare {
  userId: string;
  sharePaise: Paise;
}

export interface LedgerExpense {
  id: string;
  payerId: string;
  description?: string;
  category?: string | null;
  date?: string | Date;
  deletedAt?: string | Date | null;
  shares: LedgerShare[];
}

export interface LedgerSettlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountPaise: Paise;
  status: SettlementStatus;
  note?: string | null;
  createdAt?: string | Date;
}

export type NetMatrix = Map<string, Map<string, Paise>>;

export interface NetEntry {
  userId: string;
  netPaise: Paise;
}

export interface Transfer {
  fromUserId: string;
  toUserId: string;
  amountPaise: Paise;
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

function assertPaise(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LedgerError(`${label} must be zero or more.`);
  }
}

function addEntry(matrix: NetMatrix, creditor: string, debtor: string, amountPaise: Paise): void {
  if (amountPaise === 0) return;
  let row = matrix.get(creditor);
  if (!row) {
    row = new Map<string, Paise>();
    matrix.set(creditor, row);
  }
  row.set(debtor, (row.get(debtor) ?? 0) + amountPaise);
}

/** Add one expense's debts: every non-payer participant owes their share to the payer. */
export function applyExpense(matrix: NetMatrix, expense: LedgerExpense): void {
  if (expense.deletedAt) return;
  for (const share of expense.shares) {
    if (share.userId === expense.payerId) continue;
    if (!Number.isSafeInteger(share.sharePaise) || share.sharePaise < 0) {
      throw new LedgerError("Shares must be zero or more.");
    }
    addEntry(matrix, expense.payerId, share.userId, share.sharePaise);
  }
}

/**
 * Apply a confirmed settlement. `from` paying `to` reduces what `from` owes `to`,
 * so the entry in matrix[to][from] decreases.
 */
export function applySettlement(matrix: NetMatrix, settlement: LedgerSettlement): void {
  if (settlement.status !== "CONFIRMED") return;
  assertPaise(settlement.amountPaise, "Settlement amount");
  addEntry(matrix, settlement.toUserId, settlement.fromUserId, -settlement.amountPaise);
}

/** Build the pairwise net matrix from non-deleted expenses + confirmed settlements. */
export function buildNetMatrix(
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[] = [],
): NetMatrix {
  const matrix: NetMatrix = new Map();
  for (const expense of expenses) applyExpense(matrix, expense);
  for (const settlement of settlements) applySettlement(matrix, settlement);
  return matrix;
}

/** Positive result means `b` owes `a`. */
export function getPairNet(matrix: NetMatrix, a: string, b: string): Paise {
  const aOwed = matrix.get(a)?.get(b) ?? 0;
  const bOwed = matrix.get(b)?.get(a) ?? 0;
  return aOwed - bOwed;
}

/** Net position for one user against every counterparty in the matrix. */
export function getNetForUser(matrix: NetMatrix, userId: string): NetEntry[] {
  const counterparties = new Set<string>();
  for (const [creditor, row] of matrix) {
    if (creditor === userId) {
      for (const debtor of row.keys()) counterparties.add(debtor);
    } else if (row.has(userId)) {
      counterparties.add(creditor);
    }
  }
  counterparties.delete(userId);

  return [...counterparties]
    .map((otherId) => ({ userId: otherId, netPaise: getPairNet(matrix, userId, otherId) }))
    .sort((a, b) => Math.abs(b.netPaise) - Math.abs(a.netPaise) || a.userId.localeCompare(b.userId));
}

export interface LedgerTotals {
  youOwePaise: Paise;
  youAreOwedPaise: Paise;
  netPaise: Paise;
}

/** Aggregate net position per participant (sums to zero across the set). */
export function getAggregateNet(matrix: NetMatrix, userIds?: string[]): NetEntry[] {
  const ids = new Set<string>(userIds ?? []);
  if (!userIds) {
    for (const [creditor, row] of matrix) {
      ids.add(creditor);
      for (const debtor of row.keys()) ids.add(debtor);
    }
  }
  const list = [...ids];
  return list.map((userId) => {
    let netPaise = 0;
    for (const otherId of list) {
      if (otherId === userId) continue;
      netPaise += getPairNet(matrix, userId, otherId);
    }
    return { userId, netPaise };
  });
}

export function getTotals(entries: NetEntry[]): LedgerTotals {
  let youOwePaise = 0;
  let youAreOwedPaise = 0;
  for (const entry of entries) {
    if (entry.netPaise > 0) youAreOwedPaise += entry.netPaise;
    else if (entry.netPaise < 0) youOwePaise += -entry.netPaise;
  }
  return { youOwePaise, youAreOwedPaise, netPaise: youAreOwedPaise - youOwePaise };
}

/**
 * Deterministic equal split. Remainder paise go to the lexicographically first
 * user ids, so every client and the server always compute the same shares.
 */
export function splitEqual(totalPaise: Paise, userIds: string[]): LedgerShare[] {
  assertPaise(totalPaise, "Total");
  const ids = [...new Set(userIds)].sort((a, b) => a.localeCompare(b));
  if (ids.length === 0) throw new LedgerError("Add at least one person.");

  const base = Math.floor(totalPaise / ids.length);
  const remainder = totalPaise - base * ids.length;

  return ids.map((userId, index) => ({
    userId,
    sharePaise: base + (index < remainder ? 1 : 0),
  }));
}

export interface PercentShareInput {
  userId: string;
  /** Basis points: 2500 = 25.00% */
  percentBps: number;
}

/** Split by percentages expressed in basis points. Sum must be exactly 10000. */
export function splitByPercent(totalPaise: Paise, entries: PercentShareInput[]): LedgerShare[] {
  assertPaise(totalPaise, "Total");
  if (entries.length === 0) throw new LedgerError("Add at least one person.");

  const seen = new Set<string>();
  let bpsTotal = 0;
  for (const entry of entries) {
    if (seen.has(entry.userId)) throw new LedgerError("The same person is added twice.");
    seen.add(entry.userId);
    if (!Number.isInteger(entry.percentBps) || entry.percentBps < 0) {
      throw new LedgerError("Percent must be zero or more.");
    }
    bpsTotal += entry.percentBps;
  }
  if (bpsTotal !== 10000) {
    throw new LedgerError("Percentages must add up to exactly 100%.");
  }

  const raw = entries.map((entry) => {
    const product = totalPaise * entry.percentBps;
    return {
      userId: entry.userId,
      sharePaise: Math.floor(product / 10000),
      fraction: product % 10000,
    };
  });

  let assigned = 0;
  for (const item of raw) assigned += item.sharePaise;
  let remainder = totalPaise - assigned;
  if (remainder < 0) throw new LedgerError("Split calculation underflow.");

  const order = raw
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => b.fraction - a.fraction || a.userId.localeCompare(b.userId));

  const shares = new Map<string, Paise>(raw.map((item) => [item.userId, item.sharePaise]));
  for (const item of order) {
    if (remainder === 0) break;
    shares.set(item.userId, (shares.get(item.userId) ?? 0) + 1);
    remainder -= 1;
  }

  return raw.map((item) => ({ userId: item.userId, sharePaise: shares.get(item.userId) ?? 0 }));
}

export interface ExactShareInput {
  userId: string;
  sharePaise: Paise;
}

/** Validate an exact split (amounts entered by the user). */
export function splitByExact(totalPaise: Paise, entries: ExactShareInput[]): LedgerShare[] {
  assertPaise(totalPaise, "Total");
  if (entries.length === 0) throw new LedgerError("Add at least one person.");

  const seen = new Set<string>();
  let sum = 0;
  for (const entry of entries) {
    assertPaise(entry.sharePaise, "Share");
    if (seen.has(entry.userId)) throw new LedgerError("The same person is added twice.");
    seen.add(entry.userId);
    sum += entry.sharePaise;
  }
  if (sum !== totalPaise) {
    const diff = Math.abs(totalPaise - sum);
    throw new LedgerError(
      `Shares must add up to the total. ${diff} paise ${sum > totalPaise ? "over" : "unassigned"}.`,
    );
  }
  return entries.map((entry) => ({ userId: entry.userId, sharePaise: entry.sharePaise }));
}

/** Build a split from a client payload: equal | exact | percent. */
export function computeShares(input: {
  totalPaise: Paise;
  participantIds: string[];
  mode: "equal" | "exact" | "percent";
  customShares?: Array<{ userId: string; value: number }>;
}): LedgerShare[] {
  if (input.mode === "equal") return splitEqual(input.totalPaise, input.participantIds);

  const custom = input.customShares ?? [];
  const participantSet = new Set(input.participantIds);
  if (custom.length !== participantSet.size || custom.some((entry) => !participantSet.has(entry.userId))) {
    throw new LedgerError("Include every person exactly once.");
  }

  if (input.mode === "percent") {
    return splitByPercent(
      input.totalPaise,
      custom.map((entry) => ({ userId: entry.userId, percentBps: entry.value })),
    );
  }
  return splitByExact(
    input.totalPaise,
    custom.map((entry) => ({ userId: entry.userId, sharePaise: entry.value })),
  );
}

/**
 * Optional "simplify debts" suggestion. Greedy creditor/debtor matching gives a
 * near-minimal set of transfers. This never mutates ledger records.
 */
export function simplifyDebts(entries: NetEntry[]): Transfer[] {
  const creditors = entries
    .filter((entry) => entry.netPaise > 0)
    .map((entry) => ({ userId: entry.userId, amount: entry.netPaise }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));

  const debtors = entries
    .filter((entry) => entry.netPaise < 0)
    .map((entry) => ({ userId: entry.userId, amount: -entry.netPaise }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));

  const transfers: Transfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    if (!creditor || !debtor) break;

    const amount = Math.min(creditor.amount, debtor.amount);
    if (amount > 0) {
      transfers.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amountPaise: amount });
      creditor.amount -= amount;
      debtor.amount -= amount;
    }
    if (creditor.amount === 0) creditorIndex += 1;
    if (debtor.amount === 0) debtorIndex += 1;
  }

  return transfers;
}

/** Convenience helper used by tests and services. */
export function recomputeNetMatrix(
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[] = [],
): NetMatrix {
  return buildNetMatrix(
    expenses.filter((expense) => !expense.deletedAt),
    settlements.filter((settlement) => settlement.status === "CONFIRMED"),
  );
}
