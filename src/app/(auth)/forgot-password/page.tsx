import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forgot-form";
import { isDevOtpEnabled } from "@/lib/dev";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { email?: string | string[] };
}) {
  const email = Array.isArray(searchParams.email) ? searchParams.email[0] : searchParams.email;
  return <ForgotForm initialEmail={email ?? ""} devMode={isDevOtpEnabled()} />;
}
