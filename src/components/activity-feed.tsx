"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Filter,
  History,
  ReceiptText,
  RotateCcw,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { EmptyState } from "@/components/empty-state";
import { ExpenseActions } from "@/components/expense-actions";
import { CATEGORY_STYLES, EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { cn, toCsv } from "@/lib/utils";
import type { AppGroup, AppUser, EditableExpense } from "@/types/app";
import type { ActivityFeed as ActivityFeedData, ExpenseFeedItem } from "@/lib/services/activity";
import type { PublicUser } from "@/lib/validators";

type FeedTab = "all" | "expenses" | "settlements";

const ALL = "all";

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Added",
  UPDATED: "Edited",
  DELETED: "Deleted",
  CONFIRMED: "Confirmed",
  REJECTED: "Declined",
};

interface AuditChange {
  label: string;
  before: string | null;
  after: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeShares(value: unknown, nameFor: (id: string) => string): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parts = value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const userId = entry.userId;
      const sharePaise = entry.sharePaise;
      if (typeof userId !== "string" || typeof sharePaise !== "number") return null;
      return `${nameFor(userId)} ${formatINR(sharePaise)}`;
    })
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
}

function describeAuditChanges(
  diff: unknown,
  nameFor: (id: string) => string,
  currentUserId: string,
): AuditChange[] {
  if (!isRecord(diff)) return [];
  const before = isRecord(diff.before) ? diff.before : {};
  const after = isRecord(diff.after) ? diff.after : {};
  const changes: AuditChange[] = [];

  const add = (
    label: string,
    beforeValue: unknown,
    afterValue: unknown,
    format: (value: unknown) => string | null,
  ) => {
    const formattedBefore = beforeValue === undefined ? null : format(beforeValue);
    const formattedAfter = afterValue === undefined ? null : format(afterValue);
    if (formattedBefore !== formattedAfter) {
      changes.push({ label, before: formattedBefore, after: formattedAfter });
    }
  };

  const asText = (value: unknown) => (typeof value === "string" ? value : null);
  const asPerson = (value: unknown) => {
    if (typeof value !== "string") return null;
    return value === currentUserId ? "You" : nameFor(value);
  };

  add("Name", before.description, after.description, asText);
  add("Amount", before.totalPaise, after.totalPaise, (value) => {
    return typeof value === "number" ? formatINR(value) : null;
  });
  add("Paid by", before.payerId, after.payerId, asPerson);
  add("Date", before.date, after.date, (value) => {
    if (typeof value !== "string") return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : formatDate(date);
  });
  add("Category", before.category, after.category, (value) => {
    return typeof value === "string" && value ? value : "No category";
  });
  add("Shared by", before.shares, after.shares, (value) => describeShares(value, nameFor));

  return changes;
}

