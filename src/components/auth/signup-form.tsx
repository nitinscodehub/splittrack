"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/utils";

export function SignupForm({
  inviteToken,
  nextPath = "/dashboard",
}: {
  inviteToken?: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "A letter", pass: /[A-Za-z]/.test(password) },
    { label: "A number", pass: /\d/.test(password) },
  ];
  const passwordValid = checks.every((check) => check.pass);
  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = name.trim().length >= 2 && email.trim().length > 3 && passwordValid && passwordsMatch;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const response = await apiFetch<{
        requiresVerification: boolean;
        email: string;
        emailSent?: boolean;
        devOtp?: string;
      }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          inviteToken,
        }),
      });

      if (response.devOtp) {
        toast.success("Local test code ready", {
          description: "Email delivery is off. The code is shown on the next screen.",
        });
      } else if (response.emailSent === false) {
        toast.warning("Account created, but the code email did not send", {
          description: "Tap Resend code. If it still does not arrive, check your Spam folder.",
        });
      } else {
        toast.success("Check your inbox", {
          description: "We sent a 6-digit code. It expires in 10 minutes.",
        });
      }

      const params = new URLSearchParams({ email: response.email });
      if (nextPath !== "/dashboard") params.set("next", nextPath);
      if (response.devOtp) params.set("devOtp", response.devOtp);
      router.push(`/verify?${params.toString()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          One account, every shared bill. Verify your email with a 6-digit code.
        </p>
      </div>

      {inviteToken ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-3.5 text-sm">
          <span className="font-semibold text-primary">You&apos;re joining via an invite.</span>{" "}
          <span className="text-muted-foreground">
            Your friend will be added automatically once your email is verified.
          </span>
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <div className="relative">
            <UserRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Aarav Mehta"
              autoComplete="name"
              className="h-12 pl-10"
              maxLength={60}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-12 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="h-12 pl-10 pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {checks.map((check) => (
              <span
                key={check.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  check.pass
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {check.pass ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                {check.label}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="signup-confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              className={cn("h-12 pl-10", confirm && !passwordsMatch && "border-destructive/60")}
              required
            />
          </div>
          {confirm && !passwordsMatch ? (
            <p className="text-[11px] font-medium text-destructive">Passwords don&apos;t match yet.</p>
          ) : null}
        </div>

        <Button type="submit" size="lg" className="h-12 w-full" disabled={!canSubmit || loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Create account
          {!loading ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={nextPath !== "/dashboard" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        By creating an account you agree to keep things clear. Every change is visible to everyone
        in the bill.
      </p>
    </div>
  );
}
