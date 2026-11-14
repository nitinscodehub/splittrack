"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowUpRight,
  Check,
  Copy,
  IndianRupee,
  Loader2,
  QrCode,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { apiFetch } from "@/lib/client";
import { formatINR, paiseToInput, parseAmountToPaise } from "@/lib/money";
import type { BalanceUser } from "@/lib/balances";

export function SettleDialog({
  open,
  onOpenChange,
  creditor,
  outstandingPaise,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditor: BalanceUser;
  outstandingPaise: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(paiseToInput(outstandingPaise));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(paiseToInput(outstandingPaise));
    setNote("");
    setSubmitting(false);
    setCompleted(false);
  }, [open, outstandingPaise]);

  const amountPaise = parseAmountToPaise(amount) ?? 0;
  const amountValid = amountPaise > 0 && amountPaise <= outstandingPaise;

  const upiLink = useMemo(() => {
    if (!creditor.upiId) return "";
    const params = new URLSearchParams({
      pa: creditor.upiId,
      pn: creditor.name,
      am: (amountPaise / 100).toFixed(2),
      cu: "INR",
      tn: note.trim() || `SplitTrack payment to ${creditor.name}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [amountPaise, creditor.name, creditor.upiId, note]);

  async function submit() {
    if (!amountValid) return;
    setSubmitting(true);
    try {
      await apiFetch<{ id: string }>("/api/settlements", {
        method: "POST",
        body: JSON.stringify({
          toUserId: creditor.id,
          amountPaise,
          note: note.trim() || undefined,
        }),
      });
      setCompleted(true);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark this payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyUpi() {
    if (!creditor.upiId) return;
    try {
      await navigator.clipboard.writeText(creditor.upiId);
      toast.success("UPI ID copied");
    } catch {
      toast.error("Could not copy. Long-press the UPI ID instead.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {!completed ? (
          <>
            <DialogHeader>
              <DialogTitle>Mark payment to {creditor.name}</DialogTitle>
              <DialogDescription>
                {creditor.name} will get a request to accept or reject. The balance changes only
                after they accept.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 p-3.5">
              <UserAvatar
                name={creditor.name}
                avatarUrl={creditor.avatarUrl}
                className="size-11"
                fallbackClassName="text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{creditor.name}</div>
                <div className="truncate text-xs text-muted-foreground">@{creditor.userId}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  You have to pay
                </div>
                <div className="font-display text-lg font-bold text-amber-600 dark:text-amber-300">
                  {formatINR(outstandingPaise)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settle-amount">Amount paid</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="settle-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-14 pl-10 text-xl font-bold"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Full amount: {formatINR(outstandingPaise)}</span>
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setAmount(paiseToInput(outstandingPaise))}
                >
                  Use full amount
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settle-note">Note (optional)</Label>
              <Textarea
                id="settle-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="UPI ref, paid in cash, dinner adjustment…"
                maxLength={200}
                className="min-h-[72px]"
              />
            </div>

            {creditor.upiId ? (
              <div className="rounded-2xl bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Smartphone className="size-3.5" />
                  Pay in your UPI app
                </div>
                <p className="mt-1">
                  {creditor.name} has added UPI. After marking this payment, you&apos;ll get a QR
                  code and a one-tap UPI link for {formatINR(amountPaise)}.
                </p>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!amountValid || submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Mark {formatINR(amountPaise)} paid
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                <Check className="size-5" />
              </div>
              <DialogTitle>Payment marked as sent</DialogTitle>
              <DialogDescription>
                {creditor.name} has been notified. Your balance updates as soon as they accept.
              </DialogDescription>
            </DialogHeader>

            {creditor.upiId ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/70 bg-white p-5 text-center">
                  <div className="rounded-2xl bg-white p-2">
                    <QRCodeSVG
                      value={upiLink}
                      size={168}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#1e1b4b"
                      title={`UPI QR for ${creditor.name}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-900">
                      <QrCode className="size-4" />
                      Scan &amp; pay {formatINR(amountPaise)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{creditor.upiId}</div>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline">
                    <a href={upiLink}>
                      <ArrowUpRight className="size-4" />
                      Open UPI app
                    </a>
                  </Button>
                  <Button variant="outline" onClick={copyUpi}>
                    <Copy className="size-4" />
                    Copy UPI ID
                  </Button>
                </div>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  Paying through UPI does not confirm automatically. After you pay, {creditor.name}
                  {" "}will accept or reject the payment in SplitTrack.
                </p>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {creditor.name} has not added a UPI ID. Pay however you normally do, and they can
                accept or reject the waiting payment from their Payments page.
              </p>
            )}

            <DialogFooter>
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
