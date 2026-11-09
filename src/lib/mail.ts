import nodemailer from "nodemailer";
import { isProd, site } from "./config";

export async function sendPasswordReset(to: string, link: string) {
  if (!process.env.SMTP_HOST) {
    if (isProd) console.error("SMTP is not configured, so the password reset email was not sent.");
    else console.log(`[dev] Password reset link for ${to}: ${link}`);
    return;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Reset your ${site.name} password`,
    text: `Use this link to reset your password. It expires in 1 hour.\n\n${link}\n\nIf you did not ask for this, ignore this email.`,
  });
}
