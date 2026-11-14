"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Info,
  Loader2,
  Scale,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { CountUp } from "@/components/count-up";
import { EmptyState } from "@/components/empty-state";
import { PendingSettlements } from "@/components/pending-settlements";
import { SettleDialog } from "@/components/settle-dialog";
import { apiFetch } from "@/lib/client";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AppSettlement } from "@/types/app";
import type { BalanceOverview, BalanceUser, FriendBalance } from "@/lib/balances";

interface Suggestion {
  from: BalanceUser;
  to: BalanceUser;
  amountPaise: number;
}

function buildSimplifiedTransfers(pairs: FriendBalance[]): Suggestion[] {
  const debtors = pairs
    .filter((pair) => pair.netPaise > 0)
    .map((pair) => ({ user: pair.user, remaining: pair.netPaise }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = pairs
    .filter((pair) => pair.netPaise < 0)
    .map((pair) => ({ user: pair.user, remaining: -pair.netPaise }))
    .sort((a, b) => b.remaining - a.remaining);

  const suggestions: Suggestion[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    if (!debtor || !creditor) break;
    const amountPaise = Math.min(debtor.remaining, creditor.remaining);
    if (amountPaise > 0) {
      suggestions.push({ from: debtor.user, to: creditor.user, amountPaise });
      debtor.remaining -= amountPaise;
      creditor.remaining -= amountPaise;
    }
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return suggestions;
}

export function DuesQueue({
  overview,
  pending,
  currentUserId,
  compact = false,
}: {
  overview: BalanceOverview;
  pending: AppSettlement[];
  currentUserId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settlePair, setSettlePair] = useState<FriendBalance | null>(null);
  const [simplifyOpen, setSimplifyOpen] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  const pairs = compact ? overview.pairs.slice(0, 4) : overview.pairs;
  const suggestions = useMemo(() => buildSimplifiedTransfers(overview.pairs), [overview.pairs]);
  const { youOwePaise, youAreOwedPaise } = overview.totals;

  async function remind(pair: FriendBalance) {
    setRemindingId(pair.user.id);
    try {
      const result = await apiFetch<{ sent: boolean; amountFormatted: string }>(
        "/api/friends/remind",
        {
          method: "POST",
          body: JSON.stringify({ toUserId: pair.user.id }),
        },
      );
      setRemindedIds((previous) => new Set(previous).add(pair.user.id));
      toast.success(`Reminder sent to ${pair.user.name}`, {
        description: `${result.amountFormatted} · one reminder per person per day.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reminder.");
    } finally {
      setRemindingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {!compact ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={ArrowUpRight}
            label="You have to pay"
            paise={youOwePaise}
            accent="text-amber-600 dark:text-amber-300"
            surface="from-amber-500/12 to-orange-500/5"
          />
          <SummaryCard
            icon={ArrowDownLeft}
            label="You will get"
            paise={youAreOwedPaise}
            accent="text-emerald-600 dark:text-emerald-300"
            surface="from-emerald-500/12 to-teal-500/5"
          />
          <SummaryCard
            icon={Scale}
            label="Your balance"
            paise={youAreOwedPaise - youOwePaise}
            accent={
              youAreOwedPaise - youOwePaise >= 0
                ? "text-primary"
                : "text-rose-600 dark:text-rose-300"
            }
            surface="from-indigo-500/12 to-fuchsia-500/5"
            signed
          />
        </div>
      ) : null}

      <PendingSettlements settlements={pending} currentUserId={currentUserId} compact={compact} />

      {overview.pairs.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">Who pays whom</h2>
              <p className="text-xs text-muted-foreground">
                We adjust amounts between friends automatically. Each line is the final amount.
              </p>
            </div>
            {suggestions.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setSimplifyOpen(true)}>
                <Sparkles className="size-3.5" />
                Fewer payments
              </Button>
            ) : null}
          </div>

          <div className="space-y-2.5">
            {pairs.map((pair) => {
              const youOwe = pair.netPaise < 0;
              const outstanding = Math.abs(pair.netPaise);
              const pendingFromMe = pending.find(
                (settlement) =>
                  settlement.from.id === currentUserId &&
                  settlement.to.id === pair.user.id &&
                  (youOwe ? settlement.amountPaise <= outstanding : true),
              );
              const pendingToMe = pending.find(
                (settlement) =>
                  settlement.to.id === currentUserId && settlement.from.id === pair.user.id,
              );
              const isExpanded = expandedId === pair.user.id;
              const hasItems = pair.items.length > 0;

              return (
                <motion.div
                  key={pair.user.id}
                  layout
                  className={cn(
                    "overflow-hidden rounded-3xl border bg-card/80 shadow-card transition-colors",
                    youOwe ? "border-amber-500/20" : "border-emerald-500/20",
                  )}
                >
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <UserAvatar
                      name={pair.user.name}
                      avatarUrl={pair.user.avatarUrl}
                      className="size-11 shrink-0"
                      fallbackClassName="text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">{pair.user.name}</span>
                        <span className="text-xs text-muted-foreground">@{pair.user.userId}</span>
                        {pendingFromMe ? (
                          <Badge variant="warning">
                            <Clock3 className="size-3" />
                            Waiting for a reply
                          </Badge>
                        ) : null}
                        {pendingToMe ? (
                          <Badge variant="warning">
                            <Clock3 className="size-3" />
                            Needs your OK
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {youOwe ? "You pay" : "They pay you"} · updated {formatDate(pair.lastActivityAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "font-display text-lg font-extrabold sm:text-xl",
                          youOwe
                            ? "text-amber-600 dark:text-amber-300"
                            : "text-emerald-600 dark:text-emerald-300",
                        )}
                      >
                        {formatINR(outstanding)}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {youOwe ? "to pay" : "to get"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-2.5 sm:px-5">
                    {youOwe ? (
                      pendingFromMe ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                          <Clock3 className="size-3.5" />
                          You marked {formatINR(pendingFromMe.amountPaise)} as paid. Waiting for{" "}
                          {pair.user.name} to accept or reject.
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => setSettlePair(pair)}>
                          <Wallet className="size-3.5" />
                          Mark paid
                        </Button>
                      )
                    ) : remindedIds.has(pair.user.id) ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                        <Check className="size-3.5" />
                        Reminder sent today
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => remind(pair)}
                        disabled={remindingId === pair.user.id}
                      >
                        {remindingId === pair.user.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <BellRing className="size-3.5" />
                        )}
                        Send reminder
                      </Button>
                    )}

                    {hasItems ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-muted-foreground"
                        onClick={() => setExpandedId(isExpanded ? null : pair.user.id)}
                        aria-expanded={isExpanded}
                      >
                        <CircleDollarSign className="size-3.5" />
                        {pair.items.length} entries
                        <ChevronDown
                          className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")}
                        />
                      </Button>
                    ) : null}
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/60"
                      >
                        <div className="space-y-1.5 p-4 sm:p-5">
                          {pair.items.map((item) => {
                            const positive = item.signedDeltaPaise >= 0;
                            return (
                              <div
                                key={`${item.kind}-${item.id}-${item.direction}`}
                                className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/40"
                              >
                                <span
                                  className={cn(
                                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                                    positive
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                      : "bg-rose-500/10 text-rose-600 dark:text-rose-300",
                                  )}
                                >
                                  {positive ? (
                                    <ArrowDownLeft className="size-3.5" />
                                  ) : (
                                    <ArrowUpRight className="size-3.5" />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-xs font-medium sm:text-sm">
                                    {item.description}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {formatDate(item.date)} · {item.kind === "settlement" ? "Payment" : item.category ?? "Bill"}
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 text-xs font-bold sm:text-sm",
                                    positive
                                      ? "text-emerald-600 dark:text-emerald-300"
                                      : "text-rose-600 dark:text-rose-300",
                                  )}
                                >
                                  {positive ? "+" : "−"}
                                  {formatINR(Math.abs(item.signedDeltaPaise))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Scale}
          title="All clear"
          description="No waiting payments with any friend. Add a bill when you share the next one."
        />
      )}

      {settlePair ? (
        <SettleDialog
          open={Boolean(settlePair)}
          onOpenChange={(open) => {
            if (!open) setSettlePair(null);
          }}
          creditor={settlePair.user}
          outstandingPaise={Math.abs(settlePair.netPaise)}
        />
      ) : null}

      <Dialog open={simplifyOpen} onOpenChange={setSimplifyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Fewer payments
            </DialogTitle>
            <DialogDescription>
              You can clear the same balances with fewer payments. This is only a suggestion.
              Nothing changes until you mark a payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div
                key={`${suggestion.from.id}-${suggestion.to.id}`}
                className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3"
              >
                <UserAvatar
                  name={suggestion.from.name}
                  avatarUrl={suggestion.from.avatarUrl}
                  className="size-8"
                  fallbackClassName="text-[10px]"
                />
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{suggestion.from.name}</span>
                  <span className="text-muted-foreground"> pays </span>
                  <span className="font-semibold">{suggestion.to.name}</span>
                </div>
                <span className="shrink-0 text-sm font-bold">
                  {formatINR(suggestion.amountPaise)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-primary/5 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              These suggestions use your current balances. SplitTrack never changes anything on
              its own.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSimplifyOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  paise,
  accent,
  surface,
  signed = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  paise: number;
  accent: string;
  surface: string;
  signed?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br p-5 shadow-card",
        surface,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("flex size-8 items-center justify-center rounded-xl bg-background/70", accent)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className={cn("mt-3 font-display text-2xl font-extrabold tracking-tight", accent)}>
        {signed && paise > 0 ? "+" : ""}
        <CountUp value={paise} />
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {paise >= 0 ? "You will get this much" : "You have to pay this much"}
      </div>
    </div>
  );
}
