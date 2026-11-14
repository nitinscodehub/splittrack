"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { apiFetch } from "@/lib/client";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AppSettlement } from "@/types/app";

export function PendingSettlements({
  settlements,
  currentUserId,
  compact = false,
  className,
}: {
  settlements: AppSettlement[];
  currentUserId: string;
  compact?: boolean;
  className?: string;
}) {
  if (settlements.length === 0) return null;

  const incoming = settlements.filter((settlement) => settlement.to.id === currentUserId);
  const outgoing = settlements.filter((settlement) => settlement.from.id === currentUserId);

  return (
    <section className={cn("space-y-3", className)} aria-labelledby="pending-settlements-title">
      <div className="flex items-center justify-between">
        <h2
          id="pending-settlements-title"
          className="flex items-center gap-2 font-display text-base font-bold"
        >
          <Clock3 className="size-4 text-amber-500" />
          Waiting for a reply
        </h2>
        <Badge variant="warning">{settlements.length}</Badge>
      </div>

      <div className="space-y-2">
        {incoming.map((settlement) => (
          <SettlementRow key={settlement.id} settlement={settlement} incoming compact={compact} />
        ))}
        {outgoing.map((settlement) => (
          <SettlementRow
            key={settlement.id}
            settlement={settlement}
            incoming={false}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}

function SettlementRow({
  settlement,
  incoming,
  compact,
}: {
  settlement: AppSettlement;
  incoming: boolean;
  compact: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const other = incoming ? settlement.from : settlement.to;

  async function respond(action: "confirm" | "reject") {
    setRejectOpen(false);
    setLoading(action);
    try {
      await apiFetch(`/api/settlements/${settlement.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      toast.success(action === "confirm" ? "Payment confirmed" : "Payment rejected", {
        description:
          action === "confirm"
            ? "Balances have been updated for both of you."
            : "Balances did not change. The sender has been notified.",
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the payment.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border border-border/70 bg-card/80 p-3.5",
          incoming && "border-amber-500/25 bg-amber-500/[0.04]",
        )}
      >
        <div className="flex items-start gap-3">
          <UserAvatar
            name={other.name}
            avatarUrl={other.avatarUrl}
            className={cn("shrink-0", compact ? "size-8" : "size-10")}
            fallbackClassName="text-xs"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug">
              {incoming ? (
                <>
                  <span className="font-semibold">{other.name}</span> marked{" "}
                  <span className="font-bold">{formatINR(settlement.amountPaise)}</span> as paid to
                  you
                </>
              ) : (
                <>
                  You marked <span className="font-bold">{formatINR(settlement.amountPaise)}</span>{" "}
                  as paid to <span className="font-semibold">{other.name}</span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(settlement.createdAt)}
              {settlement.note ? ` · ${settlement.note}` : ""}
            </p>
          </div>

          {incoming ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              <Button
                size="sm"
                variant="success"
                onClick={() => respond("confirm")}
                disabled={loading !== null}
                aria-label={`Confirm payment from ${other.name}`}
              >
                {loading === "confirm" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={loading !== null}
                aria-label={`Reject payment from ${other.name}`}
                className="text-destructive hover:text-destructive"
              >
                {loading === "reject" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
                Reject
              </Button>
            </div>
          ) : (
            <Badge variant="warning" className="shrink-0">
              Waiting for {other.name}
            </Badge>
          )}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this payment?</DialogTitle>
            <DialogDescription>
              {other.name} marked {formatINR(settlement.amountPaise)} as paid to you. If you reject
              it, the balance stays the same and {other.name} will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={loading !== null}
            >
              Keep waiting
            </Button>
            <Button
              variant="destructive"
              onClick={() => respond("reject")}
              disabled={loading !== null}
            >
              {loading === "reject" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Reject payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
