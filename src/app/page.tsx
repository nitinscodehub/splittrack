import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Fingerprint,
  HandCoins,
  IndianRupee,
  Layers,
  Lock,
  MessageCircle,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LandingDemo } from "@/components/landing/landing-demo";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: IndianRupee,
    title: "Exact amounts",
    description: "Split equally, by exact amount or by percent. Every paisa adds up.",
    tone: "from-indigo-500/12 to-violet-500/5 text-primary",
  },
  {
    icon: HandCoins,
    title: "One clear amount per friend",
    description:
      "If you have to pay Aarav and Aarav has to pay you, we show one final amount. No back-and-forth.",
    tone: "from-emerald-500/12 to-teal-500/5 text-emerald-600 dark:text-emerald-300",
  },
  {
    icon: ReceiptText,
    title: "Every bill in one place",
    description: "Open any balance to see the bills and payments behind it.",
    tone: "from-amber-500/12 to-orange-500/5 text-amber-600 dark:text-amber-300",
  },
  {
    icon: ShieldCheck,
    title: "Mark paid, they confirm",
    description:
      "The person who pays marks it paid. The person who gets the money confirms. The balance changes only after they confirm.",
    tone: "from-sky-500/12 to-cyan-500/5 text-sky-600 dark:text-sky-300",
  },
  {
    icon: BellRing,
    title: "Simple reminders",
    description:
      "One daily email at 9 AM IST. Friend reminders are limited to one per day.",
    tone: "from-fuchsia-500/12 to-pink-500/5 text-fuchsia-600 dark:text-fuchsia-300",
  },
  {
    icon: Layers,
    title: "Groups and full history",
    description:
      "Save groups for trips and flats. Every edit and delete stays in history for everyone in the bill.",
    tone: "from-violet-500/12 to-purple-500/5 text-violet-600 dark:text-violet-300",
  },
];

const steps = [
  {
    number: "01",
    title: "Add the bill",
    description:
      "Enter the amount, who paid and who shared it. Choose equal, amount or percent. You can add it if another friend paid.",
  },
  {
    number: "02",
    title: "We do the math",
    description:
      "We work out each person's share and adjust amounts between friends. Waiting payments stay visible without changing the balance.",
  },
  {
    number: "03",
    title: "Mark paid. They confirm.",
    description:
      "Mark it paid, optionally use UPI, and the other person confirms. The full story stays in history.",
  },
];

