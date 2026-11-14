const BRAND = "SplitTrack";
const APP_TAGLINE = "Shared bills, clear balances.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface LayoutInput {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

function layout(input: LayoutInput): string {
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
          <tr>
            <td style="border-radius:12px;background:#4f46e5;">
              <a href="${input.ctaUrl}" target="_blank" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
                ${escapeHtml(input.ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f1fb;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e1b4b;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f1fb;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px -25px rgba(49,46,129,0.45);">
            <tr>
              <td style="background:linear-gradient(135deg,#4338ca 0%,#7c3aed 55%,#a855f7 100%);padding:26px 32px;">
                <div style="font-size:20px;font-weight:800;letter-spacing:-0.3px;color:#ffffff;">${BRAND}</div>
                <div style="margin-top:4px;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#ddd6fe;">${APP_TAGLINE}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:15px;line-height:1.7;color:#312e81;">
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1e1b4b;">${escapeHtml(input.title)}</h1>
                ${input.bodyHtml}
                ${cta}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid #ede9fe;font-size:12px;line-height:1.6;color:#6b7280;">
                ${input.footerNote ?? `You are receiving this email because you use ${BRAND}.`}
                <div style="margin-top:8px;color:#9ca3af;">Made for friends who split the bill, not the friendship.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function textLayout(title: string, lines: string[], ctaUrl?: string): string {
  return [title, "", ...lines, ctaUrl ? `\nOpen SplitTrack: ${ctaUrl}` : ""].join("\n");
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function otpEmail(input: { name: string; code: string; purpose: "SIGNUP" | "RESET" }): EmailContent {
  const action = input.purpose === "SIGNUP" ? "verify your email" : "reset your password";
  const title = `Your ${BRAND} code`;
  return {
    subject: `${input.code} is your ${BRAND} verification code`,
    html: layout({
      preheader: `Use ${input.code} to ${action}. It expires in 10 minutes.`,
      title,
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(input.name)},</p>
        <p style="margin:0 0 22px;">Use the code below to ${action}. It expires in <strong>10 minutes</strong>.</p>
        <div style="margin:0 0 22px;padding:18px 24px;border-radius:16px;background:#f5f3ff;border:1px solid #ddd6fe;text-align:center;">
          <span style="font-family:'SFMono-Regular',Consolas,monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#4338ca;">${input.code}</span>
        </div>
        <p style="margin:0;color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email. Never share this code with anyone.</p>`,
      footerNote: "This code was requested for your SplitTrack account.",
    }),
    text: textLayout(title, [`Hi ${input.name},`, `Your code to ${action}: ${input.code}`, "It expires in 10 minutes."]),
  };
}

export function inviteEmail(input: { inviterName: string; inviteUrl: string; email?: string }): EmailContent {
  const title = `${input.inviterName} invited you to SplitTrack`;
  return {
    subject: `${input.inviterName} invited you to SplitTrack`,
    html: layout({
      preheader: `${input.inviterName} wants to share bills with you on SplitTrack.`,
      title,
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi${input.email ? ` ${escapeHtml(input.email.split("@")[0] ?? "")}` : ""},</p>
        <p style="margin:0 0 14px;"><strong>${escapeHtml(input.inviterName)}</strong> uses ${BRAND} to keep shared bills clear — no more awkward reminders.</p>
        <p style="margin:0 0 8px;">Join with this private invite link and you'll be connected automatically.</p>`,
      ctaLabel: "Accept invite",
      ctaUrl: input.inviteUrl,
      footerNote: "This invite link is unique to you. It expires in 14 days.",
    }),
    text: textLayout(title, [`${input.inviterName} invited you to SplitTrack.`, "Join here:"], input.inviteUrl),
  };
}

export function friendRequestEmail(input: {
  recipientName: string;
  actorName: string;
  appUrl: string;
}): EmailContent {
  const title = "New friend request";
  return {
    subject: `${input.actorName} wants to connect on SplitTrack`,
    html: layout({
      preheader: `${input.actorName} sent you a friend request.`,
      title,
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(input.recipientName)},</p>
        <p style="margin:0 0 14px;"><strong>${escapeHtml(input.actorName)}</strong> wants to connect with you on ${BRAND} so you can share bills together.</p>`,
      ctaLabel: "Review request",
      ctaUrl: `${input.appUrl}/friends`,
    }),
    text: textLayout(title, [`${input.actorName} sent you a friend request.`], `${input.appUrl}/friends`),
  };
}

export function expenseEmail(input: {
  recipientName: string;
  actorName: string;
  payerName: string;
  description: string;
  totalFormatted: string;
  shareFormatted: string;
  appUrl: string;
}): EmailContent {
  const title = "New bill added";
  return {
    subject: `${input.actorName} added ${input.description} — your share is ${input.shareFormatted}`,
    html: layout({
      preheader: `${input.payerName} paid ${input.totalFormatted} for ${input.description}.`,
      title,
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(input.recipientName)},</p>
        <p style="margin:0 0 16px;"><strong>${escapeHtml(input.payerName)}</strong> paid <strong>${escapeHtml(input.totalFormatted)}</strong> for <strong>${escapeHtml(input.description)}</strong>.</p>
        <div style="padding:16px 18px;border-radius:14px;background:#f5f3ff;border:1px solid #ddd6fe;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#7c3aed;">Your share</div>
          <div style="font-size:26px;font-weight:800;color:#1e1b4b;margin-top:4px;">${escapeHtml(input.shareFormatted)}</div>
        </div>
        <p style="margin:16px 0 0;color:#6b7280;font-size:13px;">Everyone in this bill can see it. Mark a payment whenever you're ready.</p>`,
      ctaLabel: "View bill",
      ctaUrl: `${input.appUrl}/activity`,
    }),
    text: textLayout(
      title,
      [
        `${input.payerName} paid ${input.totalFormatted} for ${input.description}.`,
        `Your share: ${input.shareFormatted}.`,
      ],
      `${input.appUrl}/activity`,
    ),
  };
}

export function settlementEmail(input: {
  recipientName: string;
  actorName: string;
  amountFormatted: string;
  status: "marked" | "confirmed" | "rejected";
  note?: string | null;
  appUrl: string;
}): EmailContent {
  const titles = {
    marked: "Payment marked paid",
    confirmed: "Payment confirmed",
    rejected: "Payment declined",
  } as const;

  const messages = {
    marked: `<strong>${escapeHtml(input.actorName)}</strong> marked a payment of <strong>${escapeHtml(input.amountFormatted)}</strong> to you as paid. Accept it once you've received the money, or reject it if something is wrong.`,
    confirmed: `<strong>${escapeHtml(input.actorName)}</strong> confirmed your payment of <strong>${escapeHtml(input.amountFormatted)}</strong>. Your balance has been updated.`,
    rejected: `<strong>${escapeHtml(input.actorName)}</strong> declined the payment of <strong>${escapeHtml(input.amountFormatted)}</strong>. The balance is unchanged — maybe check the details with them.`,
  } as const;

  return {
    subject: `${titles[input.status]} · ${input.amountFormatted}`,
    html: layout({
      preheader: messages[input.status].replace(/<[^>]+>/g, ""),
      title: titles[input.status],
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(input.recipientName)},</p>
        <p style="margin:0 0 14px;">${messages[input.status]}</p>
        ${
          input.note
            ? `<div style="padding:12px 16px;border-left:3px solid #a855f7;background:#faf5ff;border-radius:8px;color:#4c1d95;font-size:14px;">“${escapeHtml(input.note)}”</div>`
            : ""
        }`,
      ctaLabel: input.status === "marked" ? "Review payment" : "Open SplitTrack",
      ctaUrl: `${input.appUrl}/dues`,
    }),
    text: textLayout(titles[input.status], [messages[input.status].replace(/<[^>]+>/g, "")], `${input.appUrl}/dues`),
  };
}

export interface ReminderRow {
  name: string;
  amountFormatted: string;
  detail?: string;
}

function reminderRows(rows: ReminderRow[]): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border-collapse:separate;border-spacing:0;">
    ${rows
      .map(
        (row, index) => `<tr>
          <td style="padding:12px 0;${index === 0 ? "" : "border-top:1px solid #ede9fe;"}">
            <div style="font-weight:700;color:#1e1b4b;">${escapeHtml(row.name)}</div>
            ${row.detail ? `<div style="font-size:12px;color:#6b7280;">${escapeHtml(row.detail)}</div>` : ""}
          </td>
          <td align="right" style="padding:12px 0;${index === 0 ? "" : "border-top:1px solid #ede9fe;"}font-weight:800;color:#4338ca;white-space:nowrap;">
            ${escapeHtml(row.amountFormatted)}
          </td>
        </tr>`,
      )
      .join("")}
  </table>`;
}

export function dailyDebtorEmail(input: {
  name: string;
  rows: ReminderRow[];
  totalFormatted: string;
  appUrl: string;
  unsubscribeUrl: string;
}): EmailContent {
  const title = "Payments to make";
  return {
    subject: `You have ${input.totalFormatted} to pay`,
    html: layout({
      preheader: `You have to pay ${input.totalFormatted} across ${input.rows.length} friend${input.rows.length === 1 ? "" : "s"}.`,
      title,
      bodyHtml: `
        <p style="margin:0 0 10px;">Hi ${escapeHtml(input.name)},</p>
        <p style="margin:0;">Here's a friendly reminder — this is what you have to pay:</p>
        ${reminderRows(input.rows)}
        <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #ede9fe;font-size:16px;">
          <strong>Total to pay</strong>
          <strong style="color:#4338ca;">${escapeHtml(input.totalFormatted)}</strong>
        </div>
        <p style="margin:18px 0 0;color:#6b7280;font-size:13px;">Already paid someone? Mark it as paid in the app and they can confirm it.</p>`,
      ctaLabel: "View payments",
      ctaUrl: `${input.appUrl}/dues`,
      footerNote: `Don't want daily reminders? <a href="${input.unsubscribeUrl}" style="color:#7c3aed;">Unsubscribe here</a>.`,
    }),
    text: textLayout(
      title,
      [`You have to pay ${input.totalFormatted}.`, ...input.rows.map((row) => `${row.name}: ${row.amountFormatted}`), `Unsubscribe: ${input.unsubscribeUrl}`],
      `${input.appUrl}/dues`,
    ),
  };
}

export function dailyCreditorEmail(input: {
  name: string;
  rows: ReminderRow[];
  totalFormatted: string;
  appUrl: string;
  unsubscribeUrl: string;
}): EmailContent {
  const title = "Payments you will get";
  return {
    subject: `You will get ${input.totalFormatted}`,
    html: layout({
      preheader: `${input.rows.length} friend${input.rows.length === 1 ? "" : "s"} have to pay you ${input.totalFormatted}.`,
      title,
      bodyHtml: `
        <p style="margin:0 0 10px;">Hi ${escapeHtml(input.name)},</p>
        <p style="margin:0;">Here is your daily snapshot of money coming to you:</p>
        ${reminderRows(input.rows)}
        <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px solid #ede9fe;font-size:16px;">
          <strong>Total you will get</strong>
          <strong style="color:#4338ca;">${escapeHtml(input.totalFormatted)}</strong>
        </div>
        <p style="margin:18px 0 0;color:#6b7280;font-size:13px;">If someone paid you outside the app, confirm the payment from the Payments page.</p>`,
      ctaLabel: "Open payments",
      ctaUrl: `${input.appUrl}/dues`,
      footerNote: `You turned on payment summaries. <a href="${input.unsubscribeUrl}" style="color:#7c3aed;">Unsubscribe here</a>.`,
    }),
    text: textLayout(
      title,
      [`You will get ${input.totalFormatted}.`, ...input.rows.map((row) => `${row.name}: ${row.amountFormatted}`), `Unsubscribe: ${input.unsubscribeUrl}`],
      `${input.appUrl}/dues`,
    ),
  };
}

export function manualReminderEmail(input: {
  recipientName: string;
  actorName: string;
  amountFormatted: string;
  appUrl: string;
  unsubscribeUrl: string;
}): EmailContent {
  const title = `${input.actorName} sent you a reminder`;
  return {
    subject: `Reminder: ${input.actorName} is waiting for ${input.amountFormatted}`,
    html: layout({
      preheader: `${input.actorName} is waiting for ${input.amountFormatted}.`,
      title,
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(input.recipientName)},</p>
        <p style="margin:0 0 14px;">A gentle nudge from <strong>${escapeHtml(input.actorName)}</strong>: your share of <strong>${escapeHtml(input.amountFormatted)}</strong> is still marked as unpaid.</p>
        <p style="margin:0;color:#6b7280;font-size:13px;">If you already paid, mark the payment in SplitTrack so they can confirm it.</p>`,
      ctaLabel: "View payments",
      ctaUrl: `${input.appUrl}/dues`,
      footerNote: `Don't want reminder emails? <a href="${input.unsubscribeUrl}" style="color:#7c3aed;">Unsubscribe here</a>.`,
    }),
    text: textLayout(title, [`${input.actorName} reminds you about ${input.amountFormatted}.`, `Unsubscribe: ${input.unsubscribeUrl}`], `${input.appUrl}/dues`),
  };
}

export function accountDeletedEmail(input: { name: string; appUrl: string }): EmailContent {
  return {
    subject: "Your SplitTrack account was deleted",
    html: layout({
      preheader: "Your account and personal data have been removed.",
      title: "Account deleted",
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(input.name)},</p>
        <p style="margin:0 0 14px;">Your SplitTrack account has been deleted and your personal data removed. Shared bill history that belongs to other members was kept for their records.</p>
        <p style="margin:0;color:#6b7280;font-size:13px;">If you didn't do this, contact support immediately.</p>`,
    }),
    text: textLayout("Account deleted", ["Your SplitTrack account has been deleted."]),
  };
}
