import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  DIRECT_URL: z
    .string()
    .min(1, "DIRECT_URL is required")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DIRECT_URL must be a PostgreSQL connection string",
    ),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters (run npm run setup)"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  SMTP_USER: z.string().email("SMTP_USER must be a valid Gmail address"),
  SMTP_APP_PASSWORD: z
    .string()
    .min(16, "SMTP_APP_PASSWORD must be a 16-character Gmail App Password"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),
  DEV_OTP_MODE: z.enum(["true", "false"]).optional(),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | null = null;

/**
 * Validates the server environment once and returns typed values.
 * Throws a human-readable error that names every invalid/missing variable.
 */
export function validateEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "ENV"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `[SplitTrack] Invalid environment configuration:\n${details}\n\n` +
        `Run "npm run setup" to create .env automatically, or fix the values in .env.`,
    );
  }

  cached = parsed.data;
  return cached;
}
