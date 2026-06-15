import { parseLarkEventPayload, type LarkEventPayload } from "@/lib/lark-events";
import { replyTextToMessage } from "@/lib/lark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    endpoint: "lark-events",
    method: "POST"
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let payload: LarkEventPayload;
  try {
    payload = parseLarkEventPayload(rawBody, request.headers);
  } catch (error) {
    console.error("[lark/events] invalid payload", error);
    return Response.json({ ok: false, error: "invalid_lark_event" }, { status: 400 });
  }

  if (payload.type === "url_verification" && payload.challenge) {
    return Response.json({ challenge: payload.challenge });
  }

  const eventType = payload.header?.event_type;
  if (eventType !== "im.message.receive_v1") {
    return Response.json({ ok: true, ignored: true, eventType });
  }

  const message = payload.event?.message;
  if (!message?.message_id) {
    return Response.json({ ok: true, ignored: true, reason: "missing_message_id" });
  }

  try {
    const reply = buildEchoReply(payload);
    await replyTextToMessage(message.message_id, reply, {
      replyInThread: Boolean(message.thread_id)
    });

    return Response.json({ ok: true, replied: true });
  } catch (error) {
    console.error("[lark/events] reply failed", error);
    return Response.json({ ok: false, error: "reply_failed" }, { status: 500 });
  }
}

function buildEchoReply(payload: LarkEventPayload) {
  const message = payload.event?.message;
  const messageType = message?.message_type ?? "unknown";

  if (messageType !== "text") {
    return `Mình đã nhận tin nhắn loại "${messageType}". Hiện tại bot test chỉ echo tin nhắn text.`;
  }

  const text = getTextContent(message?.content);
  const cleanText = removeMentionKeys(text, message?.mentions).trim();

  return cleanText
    ? `Mình đã nhận được tin nhắn của bạn: ${cleanText}`
    : "Mình đã nhận được tin nhắn text của bạn.";
}

function getTextContent(content: string | undefined) {
  if (!content) {
    return "";
  }

  try {
    const parsed = JSON.parse(content) as { text?: unknown };
    return typeof parsed.text === "string" ? parsed.text : content;
  } catch {
    return content;
  }
}

function removeMentionKeys(
  text: string,
  mentions: Array<{ key?: string }> | undefined
) {
  if (!mentions?.length) {
    return text;
  }

  return mentions.reduce((current, mention) => {
    if (!mention.key) {
      return current;
    }

    return current.replaceAll(mention.key, "").trim();
  }, text);
}
