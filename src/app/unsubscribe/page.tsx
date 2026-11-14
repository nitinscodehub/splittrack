import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Link2Off } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UnsubscribeAction } from "@/components/unsubscribe-action";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/subscription";

export const metadata: Metadata = { title: "Email preferences" };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { uid?: string | string[]; token?: string | string[] };
}) {
  const uid = Array.isArray(searchParams.uid) ? searchParams.uid[0] : searchParams.uid;
  const token = Array.isArray(searchParams.token) ? searchParams.token[0] : searchParams.token;
  const valid = Boolean(uid && token && verifyUnsubscribeToken(uid, token));
  const user = valid && uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;

  return (
    <div className="mesh relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-20 size-96 animate-float rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-96 animate-aurora rounded-full bg-fuchsia-500/15 blur-3xl" />

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {valid && user && uid && token ? (
            <UnsubscribeAction uid={uid} token={token} alreadyPaused={user.remindersOptOut} />
          ) : (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
                <Link2Off className="size-7" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                  Invalid link
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This email preference link is missing or invalid. Sign in to manage notifications
                  from your account settings.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/settings">Open notification settings</Link>
              </Button>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                Back to SplitTrack
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="relative px-5 pb-6 text-center text-[11px] text-muted-foreground sm:px-8">
        Reminder emails are optional. Bill and payment emails keep your records accurate.
      </footer>
    </div>
  );
}