const faqs = [
  {
    question: "Does SplitTrack change my balance on its own?",
    answer:
      "No. Bills, edits and deletes are saved. Only confirmed payments change the balance. The 'Fewer payments' suggestions are only ideas; nothing changes until you mark a payment.",
  },
  {
    question: "What if someone marks paid but did not send the money?",
    answer:
      "The payment stays waiting and does not change the balance. The other person can decline it, and the original amount stays the same.",
  },
  {
    question: "When do reminders arrive?",
    answer:
      "One daily email at 9 AM IST. Friend reminders are limited to one per day. You can pause reminders in Settings.",
  },
  {
    question: "Can I use SplitTrack without UPI?",
    answer:
      "Yes. UPI is optional. Add your UPI ID to let friends scan a payment QR. You can also pay outside the app and mark it paid.",
  },
  {
    question: "Who can see my bills?",
    answer:
      "Only people in the bill can see it. Everyone in the bill can see the full share breakdown and change history.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const signedIn = Boolean(user?.emailVerified);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.18),transparent_65%)]" />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <Link
              href="#features"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="#transparency"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              History
            </Link>
            <Link
              href="#faq"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {signedIn ? (
              <Button asChild>
                <Link href="/dashboard">
                  Open app
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">
                    Get started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="container grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-semibold text-primary">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              Shared bills, without the group-chat search
            </div>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              Split bills,
              <span className="block text-gradient">not friendships.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              SplitTrack keeps one shared record for trips, flats and dinners. See one clear amount
              per friend, and mark payments without awkward messages.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6">
                <Link href={signedIn ? "/dashboard" : "/signup"}>
                  {signedIn ? "Open app" : "Start free"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-5">
                <Link href="#how-it-works">
                  <CheckCircle2 className="size-4" />
                  See how it works
                </Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="size-3.5 text-primary" />
                Email verification
              </span>
              <span className="flex items-center gap-1.5">
                <Fingerprint className="size-3.5 text-primary" />
                Public profile ID
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500" />
                Installable PWA
              </span>
            </div>
          </div>

          <LandingDemo />
        </section>

        <section className="border-y border-border/60 bg-card/40">
          <div className="container grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "₹0.01", label: "Exact amounts", detail: "No rounding errors." },
              { value: "9 AM IST", label: "Daily reminder", detail: "One email, once a day." },
              { value: "100%", label: "Visible history", detail: "Edits and deletes included." },
              { value: "0", label: "Double payments", detail: "Amounts are adjusted." },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <div className="font-display text-2xl font-extrabold tracking-tight text-gradient">
                  {item.value}
                </div>
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="container scroll-mt-24 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Built for real friend groups
            </div>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              The math is exact.
              <span className="block text-gradient">The app stays simple.</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Every feature removes one small awkward moment: the reminder, the confusion, the
              “wait, did I pay you?”.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/25"
                >
                  <div
                    className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.tone}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="container scroll-mt-24 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-primary">How it works</div>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Three steps, zero awkwardness.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Everything stays clear even when life gets messy. Edit a bill, share unevenly, mark
                a payment — the history remembers.
              </p>
              <Button asChild className="mt-5" variant="outline">
                <Link href={signedIn ? "/dashboard" : "/signup"}>
                  Try it with your friends
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className="relative flex gap-4 rounded-3xl border border-border/70 bg-card/70 p-5 shadow-card"
                >
                  <div className="flex flex-col items-center">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 font-display text-sm font-extrabold text-white shadow-soft">
                      {step.number}
                    </span>
                    {index < steps.length - 1 ? (
                      <span className="mt-2 h-full w-px flex-1 bg-gradient-to-b from-primary/30 to-transparent" />
                    ) : null}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="transparency" className="scroll-mt-24 border-y border-border/60 bg-card/40 py-20">
          <div className="container grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-primary">
                Clear for everyone
              </div>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Every change stays visible.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Deleted a bill? Changed who paid? The old entry stays in history so everyone can see
                what changed. Friends can filter by date, category or person and export the same view
                as CSV.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: FileSpreadsheet,
                    title: "Search and filters",
                    text: "Date range, category, person and text search.",
                  },
                  {
                    icon: QrCode,
                    title: "UPI if you want",
                    text: "The person getting paid adds a UPI ID. You get a QR to scan.",
                  },
                  {
                    icon: Clock3,
                    title: "Waiting is not paid",
                    text: "The balance changes only after the other person confirms.",
                  },
                  {
                    icon: MessageCircle,
                    title: "Polite reminders",
                    text: "One manual reminder per friend per day. Pause anytime.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-border/70 bg-background/60 p-4"
                    >
                      <Icon className="size-4 text-primary" />
                      <div className="mt-2 text-sm font-semibold">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.text}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 blur-2xl" />
              <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4 text-primary" />
                    Change history
                  </div>
                  <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Visible to everyone in the bill
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  {[
                    {
                      actor: "Aarav",
                      action: "added the bill",
                      detail: "Dinner at Toit · ₹3,600 · equal shares",
                      time: "2 hours ago",
                      color: "bg-primary/10 text-primary",
                    },
                    {
                      actor: "Chirag",
                      action: "changed the shares",
                      detail: "Shared ₹2,400 → ₹2,700 · amounts",
                      time: "48 minutes ago",
                      color: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
                    },
                    {
                      actor: "Diya",
                      action: "marked a payment",
                      detail: "₹450 → Bhavya · waiting for confirmation",
                      time: "12 minutes ago",
                      color: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
                    },
                    {
                      actor: "Bhavya",
                      action: "confirmed the payment",
                      detail: "Balance updated · ₹450 removed",
                      time: "just now",
                      color: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
                    },
                  ].map((item) => (
                    <div key={item.detail} className="flex gap-3">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${item.color}`}
                      >
                        <Wallet className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 border-b border-border/40 pb-2.5 last:border-0">
                        <div className="text-xs">
                          <span className="font-semibold">{item.actor}</span>{" "}
                          <span className="text-muted-foreground">{item.action}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium">{item.detail}</div>
                        <div className="text-[10px] text-muted-foreground">{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Users className="size-3.5" />
                    4 people can see this history
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                    Export CSV
                    <ArrowRight className="size-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="container scroll-mt-24 py-20">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-primary">FAQ</div>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
                The questions friends actually ask.
              </h2>
            </div>
            <div className="mt-8 space-y-2.5">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-border/70 bg-card/60 p-4 transition-colors open:border-primary/20 open:bg-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                    {faq.question}
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="container pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-12 text-center text-white shadow-glow sm:px-12 sm:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.22),transparent_45%)]" />
            <div className="relative mx-auto max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="size-3.5" />
                Your next trip deserves this
              </div>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Stop rebuilding bills from chat screenshots.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80">
                Create a free account, invite your friends, and let SplitTrack handle the rest. The
                first bill takes about 30 seconds.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 bg-white px-6 text-indigo-700 hover:bg-white/90"
                >
                  <Link href={signedIn ? "/dashboard" : "/signup"}>
                    {signedIn ? "Open app" : "Create free account"}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-white/30 bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white"
                >
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/30">
        <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A simple shared bill tracker for friends. Exact amounts, one clear balance per friend,
              and full history.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Product
              </div>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link href="#features" className="text-muted-foreground hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground">
                    How it works
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-muted-foreground hover:text-foreground">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Trust
              </div>
              <ul className="mt-2 space-y-1.5">
                <li>
                  <Link href="#transparency" className="text-muted-foreground hover:text-foreground">
                    History
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="text-muted-foreground hover:text-foreground">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-muted-foreground hover:text-foreground">
                    Get started
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Money basics
              </div>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <IndianRupee className="size-3.5" />
                  No rounding errors
                </li>
                <li className="flex items-center gap-1.5">
                  <HandCoins className="size-3.5" />
                  One balance per friend
                </li>
                <li className="flex items-center gap-1.5">
                  <QrCode className="size-3.5" />
                  Optional UPI
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container flex flex-col items-center justify-between gap-2 border-t border-border/50 py-5 text-[11px] text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} SplitTrack. Made for friends who share bills.</span>
          <span className="flex items-center gap-1.5">
            <Lock className="size-3" />
            Your bills are only visible to people in them.
          </span>
        </div>
      </footer>
    </div>
  );
}
