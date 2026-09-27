// E-mail por SMTP (nodemailer). Opcional: sem SMTP_URL nada é enviado. Nunca lança.
// Funciona com qualquer provedor SMTP (Resend, Postmark, SES, Gmail...): SMTP_URL="smtp://user:pass@host:587".
import nodemailer from "nodemailer";

export function mailConfig() {
  const url = process.env.SMTP_URL;
  return { enabled: !!url, url: url ?? "", from: process.env.MAIL_FROM ?? "ReformAI <no-reply@reformai.local>" };
}

export async function sendMail(to: string | string[], subject: string, text: string): Promise<boolean> {
  const cfg = mailConfig();
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!cfg.enabled || recipients.length === 0) return false;
  try {
    const transport = nodemailer.createTransport({ url: cfg.url, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000 });
    await transport.sendMail({ from: cfg.from, to: recipients, subject, text });
    return true;
  } catch (error) {
    console.error("E-mail: falha ao enviar", { subject, error });
    return false;
  }
}
