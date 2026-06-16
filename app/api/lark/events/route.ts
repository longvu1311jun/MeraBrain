import { NextRequest, NextResponse } from "next/server";
import { parseLarkEventPayload } from "@/lib/lark-events";
import { replyTextToMessage } from "@/lib/lark";
import { generateBotReply } from "@/lib/gemini";
import { insertChatLog } from "@/lib/chat-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const processedKeys = globalThis as typeof globalThis & {
  __larkProcessedKeys?: Map<string, number>;
};

const recentEventKeys = processedKeys.__larkProcessedKeys ?? new Map<string, number>();
processedKeys.__larkProcessedKeys = recentEventKeys;
const PROCESSED_TTL_MS = 10 * 60 * 1000;

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

  console.log("[lark/events] received message", {
    eventId: payload.header?.event_id,
    messageId: message.message_id,
    threadId: message.thread_id ?? null,
    senderType
  });

  if (isDuplicatePayload(payload.header?.event_id, message.message_id)) {
    console.log("[lark/events] duplicate payload skipped", {
      eventId: payload.header?.event_id,
      messageId: message.message_id
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_event" });
  }

  const userText = extractMessageText(message.content, message.mentions);
  if (!userText) {
    return NextResponse.json({ ok: true, ignored: true, reason: "empty_text" });
  }

  try {
    const reply = await generateBotReply(userText);
    console.log("[lark/events] generated reply", {
      eventId: payload.header?.event_id,
      messageId: message.message_id,
      replyLength: reply.length
    });
    await replyTextToMessage(message.message_id, reply, {
      replyInThread: Boolean(message.thread_id)
    });

    try {
      const senderId =
        payload.event?.sender?.sender_id?.open_id ??
        payload.event?.sender?.sender_id?.user_id ??
        payload.event?.sender?.sender_id?.union_id ??
        null;

      await insertChatLog({
        userId: senderId,
        larkMessageId: message.message_id,
        question: userText,
        answer: reply,
        sources: null
      });
    } catch (logError) {
      console.error("[lark/events] chat log insert failed", logError);
    }

    return NextResponse.json({ ok: true, replied: true });
  } catch (error) {
    console.error("[lark/events] ai reply failed", error);
    return NextResponse.json({ ok: false, error: "reply_failed" }, { status: 500 });
  }
}

function isDuplicatePayload(eventId: string | undefined, messageId: string) {
  cleanupRecentEventKeys();

  const now = Date.now();
  const keys = [eventId, messageId].filter(Boolean) as string[];

  for (const key of keys) {
    if (recentEventKeys.has(key)) {
      return true;
    }
  }

  for (const key of keys) {
    recentEventKeys.set(key, now);
  }

  return false;
}

function cleanupRecentEventKeys() {
  const cutoff = Date.now() - PROCESSED_TTL_MS;

  for (const [key, timestamp] of recentEventKeys.entries()) {
    if (timestamp < cutoff) {
      recentEventKeys.delete(key);
    }
  }

  if (recentEventKeys.size > 1000) {
    const entries = [...recentEventKeys.entries()].sort((a, b) => a[1] - b[1]);
    recentEventKeys.clear();
    for (const [key, timestamp] of entries.slice(-500)) {
      recentEventKeys.set(key, timestamp);
    }
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
