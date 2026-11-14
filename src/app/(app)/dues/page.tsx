import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DuesQueue } from "@/components/dues-queue";
import { PageHeader } from "@/components/page-header";
import { getBalanceOverview } from "@/lib/balances";
import { getCurrentUser } from "@/lib/session";
import { getPendingSettlements } from "@/lib/services/settlements";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function DuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [overview, pending] = await Promise.all([
    getBalanceOverview(user.id),
    getPendingSettlements(user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="See who pays whom. Mark a payment, the other person accepts or rejects it, and the balance updates."
      >
        <Button asChild variant="outline">
          <Link href="/activity">
            View history
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </PageHeader>

      <div className="rounded-3xl border border-primary/15 bg-gradient-to-r from-indigo-500/[0.07] via-violet-500/[0.06] to-fuchsia-500/[0.07] p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <Sparkles className="size-3.5" />
            How it works
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="size-3.5" />
            1. The person who pays marks it paid
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            2. The person who gets the money accepts or rejects
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Info className="size-3.5" />
            3. Only accepted payments change the balance
          </span>
        </div>
      </div>

      <DuesQueue overview={overview} pending={pending} currentUserId={user.id} />

      <Card className="flex items-start gap-3 p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Info className="size-4" />
        </span>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Why the amount is adjusted</p>
          <p className="mt-1">
            If Aarav paid ₹500 for you and you paid ₹300 for Aarav, we show one final amount of ₹200
            instead of two confusing entries. A payment does not change the balance until the other
            person accepts it. If they reject it, the balance stays the same. Old changes stay in
            history.
          </p>
        </div>
      </Card>
    </div>
  );
}
