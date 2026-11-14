import nodemailer, { type Transporter } from "nodemailer";
import { validateEnv } from "@/lib/env";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let smtpTransport: Transporter | null = null;

function getSmtp(): Transporter {
  if (smtpTransport) return smtpTransport;

  const env = validateEnv();
  smtpTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_APP_PASSWORD.replace(/\s+/g, ""),
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

  return smtpTransport;
}

/**
 * Sends transactional email through Gmail SMTP using an App Password.
 * Failures are logged and returned as false so they never roll back the
 * database mutation that triggered the email.
 */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  try {
    const env = validateEnv();
    await getSmtp().sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return true;
  } catch (error) {
    console.error(
      "[email] Gmail SMTP failed. Check SMTP_USER, SMTP_APP_PASSWORD and that " +
        "2-Step Verification + App Password are enabled on the Gmail account.",
      error,
    );
    return false;
  }
}
