/**
 * Local-development OTP helper.
 *
 * DEV_OTP_MODE=true is ignored in production builds, so OTPs can never be
 * exposed on a deployed Vercel app. It only makes local testing painless when
 * a Gmail App Password has not been configured yet.
 */
export function isDevOtpEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_OTP_MODE === "true";
}

export function hasUsableSmtp(): boolean {
  const user = (process.env.SMTP_USER ?? "").trim();
  const password = (process.env.SMTP_APP_PASSWORD ?? "").replace(/\s+/g, "");
  return (
    user.length > 0 &&
    !user.endsWith("@splittrack.local") &&
    password.length === 16 &&
    password !== "local-dev-placeholder-16"
  );
}

export function shouldSkipSmtp(): boolean {
  return isDevOtpEnabled() && !hasUsableSmtp();
}
