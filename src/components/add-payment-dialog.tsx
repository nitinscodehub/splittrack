"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  IndianRupee,
  Loader2,
  Percent,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { apiFetch } from "@/lib/client";
import { todayInputValue } from "@/lib/date";
import { computeShares, splitEqual, type LedgerShare } from "@/lib/ledger";
import { formatINR, parseAmountToPaise, paiseToInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AppGroup, AppUser, EditableExpense } from "@/types/app";
import type { PublicUser } from "@/lib/validators";

type SplitMode = "equal" | "exact" | "percent";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: AppUser;
  friends: PublicUser[];
  groups: AppGroup[];
  expense?: EditableExpense | null;
}

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export function AddPaymentDialog({
  open,
  onOpenChange,
  currentUser,
  friends,
  groups,
  expense = null,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("none");
  const [date, setDate] = useState(todayInputValue());
  const [groupId, setGroupId] = useState("none");
  const [participantIds, setParticipantIds] = useState<string[]>([currentUser.id]);
  const [payerId, setPayerId] = useState(currentUser.id);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [exactValues, setExactValues] = useState<Record<string, string>>({});
  const [percentValues, setPercentValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(expense);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setStep(1);
      setAmount(paiseToInput(expense.totalPaise));
      setDescription(expense.description);
      setCategory(expense.category ?? "none");
      setDate(expense.date.slice(0, 10));
      setGroupId(expense.groupId ?? "none");
      setParticipantIds(expense.participantIds);
      setPayerId(expense.payerId);
      setSplitMode("exact");
      setExactValues(
        Object.fromEntries(expense.shares.map((share) => [share.userId, paiseToInput(share.sharePaise)])),
      );
      setPercentValues({});
    } else {
      setStep(0);
      setAmount("");
      setDescription("");
      setCategory("none");
      setDate(todayInputValue());
      setGroupId("none");
      setParticipantIds([currentUser.id]);
      setPayerId(currentUser.id);
      setSplitMode("equal");
      setExactValues({});
      setPercentValues({});
    }
    setSubmitting(false);
  }, [open, expense, currentUser.id]);

  const peopleById = useMemo(() => {
    const map = new Map<string, PublicUser>();
    map.set(currentUser.id, currentUser);
    for (const friend of friends) map.set(friend.id, friend);
    for (const group of groups) for (const member of group.members) map.set(member.id, member);
    return map;
  }, [currentUser, friends, groups]);

  const groupMembers = useMemo(() => {
    const group = groups.find((entry) => entry.id === groupId);
    return group?.members ?? [];
  }, [groups, groupId]);

  const availablePeople = useMemo(() => {
    const base = groupId !== "none" ? groupMembers : [currentUser, ...friends];
    const unique = new Map<string, PublicUser>();
    for (const person of base) unique.set(person.id, person);
    unique.set(currentUser.id, currentUser);
    return [...unique.values()];
  }, [groupId, groupMembers, currentUser, friends]);

  const participants = useMemo(
    () => participantIds.map((id) => peopleById.get(id)).filter((p): p is PublicUser => Boolean(p)),
    [participantIds, peopleById],
  );

  const totalPaise = parseAmountToPaise(amount) ?? 0;

  const customShares = useMemo(() => {
    if (splitMode === "equal") return undefined;
    return participantIds.map((userId) => {
      if (splitMode === "exact") {
        return { userId, value: parseAmountToPaise(exactValues[userId] ?? "") ?? 0 };
      }
      const percent = Number(percentValues[userId] ?? "0");
      return { userId, value: Number.isFinite(percent) ? Math.round(percent * 100) : 0 };
    });
  }, [splitMode, participantIds, exactValues, percentValues]);

  const { shares, splitError } = useMemo(() => {
    if (totalPaise <= 0) return { shares: null as LedgerShare[] | null, splitError: "" };
    if (participantIds.length < 2) {
      return { shares: null as LedgerShare[] | null, splitError: "Pick at least one friend." };
    }
    try {
      return {
        shares: computeShares({
          totalPaise,
          participantIds,
          mode: splitMode,
          customShares,
        }),
        splitError: "",
      };
    } catch (error) {
      return {
        shares: null as LedgerShare[] | null,
        splitError: error instanceof Error ? error.message : "Check the shares.",
      };
    }
  }, [totalPaise, participantIds, splitMode, customShares]);

  const exactTotal = useMemo(
    () =>
      participantIds.reduce(
        (sum, userId) => sum + (parseAmountToPaise(exactValues[userId] ?? "") ?? 0),
        0,
      ),
    [participantIds, exactValues],
  );

  const percentTotal = useMemo(
    () =>
      participantIds.reduce((sum, userId) => {
        const value = Number(percentValues[userId] ?? "0");
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [participantIds, percentValues],
  );

  const stepZeroValid = totalPaise > 0 && description.trim().length > 0;
  const stepOneValid = participantIds.length >= 2 && participantIds.includes(payerId);
  const canSubmit = Boolean(shares) && !splitError && stepZeroValid && stepOneValid;

  function toggleParticipant(id: string) {
    if (id === currentUser.id) return;
    setParticipantIds((prev) => {
      const next = prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id];
      if (payerId !== currentUser.id && !next.includes(payerId)) setPayerId(currentUser.id);
      return next;
    });
  }

  function applyGroup(value: string) {
    setGroupId(value);
    if (value === "none") {
      setParticipantIds([currentUser.id]);
      setPayerId(currentUser.id);
      return;
    }
    const group = groups.find((entry) => entry.id === value);
    if (!group) return;
    const ids = group.members.map((member) => member.id);
    setParticipantIds(ids.includes(currentUser.id) ? ids : [currentUser.id, ...ids]);
    setPayerId(ids.includes(currentUser.id) ? currentUser.id : (ids[0] ?? currentUser.id));
  }

  function prepareCustom(mode: Exclude<SplitMode, "equal">) {
    setSplitMode(mode);
    const equal = splitEqual(totalPaise > 0 ? totalPaise : 0, participantIds);
    if (mode === "exact") {
      setExactValues(
        Object.fromEntries(equal.map((share) => [share.userId, paiseToInput(share.sharePaise)])),
      );
    } else {
      const bps = splitEqual(10000, participantIds);
      setPercentValues(
        Object.fromEntries(bps.map((share) => [share.userId, (share.sharePaise / 100).toFixed(2)])),
      );
    }
  }

  async function submit() {
    if (!shares || !canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        description: description.trim(),
        totalPaise,
        date,
        category: category === "none" ? null : category,
        payerId,
        participantIds,
        splitMode,
        customShares: splitMode === "equal" ? undefined : customShares,
        groupId: groupId === "none" ? null : groupId,
      };

      if (expense) {
        await apiFetch(`/api/expenses/${expense.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Bill updated", {
          description: "Balances were recalculated and the change is in history.",
        });
      } else {
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Bill added", {
          description: "Everyone in this bill can now see it.",
        });
      }

      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the bill.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-1.5 pr-8">
          <DialogTitle>{isEditing ? "Edit bill" : "Add a bill"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Changes update every balance and stay visible in history."
              : "Add a shared bill in three quick steps. The math stays exact."}
          </DialogDescription>
        </div>

        <div className="flex items-center gap-2">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (index < step) setStep(index);
                if (index > step && step === 0 && stepZeroValid) setStep(1);
                if (index > step && step === 1 && stepOneValid) setStep(2);
              }}
              aria-label={`Step ${index + 1}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                index <= step ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500" : "bg-muted",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {step === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="expense-amount"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="h-16 rounded-2xl pl-12 text-3xl font-bold tracking-tight"
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setAmount(String(quick))}
                        className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        ₹{quick}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-description">What was it for?</Label>
                  <Input
                    id="expense-description"
                    placeholder="Dominos, cab to airport, groceries…"
                    value={description}
                    maxLength={120}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expense-date">Date</Label>
                    <Input
                      id="expense-date"
                      type="date"
                      value={date}
                      max={todayInputValue()}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger aria-label="Category">
                        <SelectValue placeholder="No category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {EXPENSE_CATEGORIES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {groups.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Group (optional)</Label>
                    <Select value={groupId} onValueChange={applyGroup}>
                      <SelectTrigger aria-label="Group">
                        <SelectValue placeholder="Just friends" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Just friends</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name} · {group.members.length} members
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    onClick={() => setStep(1)}
                    disabled={!stepZeroValid}
                    className="w-full sm:w-auto"
                  >
                    Choose friends
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Who shared this bill?</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary hover:underline"
                        onClick={() =>
                          setParticipantIds(availablePeople.map((person) => person.id))
                        }
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setParticipantIds([currentUser.id]);
                          setPayerId(currentUser.id);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availablePeople.map((person) => {
                      const selected = participantIds.includes(person.id);
                      const isYou = person.id === currentUser.id;
                      return (
                        <motion.button
                          key={person.id}
                          type="button"
                          layout
                          aria-pressed={selected}
                          onClick={() => toggleParticipant(person.id)}
                          className={cn(
                            "group flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-semibold transition-all",
                            selected
                              ? "border-primary/50 bg-primary/10 text-primary shadow-sm"
                              : "border-border bg-background/60 text-muted-foreground hover:border-primary/30",
                            isYou && "cursor-default",
                          )}
                        >
                          <UserAvatar
                            name={person.name}
                            avatarUrl={person.avatarUrl}
                            className={cn("size-7", selected && "ring-primary/30")}
                            fallbackClassName="text-[10px]"
                          />
                          <span className="max-w-[10rem] truncate">
                            {isYou ? "You" : person.name}
                          </span>
                          <span
                            className={cn(
                              "flex size-4 items-center justify-center rounded-full border transition-all",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border",
                            )}
                          >
                            {selected ? <Check className="size-3" /> : null}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                  {participantIds.length < 2 ? (
                    <p className="text-xs text-muted-foreground">
                      Select at least one friend.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Who paid?</Label>
                  <Select
                    value={payerId}
                    onValueChange={(value) => {
                      if (participantIds.includes(value)) setPayerId(value);
                    }}
                  >
                    <SelectTrigger aria-label="Who paid">
                      <SelectValue placeholder="Choose payer" />
                    </SelectTrigger>
                    <SelectContent>
                      {participants.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.id === currentUser.id ? "You" : person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    You can add this bill if someone else paid.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bill amount</span>
                    <span className="font-bold">{formatINR(totalPaise)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-muted-foreground">Shared by</span>
                    <span className="font-semibold">
                      {participantIds.length} {participantIds.length === 1 ? "person" : "people"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button onClick={() => setStep(2)} disabled={!stepOneValid} className="flex-1">
                    See shares
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex rounded-xl bg-muted/70 p-1">
                    {(
                      [
                        { value: "equal", label: "Equal", icon: Users },
                        { value: "exact", label: "Amount", icon: IndianRupee },
                        { value: "percent", label: "Percent", icon: Percent },
                      ] as const
                    ).map((mode) => {
                      const Icon = mode.icon;
                      const active = splitMode === mode.value;
                      return (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() =>
                            mode.value === "equal" ? setSplitMode("equal") : prepareCustom(mode.value)
                          }
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                            active
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Icon className="size-3.5" />
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {participantIds.length} people · {formatINR(totalPaise)}
                  </div>
                </div>

                <div className="space-y-2">
                  {participants.map((person) => {
                    const share = shares?.find((entry) => entry.userId === person.id);
                    const percent = totalPaise > 0 && share ? (share.sharePaise / totalPaise) * 100 : 0;
                    return (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-3"
                      >
                        <UserAvatar
                          name={person.name}
                          avatarUrl={person.avatarUrl}
                          className="size-9"
                          fallbackClassName="text-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {person.id === currentUser.id ? "You" : person.name}
                            {person.id === payerId ? (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                                Paid
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {percent.toFixed(1)}% of bill
                          </div>
                        </div>
                        {splitMode === "equal" ? (
                          <div className="text-right text-sm font-bold">
                            {share ? formatINR(share.sharePaise) : "—"}
                          </div>
                        ) : splitMode === "exact" ? (
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              ₹
                            </span>
                            <Input
                              inputMode="decimal"
                              value={exactValues[person.id] ?? ""}
                              onChange={(event) =>
                                setExactValues((prev) => ({
                                  ...prev,
                                  [person.id]: event.target.value,
                                }))
                              }
                              className="h-9 pl-6 text-right text-sm font-semibold"
                              aria-label={`Amount for ${person.name}`}
                            />
                          </div>
                        ) : (
                          <div className="relative w-24">
                            <Input
                              inputMode="decimal"
                              value={percentValues[person.id] ?? ""}
                              onChange={(event) =>
                                setPercentValues((prev) => ({
                                  ...prev,
                                  [person.id]: event.target.value,
                                }))
                              }
                              className="h-9 pr-6 text-right text-sm font-semibold"
                              aria-label={`Percent for ${person.name}`}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              %
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {splitMode !== "equal" ? (
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">
                      {splitMode === "exact" ? "Total entered" : "Percent total"}
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        splitMode === "exact"
                          ? exactTotal === totalPaise
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                          : Math.abs(percentTotal - 100) < 0.001
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive",
                      )}
                    >
                      {splitMode === "exact"
                        ? `${formatINR(exactTotal)} / ${formatINR(totalPaise)}`
                        : `${percentTotal.toFixed(2)}% / 100%`}
                    </span>
                  </div>
                ) : null}

                {splitError ? (
                  <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                    {splitError}
                  </p>
                ) : null}

                <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-fuchsia-500/10 p-3 text-xs text-muted-foreground">
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  <span>
                    The person who paid does not pay themselves. Everyone else pays their share to{" "}
                    {payerId === currentUser.id ? "you" : "the payer"}.
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                  <Button onClick={submit} disabled={!canSubmit || submitting} className="flex-1">
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {isEditing ? "Save changes" : `Add bill ${formatINR(totalPaise)}`}
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
