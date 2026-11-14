import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-[15px] font-extrabold text-white shadow-soft",
        className,
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
      S
    </span>
  );
}

export function Logo({
  className,
  textClassName,
  href = "/",
  showText = true,
}: {
  className?: string;
  textClassName?: string;
  href?: string;
  showText?: boolean;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="SplitTrack home">
      <BrandMark />
      {showText ? (
        <span className={cn("font-display text-lg font-extrabold tracking-tight", textClassName)}>
          SplitTrack
        </span>
      ) : null}
    </Link>
  );
}
