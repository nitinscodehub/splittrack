import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage({
  searchParams,
}: {
  searchParams: {
    invite?: string | string[];
    token?: string | string[];
    next?: string | string[];
  };
}) {
  const invite = Array.isArray(searchParams.invite)
    ? searchParams.invite[0]
    : searchParams.invite ?? (Array.isArray(searchParams.token) ? searchParams.token[0] : searchParams.token);
  const nextPath = safeRedirectPath(searchParams.next);
  return <SignupForm inviteToken={invite || undefined} nextPath={nextPath} />;
}
