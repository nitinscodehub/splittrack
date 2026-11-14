"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client";

export function LoginForm({
  initialEmail = "",
  nextPath = "/dashboard",
  verified = false,
  reset = false,
}: {
  initialEmail?: string;
  nextPath?: string;
  verified?: boolean;
  reset?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const precheck = await apiFetch<{ verified: boolean; email: string }>(
        "/api/auth/precheck",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password }),
        },
      );

      if (!precheck.verified) {
        toast.info("Verify your email first", {
          description: "We'll reopen the code screen for you.",
        });
        router.push(`/verify?email=${encodeURIComponent(precheck.email)}&next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim(),
        password,
      });

      if (!result || result.error) {
        toast.error("Incorrect email or password.");
        return;
      }

      toast.success("Welcome back");
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to see who pays whom, without awkward messages.
        </p>
      </div>

      {verified ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>Email verified. Sign in to open your account.</p>
        </div>
      ) : null}

      {reset ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>Password updated. Use your new password to sign in.</p>
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
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
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link
              href={`/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
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
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full"
          disabled={loading || !email.trim() || !password}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign in
          {!loading ? <ArrowRight className="size-4" /> : null}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to SplitTrack?{" "}
        <Link
          href={nextPath !== "/dashboard" ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"}
          className="font-semibold text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
