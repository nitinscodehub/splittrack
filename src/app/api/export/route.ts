import { withApi } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { getActivityFeed } from "@/lib/services/activity";
import { formatINR } from "@/lib/money";
import { toCsv } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return withApi(async () => {
    const user = await requireApiUser();
    const feed = await getActivityFeed(user.id);

    const rows: Array<Array<string | number | null | undefined>> = [
      ["Type", "Date", "Description", "Category", "Group", "From", "To", "Amount (INR)", "Status"],
    ];

    for (const expense of feed.expenses) {
      rows.push([
        "Bill",
        expense.date.slice(0, 10),
        expense.description,
        expense.category ?? "",
        expense.groupName ?? "",
        expense.payer.name,
        expense.shares.map((share) => `${share.user.name} (${formatINR(share.sharePaise)})`).join(" | "),
        formatINR(expense.totalPaise),
        expense.deletedAt ? "Deleted" : "Active",
      ]);
    }

    for (const settlement of feed.settlements) {
      rows.push([
        "Payment",
        settlement.createdAt.slice(0, 10),
        settlement.note ?? "Payment",
        "",
        "",
        settlement.from.name,
        settlement.to.name,
        formatINR(settlement.amountPaise),
        settlement.status === "PENDING"
          ? "Waiting"
          : settlement.status === "CONFIRMED"
            ? "Confirmed"
            : "Declined",
      ]);
    }

    const csv = `\uFEFF${toCsv(rows)}`;
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="splittrack-history-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
