import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, Link2Off, ShieldCheck } from "lucide-react";
import { InviteAccept } from "@/components/invite-accept";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatDate } from "@/lib/date";

export const metadata: Metadata = { title: "Friend invite" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [invite, user] = await Promise.all([
    prisma.invite.findUnique({
      where: { token },
      include: {
        inviter: { select: { id: true, name: true, userId: true, avatarUrl: true } },
        usedBy: { select: { id: true, name: true } },
      },
    }),
    getCurrentUser(),
  ]);

  const expired = invite ? invite.expiresAt.getTime() < Date.now() : false;
  const used = Boolean(invite?.usedById);
  const usable = Boolean(invite) && !expired && !used;
  const isSelf = Boolean(invite && user && invite.inviterId === user.id);

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
          {usable && invite ? (
            <InviteAccept
              token={token}
              inviter={invite.inviter}
              signedIn={Boolean(user?.emailVerified)}
              isSelf={isSelf}
            />
          ) : (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
                {used ? <ShieldCheck className="size-7" /> : expired ? <Clock3 className="size-7" /> : <Link2Off className="size-7" />}
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                  {used ? "Invite already used" : expired ? "Invite expired" : "Invite not found"}
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {used
                    ? invite?.usedBy
                      ? `This invite was already accepted by ${invite.usedBy.name}. Ask your friend for a fresh link.`
                      : "This invite has already been accepted. Ask your friend for a fresh link."
                    : expired
                      ? `This invite expired on ${invite ? formatDate(invite.expiresAt) : "its expiry date"}. Invite links last 14 days.`
                      : "This link may have been mistyped or removed. Ask your friend to send a new SplitTrack invite."}
                </p>
              </div>

              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href={user?.emailVerified ? "/dashboard" : "/signup"}>
                    {user?.emailVerified ? "Open app" : "Create your own account"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={user?.emailVerified ? "/friends" : "/login"}>
                    {user?.emailVerified ? "Manage friends" : "Back to sign in"}
                  </Link>
                </Button>
              </div>

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
        Invite links are single-use and expire after 14 days.
      </footer>
    </div>
  );
}
