import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

interface SendPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, SMTP_PASS must be set in .env.local");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, from, replyTo } = (await request.json()) as SendPayload;

    if (!to || !subject || !body) {
      return Response.json(
        { error: "to, subject, body are required" },
        { status: 400 }
      );
    }

    const transport = getTransport();
    const sender = from || process.env.SMTP_FROM || process.env.SMTP_USER!;

    const info = await transport.sendMail({
      from: sender,
      to,
      replyTo: replyTo || sender,
      subject,
      text: body,
    });

    return Response.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
