"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Loader2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/utils";

export function ForgotForm({
  initialEmail = "",
  devMode = false,
}: {
  initialEmail?: string;
  devMode?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (step !== 1 || seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds, step]);

  const passwordValid =
    password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch<{ sent: boolean; devOtp?: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      setStep(1);
      setSeconds(devMode ? 0 : 60);
      if (response.devOtp) {
        setCode(response.devOtp);
        toast.success("Local test reset code ready", {
          description: `Code: ${response.devOtp}`,
        });
      } else {
        toast.success("If that account exists, a code is on its way.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the code.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (seconds > 0) return;
    setLoading(true);
    try {
      const response = await apiFetch<{ sent: boolean; devOtp?: string }>(
        "/api/auth/resend-otp",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), purpose: "RESET" }),
        },
      );
      setSeconds(devMode ? 0 : 60);
      if (response.devOtp) {
        setCode(response.devOtp);
        toast.success("Local test reset code ready", {
          description: `Code: ${response.devOtp}`,
        });
      } else {
        setCode("");
        toast.success("New reset code sent");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend the code.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== 6 || !passwordValid || !passwordsMatch) return;
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), code, password }),
      });
      toast.success("Password reset");
      router.push(`/login?reset=1&email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-primary">
          {step === 0 ? <KeyRound className="size-5" /> : <ShieldCheck className="size-5" />}
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {step === 0 ? "Reset your password" : "Enter your code"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step === 0
            ? "Enter your account email and we will send a 6-digit code. For privacy, we show the same message either way."
            : `We sent a reset code to ${email.trim()}. Enter it with your new password.`}
        </p>
      </div>

      {devMode && step === 1 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-300">Local test mode</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Gmail delivery is off. {code ? "Your reset code is filled in below." : "Tap Resend code to generate one."}
          </p>
          {code ? (
            <p className="mt-2 font-mono text-2xl font-bold tracking-[0.35em] text-foreground">
              {code}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === 0 ? (
        <form onSubmit={requestCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="forgot-email"
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
          <Button type="submit" size="lg" className="h-12 w-full" disabled={loading || !email.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Send reset code
          </Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-5">
          <OtpInput value={code} onChange={setCode} disabled={loading} autoFocus />

          <div className="space-y-2">
            <Label htmlFor="reset-password">New password</Label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters with a number"
                autoComplete="new-password"
                className="h-12 pr-11"
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
              {[
                { label: "8+ characters", pass: password.length >= 8 },
                { label: "A letter", pass: /[A-Za-z]/.test(password) },
                { label: "A number", pass: /\d/.test(password) },
              ].map((check) => (
                <span
                  key={check.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    check.pass
                      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Check className="size-2.5" />
                  {check.label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Confirm new password</Label>
            <Input
              id="reset-confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              className={cn("h-12", confirm && !passwordsMatch && "border-destructive/60")}
              required
            />
            {confirm && !passwordsMatch ? (
              <p className="text-[11px] font-medium text-destructive">Passwords don&apos;t match.</p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={loading || code.length !== 6 || !passwordValid || !passwordsMatch}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Reset password
          </Button>

          <div className="flex flex-col items-center gap-2 text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={resend}
              disabled={loading || seconds > 0}
              className="text-muted-foreground"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setCode("");
                setPassword("");
                setConfirm("");
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      <Button asChild variant="ghost" className="w-full text-muted-foreground">
        <Link href="/login">
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </Button>
    </div>
  );
}
