import { Resend } from "resend";

export async function notifyAdmin(
  message: string,
  senderId: string,
  platform: "messenger" | "instagram"
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!apiKey || !adminEmail) {
    console.warn(
      "Resend API key or admin email not configured, skipping notification"
    );
    return;
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Volleyball Bot <onboarding@resend.dev>",
    to: adminEmail,
    subject: `Unanswered inquiry from ${platform}`,
    html: `
      <h2>New unanswered inquiry</h2>
      <p><strong>Platform:</strong> ${platform}</p>
      <p><strong>Sender ID:</strong> ${senderId}</p>
      <p><strong>Message:</strong></p>
      <blockquote>${escapeHtml(message)}</blockquote>
      <p>Log in to your <a href="${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/admin">admin dashboard</a> to review.</p>
    `,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
