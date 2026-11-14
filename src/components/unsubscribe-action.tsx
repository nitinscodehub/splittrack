"use client";

import { useState } from "react";
import Link from "next/link";
import { BellOff, Check, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client";

export function UnsubscribeAction({
  uid,
  token,
  alreadyPaused,
}: {
  uid: string;
  token: string;
  alreadyPaused: boolean;
}) {
  const [paused, setPaused] = useState(alreadyPaused);
  const [loading, setLoading] = useState(false);

  async function unsubscribe() {
    setLoading(true);
    try {
      const response = await apiFetch<{ unsubscribed: boolean }>("/api/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ uid, token }),
      });
      if (!response.unsubscribed) {
        toast.error("This unsubscribe link is no longer valid.");
        return;
      }
      setPaused(true);
      toast.success("Reminder emails paused");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your preferences.");
    } finally {
      setLoading(false);
    }
  }

  if (paused) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
          <Check className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Reminders paused
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You won&apos;t receive daily or manual payment reminders. Bill, friend request and
            payment emails still arrive because they are part of a bill you are in.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/settings">
            <Settings className="size-4" />
            Manage email preferences
          </Link>
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Changed your mind? Turn reminders back on under Settings → Reminders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-amber-500/12 text-amber-600 dark:text-amber-300">
        <BellOff className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Pause payment reminders?
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This stops daily payment reminders and manual nudges. You will still receive emails about
          bills, friend requests and payments you are directly involved in.
        </p>
      </div>

      <Button size="lg" className="h-12 w-full" onClick={unsubscribe} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <BellOff className="size-4" />}
        Pause reminder emails
      </Button>

      <p className="text-[11px] text-muted-foreground">
        You can turn reminders back on anytime in SplitTrack settings.
      </p>
    </div>
  );
}