export function ActivityFeed({
  feed,
  currentUser,
  friends,
  groups,
}: {
  feed: ActivityFeedData;
  currentUser: AppUser;
  friends: PublicUser[];
  groups: AppGroup[];
}) {
  const [tab, setTab] = useState<FeedTab>("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState(ALL);
  const [personId, setPersonId] = useState(ALL);

  const people = useMemo(() => {
    const map = new Map<string, PublicUser>();
    for (const expense of feed.expenses) {
      map.set(expense.payer.id, expense.payer);
      for (const share of expense.shares) map.set(share.user.id, share.user);
    }
    for (const settlement of feed.settlements) {
      map.set(settlement.from.id, settlement.from);
      map.set(settlement.to.id, settlement.to);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [feed]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    return feed.expenses.filter((expense) => {
      const day = expense.date.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (category !== ALL && expense.category !== category) return false;
      if (
        personId !== ALL &&
        expense.payer.id !== personId &&
        !expense.shares.some((share) => share.user.id === personId)
      ) {
        return false;
      }
      if (normalizedQuery) {
        const haystack = [
          expense.description,
          expense.category ?? "",
          expense.groupName ?? "",
          expense.payer.name,
          ...expense.shares.map((share) => share.user.name),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [feed.expenses, from, to, category, personId, normalizedQuery]);

  const filteredSettlements = useMemo(() => {
    return feed.settlements.filter((settlement) => {
      const day = settlement.createdAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (
        personId !== ALL &&
        settlement.from.id !== personId &&
        settlement.to.id !== personId
      ) {
        return false;
      }
      if (normalizedQuery) {
        const haystack = [
          settlement.note ?? "payment",
          settlement.from.name,
          settlement.to.name,
          settlement.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [feed.settlements, from, to, personId, normalizedQuery]);

  const hasFilters =
    Boolean(query.trim()) ||
    Boolean(from) ||
    Boolean(to) ||
    category !== ALL ||
    personId !== ALL;

  function resetFilters() {
    setQuery("");
    setFrom("");
    setTo("");
    setCategory(ALL);
    setPersonId(ALL);
  }

  function downloadCsv() {
    const rows: Array<Array<string | number | null | undefined>> = [
      ["Type", "Date", "Description", "Category", "Group", "From", "To", "Amount (INR)", "Status"],
    ];

    for (const expense of filteredExpenses) {
      rows.push([
        "Bill",
        expense.date.slice(0, 10),
        expense.description,
        expense.category ?? "",
        expense.groupName ?? "",
        expense.payer.name,
        expense.shares.map((share) => `${share.user.name} (${formatINR(share.sharePaise)})`).join(" | "),
        formatINR(expense.totalPaise),
        expense.deletedAt ? "Deleted" : "Active",
      ]);
    }

    for (const settlement of filteredSettlements) {
      rows.push([
        "Payment",
        settlement.createdAt.slice(0, 10),
        settlement.note ?? "Payment",
        "",
        "",
        settlement.from.name,
        settlement.to.name,
        formatINR(settlement.amountPaise),
        settlement.status === "PENDING"
          ? "Waiting"
          : settlement.status === "CONFIRMED"
            ? "Confirmed"
            : "Declined",
      ]);
    }

    const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `splittrack-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const showExpenses = tab === "all" || tab === "expenses";
  const showSettlements = tab === "all" || tab === "settlements";
  const totalVisible = filteredExpenses.length + filteredSettlements.length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-muted/70 p-1">
            {(
              [
                { value: "all", label: "Everything" },
                { value: "expenses", label: "Bills" },
                { value: "settlements", label: "Payments" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                aria-pressed={tab === item.value}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  tab === item.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[12rem] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bill, person, group…"
              className="pl-9"
              aria-label="Search history"
            />
          </div>

          <Button variant="outline" onClick={downloadCsv} disabled={totalVisible === 0}>
            <Download className="size-4" />
            CSV
          </Button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground" htmlFor="feed-from">
              From
            </label>
            <Input
              id="feed-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground" htmlFor="feed-to">
              To
            </label>
            <Input
              id="feed-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Category</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs" aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Person</span>
            <Select value={personId} onValueChange={setPersonId}>
              <SelectTrigger className="h-9 text-xs" aria-label="Filter by person">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Everyone</SelectItem>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.id === currentUser.id ? "You" : person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="size-3.5" />
            {totalVisible} {totalVisible === 1 ? "entry" : "entries"}
            {hasFilters ? " match your filters" : " in your history"}
          </p>
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="size-3.5" />
              Reset filters
            </Button>
          ) : null}
        </div>
      </div>

      {totalVisible === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={hasFilters ? "No matching entries" : "Nothing here yet"}
          description={
            hasFilters
              ? "Try a wider date range or clear a filter."
              : "Add a bill or mark a payment and it will appear here for everyone in it."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="size-4" />
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {showExpenses && filteredExpenses.length > 0 ? (
            <section aria-labelledby="expenses-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 id="expenses-heading" className="font-display text-base font-bold">
                  Bills
                </h2>
                <span className="text-xs text-muted-foreground">{filteredExpenses.length}</span>
              </div>
              <div className="space-y-2.5">
                {filteredExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    currentUser={currentUser}
                    friends={friends}
                    groups={groups}
                    peopleById={peopleById}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {showSettlements && filteredSettlements.length > 0 ? (
            <section aria-labelledby="settlements-heading" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 id="settlements-heading" className="font-display text-base font-bold">
                  Payments
                </h2>
                <span className="text-xs text-muted-foreground">{filteredSettlements.length}</span>
              </div>
              <div className="space-y-2.5">
                {filteredSettlements.map((settlement) => (
                  <Card key={settlement.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                          settlement.status === "CONFIRMED"
                            ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
                            : settlement.status === "REJECTED"
                              ? "bg-rose-500/12 text-rose-600 dark:text-rose-300"
                              : "bg-amber-500/12 text-amber-600 dark:text-amber-300",
                        )}
                      >
                        {settlement.status === "CONFIRMED" ? (
                          <CheckCircle2 className="size-5" />
                        ) : settlement.status === "REJECTED" ? (
                          <XCircle className="size-5" />
                        ) : (
                          <History className="size-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="font-semibold">{settlement.from.name}</span>
                          <ArrowRight className="size-3.5 text-muted-foreground" />
                          <span className="font-semibold">{settlement.to.name}</span>
                          <span className="font-bold">{formatINR(settlement.amountPaise)}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(settlement.createdAt)}
                          {settlement.note ? ` · ${settlement.note}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          settlement.status === "CONFIRMED"
                            ? "success"
                            : settlement.status === "REJECTED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {settlement.status === "PENDING"
                          ? "Waiting for confirmation"
                          : settlement.status === "CONFIRMED"
                            ? "Confirmed"
                            : "Declined"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function AuditDetails({
  diff,
  action,
  nameFor,
  currentUserId,
}: {
  diff: unknown;
  action: string;
  nameFor: (id: string) => string;
  currentUserId: string;
}) {
  const changes = describeAuditChanges(diff, nameFor, currentUserId);

  if (changes.length === 0) {
    return (
      <p className="mt-1.5 rounded-lg bg-background/60 p-2 text-[11px] text-muted-foreground">
        {action === "CREATED"
          ? "This bill was added."
          : action === "DELETED"
            ? "This bill was deleted."
            : "The bill details were updated."}
      </p>
    );
  }

  return (
    <div className="mt-1.5 space-y-1 rounded-lg bg-background/60 p-2 text-[11px] text-muted-foreground">
      {changes.map((change) => (
        <div key={change.label} className="flex flex-wrap gap-x-1.5">
          <span className="font-semibold text-foreground/80">{change.label}:</span>
          {change.before && change.after ? (
            <span>
              <span className="line-through">{change.before}</span>
              <span aria-hidden> → </span>
              <span className="font-medium text-foreground">{change.after}</span>
            </span>
          ) : (
            <span className="font-medium text-foreground">
              {change.after ?? change.before ?? "Not set"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function ExpenseCard({
  expense,
  currentUser,
  friends,
  groups,
  peopleById,
}: {
  expense: ExpenseFeedItem;
  currentUser: AppUser;
  friends: PublicUser[];
  groups: AppGroup[];
  peopleById: Map<string, PublicUser>;
}) {
  const yourShare = expense.shares.find((share) => share.user.id === currentUser.id)?.sharePaise ?? 0;
  const nameFor = (id: string) =>
    id === currentUser.id ? "You" : (peopleById.get(id)?.name ?? "Someone");
  const canManage =
    !expense.deletedAt &&
    (expense.payer.id === currentUser.id ||
      expense.createdBy.id === currentUser.id ||
      expense.shares.some((share) => share.user.id === currentUser.id));

  const editable: EditableExpense = {
    id: expense.id,
    description: expense.description,
    totalPaise: expense.totalPaise,
    date: expense.date.slice(0, 10),
    category: expense.category,
    payerId: expense.payer.id,
    participantIds: expense.shares.map((share) => share.user.id),
    shares: expense.shares.map((share) => ({
      userId: share.user.id,
      sharePaise: share.sharePaise,
    })),
    groupId: expense.groupId,
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors hover:border-primary/25",
        expense.deletedAt && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/12 to-fuchsia-500/12 text-primary">
          <ReceiptText className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "truncate font-semibold",
                expense.deletedAt && "line-through decoration-muted-foreground/60",
              )}
            >
              {expense.description}
            </h3>
            {expense.category ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.Other,
                )}
              >
                {expense.category}
              </span>
            ) : null}
            {expense.deletedAt ? (
              <Badge variant="destructive">
                <Trash2 className="size-3" />
                Deleted
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {expense.payer.id === currentUser.id ? "You" : expense.payer.name}
            </span>{" "}
            paid · {formatDate(expense.date)}
            {expense.groupName ? ` · ${expense.groupName}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg font-extrabold">{formatINR(expense.totalPaise)}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {yourShare > 0 ? `Your share ${formatINR(yourShare)}` : "Not included"}
          </div>
        </div>
        {canManage ? (
          <ExpenseActions
            expense={editable}
            currentUser={currentUser}
            friends={friends}
            groups={groups}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border/60 bg-muted/20 px-4 py-2.5 sm:px-5">
        <Users className="mt-0.5 size-3.5 text-muted-foreground" />
        {expense.shares.map((share) => (
          <span
            key={share.user.id}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 py-0.5 pl-0.5 pr-2 text-[11px]"
          >
            <UserAvatar
              name={share.user.name}
              avatarUrl={share.user.avatarUrl}
              className="size-4 ring-0"
              fallbackClassName="text-[7px]"
            />
            <span className="max-w-[7rem] truncate">
              {share.user.id === currentUser.id ? "You" : share.user.name}
            </span>
            <span className="font-semibold">{formatINR(share.sharePaise)}</span>
          </span>
        ))}
      </div>

      {expense.auditLogs.length > 0 ? (
        <details className="group border-t border-border/60">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground sm:px-5">
            <History className="size-3.5" />
            Change history ({expense.auditLogs.length})
            <ArrowRight className="ml-auto size-3.5 transition-transform group-open:rotate-90" />
          </summary>
          <div className="space-y-2 border-t border-border/40 px-4 py-3 sm:px-5">
            {expense.auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl bg-muted/40 p-2.5 text-[11px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {ACTION_LABELS[log.action] ?? log.action.toLowerCase()} by{" "}
                    {log.actor.id === currentUser.id ? "you" : log.actor.name}
                  </span>
                  <span className="text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                </div>
                <AuditDetails
                  diff={log.diff}
                  action={log.action}
                  nameFor={nameFor}
                  currentUserId={currentUser.id}
                />
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </Card>
  );
}
