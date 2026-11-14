import type { Metadata } from "next";
import { VerifyForm } from "@/components/auth/verify-form";
import { isDevOtpEnabled } from "@/lib/dev";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyPage({
  searchParams,
}: {
  searchParams: {
    email?: string | string[];
    next?: string | string[];
    devOtp?: string | string[];
  };
}) {
  const email = Array.isArray(searchParams.email) ? searchParams.email[0] : searchParams.email;
  const devMode = isDevOtpEnabled();
  const devOtp = devMode
    ? Array.isArray(searchParams.devOtp)
      ? searchParams.devOtp[0]
      : searchParams.devOtp
    : undefined;
  return (
    <VerifyForm
      email={email ?? ""}
      nextPath={safeRedirectPath(searchParams.next)}
      devMode={devMode}
      initialDevOtp={devOtp}
    />
  );
}
