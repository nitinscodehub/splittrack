"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LandingHeaderActions() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  if (signedIn) {
    return (
      <Button asChild>
        <Link href="/dashboard">
          Open app
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" className="hidden sm:inline-flex">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/signup">
          Get started
          <ArrowRight className="size-4" />
        </Link>
      </Button>
    </>
  );
}

export function LandingHeroCta() {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  return (
    <Button asChild size="lg" className="h-12 px-6">
      <Link href={signedIn ? "/dashboard" : "/signup"}>
        {signedIn ? "Open app" : "Start free"}
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
}
