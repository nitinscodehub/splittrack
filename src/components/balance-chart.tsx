import { formatINRCompact } from "@/lib/money";
import type { DashboardChartPoint } from "@/lib/services/activity";

export function BalanceChart({ data }: { data: DashboardChartPoint[] }) {
  const values = data.flatMap((point) => [point.paidPaise, point.yourSharePaise]);
  const max = Math.max(100, ...values);
  const ticks = Array.from({ length: 4 }, (_, index) =>
    Math.round(max * (1 - index / 3)),
  );
  const hasData = values.some((value) => value > 0);

  return (
    <div className="w-full" aria-label="Your spending over the last eight weeks">
      <div className="flex gap-3">
        <div className="flex h-56 w-12 shrink-0 flex-col justify-between pb-0 text-right text-[10px] text-muted-foreground">
          {ticks.map((tick, index) => (
            <span key={`${tick}-${index}`}>{formatINRCompact(tick)}</span>
          ))}
        </div>

        <div className="relative h-56 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((_, index) => (
              <div key={index} className="border-t border-dashed border-border/60" />
            ))}
          </div>

          <div className="relative flex h-full items-end justify-between gap-1.5">
            {data.map((point) => {
              const paidHeight = Math.min(100, (point.paidPaise / max) * 100);
              const shareHeight = Math.min(100, (point.yourSharePaise / max) * 100);

              return (
                <div
                  key={point.label}
                  tabIndex={0}
                  aria-label={`Week of ${point.label}: you paid ${formatINRCompact(point.paidPaise)}, your share ${formatINRCompact(point.yourSharePaise)}`}
                  className="group relative flex h-full flex-1 items-end justify-center gap-1 rounded-t-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div
                    className="w-full max-w-2.5 rounded-t-full bg-gradient-to-t from-indigo-600 to-indigo-400"
                    style={{ height: `${point.paidPaise > 0 ? Math.max(paidHeight, 2) : 0}%` }}
                  />
                  <div
                    className="w-full max-w-2.5 rounded-t-full bg-gradient-to-t from-fuchsia-600 to-fuchsia-400"
                    style={{ height: `${point.yourSharePaise > 0 ? Math.max(shareHeight, 2) : 0}%` }}
                  />

                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[10rem] -translate-x-1/2 rounded-xl border border-border/70 bg-popover px-2.5 py-1.5 text-left text-[10px] shadow-card group-hover:block group-focus:block">
                    <div className="font-semibold text-foreground">Week of {point.label}</div>
                    <div className="mt-0.5 text-muted-foreground">
                      You paid {formatINRCompact(point.paidPaise)}
                    </div>
                    <div className="text-muted-foreground">
                      Your share {formatINRCompact(point.yourSharePaise)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!hasData ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-full bg-background/85 px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
                No shared bills in the last eight weeks
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex gap-3">
        <div className="w-12 shrink-0" />
        <div className="flex flex-1 justify-between gap-1.5 text-center text-[10px] text-muted-foreground">
          {data.map((point) => (
            <span key={point.label} className="flex-1">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
