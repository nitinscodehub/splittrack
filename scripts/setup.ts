import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

type EnvMap = Record<string, string>;

const ROOT = process.cwd();
const ENV_PATH = `${ROOT}/.env`;
const EXAMPLE_PATH = `${ROOT}/.env.example`;

function parseEnv(content: string): EnvMap {
  const values: EnvMap = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const key = line.slice(0, line.indexOf("=")).trim();
    let value = line.slice(line.indexOf("=") + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function setEnvValue(content: string, key: string, value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const line = `${key}="${escaped}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, () => line);
  return `${content.trimEnd()}\n${line}\n`;
}

function requireValue(label: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function validateDatabaseUrl(value: string): string {
  const url = new URL(requireValue("DATABASE_URL", value));
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
  }
  return value;
}

function validateGmail(value: string): string {
  const email = requireValue("SMTP_USER", value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SMTP_USER must be a valid email address (for example you@gmail.com).");
  }
  return email;
}

function validateAppPassword(value: string): string {
  const password = requireValue("SMTP_APP_PASSWORD", value).replace(/\s+/g, "");
  if (password.length !== 16) {
    throw new Error(
      "SMTP_APP_PASSWORD must be exactly the 16-character Gmail App Password " +
        "(spaces are OK). It is NOT your normal Google login password. " +
        "Create one at https://myaccount.google.com/apppasswords",
    );
  }
  return password;
}

function deriveDirectUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  if (url.hostname.includes("-pooler.")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
  }
  return url.toString();
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: "inherit", env });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
}

async function main(): Promise<void> {
  const rl = createInterface({ input, output });

  try {
    let template: string;
    try {
      template = readFileSync(EXAMPLE_PATH, "utf8");
    } catch {
      throw new Error(`.env.example not found at ${EXAMPLE_PATH}`);
    }

    let existing: EnvMap = {};
    try {
      existing = parseEnv(readFileSync(ENV_PATH, "utf8"));
    } catch {
      // No .env yet — use the example defaults.
    }

    console.log("\nSplitTrack setup\n");
    console.log("I will ask only for your database URL and Gmail SMTP details.");
    console.log("Secrets will be generated automatically.\n");

    const databaseUrl = validateDatabaseUrl(
      await rl.question(
        `DATABASE_URL (Neon pooled URL)${existing.DATABASE_URL ? " [Enter = keep saved]" : ""}: `,
      ) || existing.DATABASE_URL || "",
    );

    const smtpUser = validateGmail(
      await rl.question(`Gmail address (SMTP_USER)${existing.SMTP_USER ? " [Enter = keep saved]" : ""}: `) ||
        existing.SMTP_USER ||
        "",
    );

    const smtpPasswordAnswer = await rl.question(
      "Gmail App Password (16 characters, or press Enter for local OTP test mode): ",
    );
    const useDevOtp = smtpPasswordAnswer.trim() === "";
    const smtpPassword = useDevOtp
      ? "local-dev-placeholder-16"
      : validateAppPassword(smtpPasswordAnswer);

    const directUrl = deriveDirectUrl(databaseUrl);
    const nextAuthUrl = "http://localhost:3000";
    const appUrl = "http://localhost:3000";
    const emailFrom = `SplitTrack <${smtpUser}>`;

    let envFile = template;
    envFile = setEnvValue(envFile, "DATABASE_URL", databaseUrl);
    envFile = setEnvValue(envFile, "DIRECT_URL", directUrl);
    envFile = setEnvValue(envFile, "NEXTAUTH_SECRET", randomBytes(32).toString("base64"));
    envFile = setEnvValue(envFile, "NEXTAUTH_URL", nextAuthUrl);
    envFile = setEnvValue(envFile, "NEXT_PUBLIC_APP_URL", appUrl);
    envFile = setEnvValue(envFile, "SMTP_USER", smtpUser);
    envFile = setEnvValue(envFile, "SMTP_APP_PASSWORD", smtpPassword);
    envFile = setEnvValue(envFile, "EMAIL_FROM", emailFrom);
    envFile = setEnvValue(envFile, "DEV_OTP_MODE", useDevOtp ? "true" : "false");
    envFile = setEnvValue(envFile, "CRON_SECRET", randomBytes(32).toString("hex"));

    console.log("\n1/4 Testing database connection…");
    const prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: ["error"],
    });
    try {
      await prisma.$queryRaw`SELECT 1`;
    } finally {
      await prisma.$disconnect();
    }
    console.log("   Database connection OK.");

    if (useDevOtp) {
      console.log("\n2/4 Local OTP test mode enabled.");
      console.log("   Emails will be skipped; OTPs appear on the verify screen.");
    } else {
      console.log("\n2/4 Sending a test email through Gmail SMTP…");
      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtpUser, pass: smtpPassword },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 20_000,
      });
      await transport.sendMail({
        from: emailFrom,
        to: smtpUser,
        subject: "SplitTrack setup test",
        text: "Your SplitTrack Gmail SMTP setup is working. OTPs and reminders will now be delivered.",
        html:
          '<div style="font-family:system-ui,sans-serif;padding:24px">' +
          "<h2>SplitTrack is ready 🎉</h2>" +
          "<p>Your Gmail SMTP setup is working. OTPs and reminders will now be delivered.</p>" +
          "</div>",
      });
      console.log("   Test email sent to", smtpUser);
    }

    // Only save credentials after the SMTP test succeeds, so a wrong password
    // never gets written into .env.
    writeFileSync(ENV_PATH, envFile, "utf8");
    console.log("   .env saved.");

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DIRECT_URL: directUrl,
    };

    console.log("\n3/4 Applying Prisma migrations…");
    run("npx", ["prisma", "migrate", "deploy"], env);
    console.log("   Migrations applied.");

    const seedAnswer = await rl.question("\n4/4 Add demo data for Aarav/Bhavya/Chirag/Diya? (y/N): ");
    if (/^y(es)?$/i.test(seedAnswer.trim())) {
      run("npx", ["prisma", "db", "seed"], env);
      console.log("   Demo data seeded.");
    }

    console.log("\nSetup complete.\n");
    console.log("Start the app:  npm run dev");
    console.log("Open:           http://localhost:3000");
    console.log("Demo login:     aarav@splittrack.demo / Password123!");
    console.log("\nDeploy later:   ./scripts/deploy.sh\n");
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nSetup failed: ${message}\n`);
  process.exitCode = 1;
});
