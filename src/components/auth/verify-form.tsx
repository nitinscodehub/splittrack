"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/auth/otp-input";
import { apiFetch } from "@/lib/client";

export function VerifyForm({
  email,
  nextPath = "/dashboard",
  devMode = false,
  initialDevOtp,
}: {
  email: string;
  nextPath?: string;
  devMode?: boolean;
  initialDevOtp?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialDevOtp ?? "");
  const [devOtp, setDevOtp] = useState(initialDevOtp ?? "");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(devMode ? 0 : 60);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== 6) {
      toast.error("Enter the full 6-digit code.");
      return;
    }
    setVerifying(true);
    try {
      await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      toast.success("Email verified", {
        description: "You can sign in now. Your account is ready.",
      });
      const loginParams = new URLSearchParams({ verified: "1", email });
      if (nextPath !== "/dashboard") loginParams.set("next", nextPath);
      router.push(`/login?${loginParams.toString()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code didn't work.");
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    if (seconds > 0) return;
    setResending(true);
    try {
      const response = await apiFetch<{
        sent: boolean;
        alreadyVerified?: boolean;
        devOtp?: string;
      }>("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email, purpose: "SIGNUP" }),
      });
      if (response.alreadyVerified) {
        toast.success("This email is already verified. Sign in instead.");
        router.push(`/login?email=${encodeURIComponent(email)}`);
        return;
      }
      setSeconds(devMode ? 0 : 60);
      if (response.devOtp) {
        setCode(response.devOtp);
        setDevOtp(response.devOtp);
        toast.success("Local test code ready", {
          description: `Code: ${response.devOtp}. Email delivery is off in local mode.`,
        });
      } else {
        setCode("");
        if (!response.sent) {
          toast.warning("Code generated, but the email did not send", {
            description: "Wait 60 seconds, then tap Resend code. Also check your Spam folder.",
          });
        } else {
          toast.success("New code sent", {
            description: "It expires in 10 minutes. Check Spam if it doesn't arrive.",
          });
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  if (!email) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">Missing email address</h1>
        <p className="text-sm text-muted-foreground">
          Start again from sign up so we know where to send the code.
        </p>
        <Button asChild>
          <Link href="/signup">Back to sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-primary">
          <MailCheck className="size-5" />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {devMode ? "Verify in local mode" : "Check your email"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {devMode ? (
            <>
              Email delivery is skipped for{" "}
              <span className="font-semibold text-foreground">{email}</span> while you test locally.
            </>
          ) : (
            <>
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-foreground">{email}</span>. It expires in 10
              minutes.
            </>
          )}
        </p>
      </div>

      {devMode ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-700 dark:text-amber-300">Local test mode</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Gmail delivery is off. {devOtp ? "Your code is filled in below." : "Tap Resend code to generate one."}
          </p>
          {devOtp ? (
            <p className="mt-2 font-mono text-2xl font-bold tracking-[0.35em] text-foreground">
              {devOtp}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={verify} className="space-y-5">
        <OtpInput value={code} onChange={setCode} disabled={verifying} autoFocus />

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full"
          disabled={verifying || code.length !== 6}
        >
          {verifying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Verify email
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2 text-center text-sm">
        <Button
          type="button"
          variant="ghost"
          onClick={resend}
          disabled={resending || seconds > 0}
          className="text-muted-foreground"
        >
          {resending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Maximum 5 attempts per code. Need a different email?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Start over
          </Link>
        </p>
      </div>

      <Button asChild variant="ghost" className="w-full text-muted-foreground">
        <Link href="/login">
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </Button>
    </div>
  );
}
