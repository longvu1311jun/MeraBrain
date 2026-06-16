import { NextRequest, NextResponse } from "next/server";
import { parseLarkEventPayload } from "@/lib/lark-events";
import { replyTextToMessage } from "@/lib/lark";
import { generateBotReply } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "lark-events", method: "POST" });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let payload;
  try {
    payload = parseLarkEventPayload(rawBody, request.headers);
  } catch (error) {
    console.error("[lark/events] invalid payload", error);
    return NextResponse.json({ ok: false, error: "invalid_lark_event" }, { status: 400 });
  }

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const eventType = payload.header?.event_type;
  if (eventType !== "im.message.receive_v1") {
    return NextResponse.json({ ok: true, ignored: true, eventType });
  }

  const message = payload.event?.message;
  if (!message?.message_id) {
    return NextResponse.json({ ok: true, ignored: true, reason: "missing_message_id" });
  }

  const senderType = payload.event?.sender?.sender_type;
  if (senderType === "bot") {
    return NextResponse.json({ ok: true, ignored: true, reason: "bot_message" });
  }

  const userText = extractMessageText(message.content, message.mentions);
  if (!userText) {
    return NextResponse.json({ ok: true, ignored: true, reason: "empty_text" });
  }

  try {
    const reply = await generateBotReply(userText);
    await replyTextToMessage(message.message_id, reply, {
      replyInThread: Boolean(message.thread_id)
    });

    return NextResponse.json({ ok: true, replied: true });
  } catch (error) {
    console.error("[lark/events] ai reply failed", error);
    return NextResponse.json({ ok: false, error: "reply_failed" }, { status: 500 });
  }
}

function extractMessageText(
  content: string | undefined,
  mentions: Array<{ key?: string }> | undefined
) {
  if (!content) {
    return "";
  }

  let text = content;
  try {
    const parsed = JSON.parse(content) as { text?: unknown };
    if (typeof parsed.text === "string") {
      text = parsed.text;
    }
  } catch {
    text = content;
  }

  if (!mentions?.length) {
    return text.trim();
  }

  return mentions.reduce((current, mention) => {
    if (!mention.key) {
      return current;
    }

    return current.replaceAll(mention.key, "").trim();
  }, text).trim();
}
