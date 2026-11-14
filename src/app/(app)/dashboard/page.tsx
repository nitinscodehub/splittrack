import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ReceiptText,
  Scale,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BalanceChart } from "@/components/balance-chart";
import { CountUp } from "@/components/count-up";
import { DuesQueue } from "@/components/dues-queue";
import { UserAvatar } from "@/components/user-avatar";
import { getBalanceOverview } from "@/lib/balances";
import { CATEGORY_STYLES } from "@/lib/constants";
import { formatDate, getIstHour } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { getCurrentUser } from "@/lib/session";
import {
  getDashboardChart,
  getRecentActivity,
  type ExpenseFeedItem,
  type SettlementFeedItem,
} from "@/lib/services/activity";
import { getPendingSettlements } from "@/lib/services/settlements";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = getIstHour();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [overview, chart, recent, pending] = await Promise.all([
    getBalanceOverview(user.id),
    getDashboardChart(user.id),
    getRecentActivity(user.id, 8),
    getPendingSettlements(user.id),
  ]);

  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  const netPaise = overview.totals.youAreOwedPaise - overview.totals.youOwePaise;
  const activePairs = overview.pairs.length;

  const timeline: Array<
    | { kind: "expense"; at: string; data: ExpenseFeedItem }
    | { kind: "settlement"; at: string; data: SettlementFeedItem }
  > = [
    ...recent.expenses.map((expense) => ({
      kind: "expense" as const,
      at: expense.createdAt,
      data: expense,
    })),
    ...recent.settlements.map((settlement) => ({
      kind: "settlement" as const,
      at: settlement.createdAt,
      data: settlement,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {formatDate(new Date())}
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {greeting()}, {firstName}
            <span className="ml-1.5 inline-block origin-bottom-right animate-float">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A simple view of who pays whom.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/activity">
              <ReceiptText className="size-4" />
              History
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dues">
              <Wallet className="size-4" />
              Payments
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ArrowUpRight}
          label="You have to pay"
          value={overview.totals.youOwePaise}
          hint={overview.totals.youOwePaise > 0 ? "across your friends" : "nothing to pay"}
          className="from-amber-500/12 to-orange-500/5"
          valueClassName="text-amber-600 dark:text-amber-300"
        />
        <StatCard
          icon={ArrowDownLeft}
          label="You will get"
          value={overview.totals.youAreOwedPaise}
          hint={overview.totals.youAreOwedPaise > 0 ? "waiting for payment" : "all clear"}
          className="from-emerald-500/12 to-teal-500/5"
          valueClassName="text-emerald-600 dark:text-emerald-300"
        />
        <StatCard
          icon={Scale}
          label="Your balance"
          value={netPaise}
          hint={netPaise >= 0 ? "you will get this much" : "you have to pay this much"}
          className="from-indigo-500/12 to-fuchsia-500/5"
          valueClassName={netPaise >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-300"}
          signed
        />
        <StatCard
          icon={Users}
          label="Friends with balance"
          value={activePairs}
          hint="friends with an open amount"
          className="from-sky-500/12 to-cyan-500/5"
          valueClassName="text-sky-600 dark:text-sky-300"
          countAsMoney={false}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Your last eight weeks</h2>
              <p className="text-xs text-muted-foreground">
                What you paid compared with your share of shared bills.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#6366f1]" />
                You paid
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#d946ef]" />
                Your share
              </span>
            </div>
          </div>
          <div className="mt-4">
            <BalanceChart data={chart} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            If you paid more than your share, friends have to pay you back. It is not a donation.
          </div>
        </Card>

        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-card to-card/60 p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Payments</h2>
              <p className="text-xs text-muted-foreground">One clear amount with each friend.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dues">
                See all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          <div className="mt-4">
            {overview.pairs.length > 0 || pending.length > 0 ? (
              <DuesQueue overview={overview} pending={pending} currentUserId={user.id} compact />
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 px-4 py-10 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <Scale className="size-5" />
                </div>
                <h3 className="mt-3 font-display font-bold">You are all clear</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a bill when you share the next one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold">Recent history</h2>
            <p className="text-xs text-muted-foreground">Newest first.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/activity">
              See all
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {timeline.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nothing yet. Your first bill will appear here for everyone in it.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {timeline.map((item) =>
              item.kind === "expense" ? (
                <div key={`expense-${item.data.id}`} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ReceiptText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{item.data.description}</span>
                      {item.data.category ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            CATEGORY_STYLES[item.data.category] ?? CATEGORY_STYLES.Other,
                          )}
                        >
                          {item.data.category}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.data.payer.id === user.id ? "You" : item.data.payer.name} paid ·{" "}
                      {formatDate(item.data.date)}
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold">{formatINR(item.data.totalPaise)}</div>
                </div>
              ) : (
                <div
                  key={`settlement-${item.data.id}`}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Wallet className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">
                        {item.data.from.id === user.id ? "You" : item.data.from.name} paid{" "}
                        {item.data.to.id === user.id ? "you" : item.data.to.name}
                      </span>
                      <Badge
                        variant={
                          item.data.status === "CONFIRMED"
                            ? "success"
                            : item.data.status === "REJECTED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {item.data.status === "PENDING"
                          ? "Waiting"
                          : item.data.status === "CONFIRMED"
                            ? "Confirmed"
                            : "Declined"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Payment · {formatDate(item.data.createdAt)}
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold">
                    {formatINR(item.data.amountPaise)}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-3 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/12 to-fuchsia-500/12 text-primary">
            <Users className="size-5" />
          </span>
          <div>
            <h3 className="font-display font-bold">Share bills with friends</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Only accepted friends can be added. Create a group for your flat or trip.
            </p>
            <Button asChild size="sm" variant="link" className="mt-1 px-0">
              <Link href="/friends">Manage friends and groups</Link>
            </Button>
          </div>
        </Card>
        <Card className="flex items-start gap-3 p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/12 to-orange-500/12 text-amber-600 dark:text-amber-300">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h3 className="font-display font-bold">Your public ID</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share <span className="font-semibold text-foreground">@{user.userId}</span> so friends
              can find you without your email.
            </p>
            <Button asChild size="sm" variant="link" className="mt-1 px-0">
              <Link href="/settings">Edit profile</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  className,
  valueClassName,
  signed = false,
  countAsMoney = true,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  className: string;
  valueClassName: string;
  signed?: boolean;
  countAsMoney?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br p-5 shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("flex size-8 items-center justify-center rounded-xl bg-background/70", valueClassName)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className={cn("mt-2.5 font-display text-2xl font-extrabold tracking-tight", valueClassName)}>
        {countAsMoney ? (
          <>
            {signed && value > 0 ? "+" : ""}
            <CountUp value={value} />
          </>
        ) : (
          value
        )}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
