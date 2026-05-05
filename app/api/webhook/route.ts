import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { extractMessages, sendMessage, verifyWebhookSignature } from "@/lib/meta";
import { logUnanswered } from "@/lib/faq";
import { composeReply } from "@/lib/reply";
import { notifyAdmin } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  if (process.env.META_APP_SECRET && !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  if (body.object !== "page" && body.object !== "instagram") {
    return NextResponse.json({ error: "Unsupported object" }, { status: 404 });
  }

  const messages = extractMessages(body);

  after(async () => {
    for (const msg of messages) {
      try {
        await handleMessage(msg.senderId, msg.text, msg.platform);
      } catch (err) {
        console.error("Error handling message:", err);
      }
    }
  });

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

async function handleMessage(
  senderId: string,
  text: string,
  platform: "messenger" | "instagram"
) {
  const result = await composeReply(text);
  await sendMessage(senderId, result.reply);

  if (result.matchPath === "fallback") {
    await logUnanswered({ senderId, platform, message: text });
    await notifyAdmin(text, senderId, platform).catch((err) =>
      console.error("Failed to notify admin:", err)
    );
  }
}
