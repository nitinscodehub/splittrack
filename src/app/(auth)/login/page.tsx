import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: {
    email?: string | string[];
    next?: string | string[];
    verified?: string | string[];
    reset?: string | string[];
  };
}) {
  const email = Array.isArray(searchParams.email) ? searchParams.email[0] : searchParams.email;
  const nextPath = safeRedirectPath(searchParams.next);
  return (
    <LoginForm
      initialEmail={email ?? ""}
      nextPath={nextPath}
      verified={searchParams.verified === "1"}
      reset={searchParams.reset === "1"}
    />
  );
}
