"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINRCompact } from "@/lib/money";
import type { DashboardChartPoint } from "@/lib/services/activity";

export function BalanceChart({ data }: { data: DashboardChartPoint[] }) {
  return (
    <div className="h-64 w-full sm:h-72" aria-label="Your spending over the last eight weeks">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="shareFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d946ef" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="rgba(148, 163, 184, 0.22)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(value: number) => formatINRCompact(value)}
          />
          <Tooltip
            cursor={{ stroke: "#818cf8", strokeOpacity: 0.25 }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(148, 163, 184, 0.25)",
              background: "#171525",
              color: "#f1f0ff",
              fontSize: 12,
              boxShadow: "0 18px 40px -20px rgba(15, 23, 42, 0.45)",
            }}
            labelFormatter={(label) => `Week of ${String(label)}`}
            formatter={(value, name) => [
              formatINRCompact(typeof value === "number" ? value : Number(value)),
              name === "paidPaise" ? "You paid" : "Your share",
            ]}
          />
          <Area
            type="monotone"
            dataKey="paidPaise"
            stroke="#6366f1"
            strokeWidth={2.4}
            fill="url(#paidFill)"
            name="paidPaise"
          />
          <Area
            type="monotone"
            dataKey="yourSharePaise"
            stroke="#d946ef"
            strokeWidth={2}
            fill="url(#shareFill)"
            name="yourSharePaise"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
