import { redirect } from "next/navigation";
import { ArrowUpRight, Check, Sparkles, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user?.emailVerified) redirect("/dashboard");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="mesh relative hidden min-h-screen overflow-hidden border-r border-border/60 p-10 lg:flex lg:flex-col xl:p-14">
        <div className="pointer-events-none absolute -right-32 top-16 size-[28rem] animate-aurora rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-10 size-96 animate-float rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative">
          <Logo />
        </div>

        <div className="relative my-auto max-w-lg py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
            <Sparkles className="size-3.5" />
            Split bills, not friendships
          </div>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-5xl">
            Who paid? Who pays next?
            <span className="mt-1 block text-gradient">Everyone knows.</span>
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            One shared record for trips, flats and dinners. We adjust amounts between friends so no
            one pays twice, and every change stays visible.
          </p>

          <div className="mt-8 grid max-w-sm gap-2.5">
            {[
              "One clear amount per friend",
              "Mark paid, they confirm",
              "Daily reminders at 9 AM IST",
              "Full change history",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm">
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                  <Check className="size-3" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/50 bg-white/55 p-4 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <Wallet className="size-3.5 text-primary" />
              Exact amounts
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold">₹0.01</div>
            <div className="text-[11px] text-muted-foreground">No rounding errors.</div>
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/55 p-4 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <ArrowUpRight className="size-3.5 text-emerald-500" />
              Your balance
            </div>
            <div className="mt-2 font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">
              +₹2,450
            </div>
            <div className="text-[11px] text-muted-foreground">Across four friends.</div>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-5 pb-12 pt-4 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="px-5 pb-6 text-center text-[11px] text-muted-foreground sm:px-8">
          SplitTrack keeps your bills clear. Questions? Reply to any SplitTrack email.
        </footer>
      </div>
    </div>
  );
}
