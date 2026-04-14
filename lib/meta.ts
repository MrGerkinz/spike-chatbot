import crypto from "crypto";

const GRAPH_API_VERSION = "v21.0";

export async function sendMessage(
  recipientId: string,
  text: string
): Promise<void> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN is not set");

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
        access_token: token,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Meta API error:", error);
    throw new Error(`Failed to send message: ${response.status}`);
  }
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;

  const expectedSig =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(body).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

interface MessagingEvent {
  sender: { id: string };
  message?: { text?: string };
}

interface WebhookEntry {
  messaging?: MessagingEvent[];
}

export interface IncomingMessage {
  senderId: string;
  text: string;
  platform: "messenger" | "instagram";
}

export function extractMessages(body: {
  object: string;
  entry?: WebhookEntry[];
}): IncomingMessage[] {
  const messages: IncomingMessage[] = [];

  const platform =
    body.object === "instagram" ? "instagram" : "messenger";

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (event.message?.text) {
        messages.push({
          senderId: event.sender.id,
          text: event.message.text,
          platform,
        });
      }
    }
  }

  return messages;
}
