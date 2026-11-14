"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { apiFetch } from "@/lib/client";

export function InviteAccept({
  token,
  inviter,
  signedIn,
  isSelf,
}: {
  token: string;
  inviter: { name: string; userId: string; avatarUrl: string | null };
  signedIn: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      await apiFetch("/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setConnected(true);
      toast.success("You're connected", {
        description: `${inviter.name} is now in your friends list.`,
      });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept the invite.");
    } finally {
      setLoading(false);
    }
  }

  if (connected) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
          <Check className="size-7" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            You&apos;re connected
          </h1>
          <p className="text-sm text-muted-foreground">
            {inviter.name} is now in your friends list. Add your first shared bill whenever
            you&apos;re ready.
          </p>
        </div>
        <Button asChild size="lg" className="h-12 w-full">
          <Link href="/dashboard">
            Open app
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <div className="relative mx-auto flex size-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15">
        <UserAvatar
          name={inviter.name}
          avatarUrl={inviter.avatarUrl}
          className="size-16 ring-4 ring-background"
          fallbackClassName="text-lg"
        />
        <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft">
          <UserPlus className="size-3.5" />
        </span>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-semibold text-primary">
          <Users className="size-3.5" />
          Friend invite
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {inviter.name} wants to share bills with you
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Join SplitTrack to keep one shared record. Once connected, you can add bills together and
          mark payments without awkward messages.
        </p>
        <p className="text-xs text-muted-foreground">@{inviter.userId}</p>
      </div>

      {isSelf ? (
        <p className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-sm text-amber-700 dark:text-amber-300">
          This is your own invite. Share the link with a friend instead.
        </p>
      ) : signedIn ? (
        <Button size="lg" className="h-12 w-full" onClick={accept} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Accept invite
        </Button>
      ) : (
        <div className="space-y-2">
          <Button asChild size="lg" className="h-12 w-full">
            <Link href={`/signup?invite=${encodeURIComponent(token)}`}>
              Create an account to accept
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 w-full">
            <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
              I already have an account
            </Link>
          </Button>
          <p className="pt-1 text-[11px] text-muted-foreground">
            Already signed in? Use the same email and we&apos;ll connect you automatically.
          </p>
        </div>
      )}
    </div>
  );
}
