"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Clock3, Sparkles, Wallet } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { formatINR } from "@/lib/money";

const people = [
  { id: "aarav", name: "Aarav Mehta", avatarUrl: null, share: 90000 },
  { id: "bhavya", name: "Bhavya Rao", avatarUrl: null, share: 90000 },
  { id: "chirag", name: "Chirag Nair", avatarUrl: null, share: 90000 },
  { id: "diya", name: "Diya Kapoor", avatarUrl: null, share: 90000 },
];

const steps = [
  {
    label: "Dinner bill",
    title: "Dinner at Toit",
    caption: "₹3,600 shared equally between four friends.",
    highlight: "Aarav paid",
  },
  {
    label: "Adjusted",
    title: "Only the difference remains",
    caption: "A cab refund was adjusted against the dinner. No double payments.",
    highlight: "One final amount",
  },
  {
    label: "Paid",
    title: "Diya marked ₹450 paid",
    caption: "Bhavya got an email. One tap to confirm in Payments.",
    highlight: "Waiting for confirmation",
  },
  {
    label: "Confirmed",
    title: "Balance updated instantly",
    caption: "Everyone sees the same balance — and the change history explains why.",
    highlight: "Confirmed",
  },
];

export function LandingDemo() {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setInterval(() => {
      setStep((value) => (value + 1) % steps.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [reduceMotion]);

  const current = steps[step] ?? steps[0] ?? {
    label: "Dinner bill",
    title: "Dinner at Toit",
    caption: "₹3,600 shared equally between four friends.",
    highlight: "Aarav paid",
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-indigo-500/25 via-fuchsia-500/15 to-transparent blur-3xl" />

      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#12101f]/90"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3 text-primary" />
            Live demo
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Goa trip · 4 friends
              </div>
              <AnimatePresence mode="wait">
                <motion.h3
                  key={current.title}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="mt-1 font-display text-xl font-extrabold tracking-tight"
                >
                  {current.title}
                </motion.h3>
              </AnimatePresence>
            </div>
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-soft">
              <Wallet className="size-4" />
            </span>
          </div>

          <div className="relative mt-4 h-40 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24 }}
                className="flex h-full flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-bold text-primary ring-1 ring-inset ring-primary/15">
                    {current.highlight}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                    {step >= 2 ? <Clock3 className="size-3" /> : <Check className="size-3" />}
                    {step >= 3 ? "Confirmed" : step === 2 ? "Waiting for confirmation" : "Calculated"}
                  </span>
                </div>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  {current.caption}
                </p>
                <div className="flex items-end gap-2">
                  {[62, 88, 48, 74].map((height, index) => (
                    <motion.span
                      key={index}
                      animate={{ height: `${height}%`, opacity: index <= step + 1 ? 1 : 0.35 }}
                      transition={{ duration: 0.4 }}
                      className="w-full rounded-t-md bg-gradient-to-t from-indigo-500/70 to-fuchsia-400/70"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 space-y-1.5">
            {people.map((person, index) => {
              const settled = step === 3 && index === 2;
              const pending = step === 2 && index === 2;
              return (
                <motion.div
                  key={person.id}
                  layout
                  className="flex items-center gap-2.5 rounded-xl border border-transparent bg-background/55 px-2.5 py-2 ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.04]"
                >
                  <UserAvatar
                    name={person.name}
                    className="size-7"
                    fallbackClassName="text-[9px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{person.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {settled
                        ? "Paid · confirmed"
                        : pending
                          ? "Marked paid · waiting"
                          : step >= 1
                            ? index === 0
                              ? "Gets back ₹450"
                              : "Has to pay ₹450"
                            : "Has to pay ₹900"}
                    </div>
                  </div>
                  {settled ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      <Check className="size-2.5" />
                      Done
                    </span>
                  ) : pending ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      Waiting
                    </span>
                  ) : (
                    <span className="text-xs font-bold">
                      {formatINR(step >= 1 ? 45000 : person.share)}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-1.5">
            {steps.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setStep(index)}
                aria-label={`Show step: ${item.label}`}
                aria-pressed={index === step}
                className={
                  index === step
                    ? "h-1.5 flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                    : "h-1.5 flex-1 rounded-full bg-muted"
                }
              />
            ))}
          </div>
        </div>
      </motion.div>

      <div className="absolute -left-6 top-24 hidden animate-float rounded-2xl border border-white/60 bg-white/85 p-3 shadow-xl backdrop-blur-xl sm:block dark:border-white/10 dark:bg-[#171525]/90">
        <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          You will get
        </div>
        <div className="font-display text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
          {formatINR(45000)}
        </div>
      </div>
      <div
        className="absolute -right-4 bottom-28 hidden animate-float rounded-2xl border border-white/60 bg-white/85 p-3 shadow-xl backdrop-blur-xl sm:block dark:border-white/10 dark:bg-[#171525]/90"
        style={{ animationDelay: "1.4s" }}
      >
        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          Reminder set
          <ArrowRight className="size-2.5 text-primary" />
        </div>
        <div className="mt-0.5 text-xs font-semibold">9:00 AM IST</div>
      </div>
    </div>
  );
}
