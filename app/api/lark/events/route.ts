import { NextRequest, NextResponse } from "next/server";
import { env } from "../../../../lib/env";
import { parseLarkTextMessage, sendTextMessage } from "../../../../lib/lark";
import { answerWithWiki } from "../../../../lib/rag";
import { getSupabaseClient } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();
  const body = await req.json();

  // Lark URL verification challenge
  if (body?.type === "url_verification") {
    if (env.LARK_VERIFICATION_TOKEN && body.token !== env.LARK_VERIFICATION_TOKEN) {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }
    return NextResponse.json({ challenge: body.challenge });
  }

  // Event callback token check, when not using encrypted callback.
  if (env.LARK_VERIFICATION_TOKEN && body?.token && body.token !== env.LARK_VERIFICATION_TOKEN) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  const { chatId, text, userId, messageId } = parseLarkTextMessage(body);
  if (!chatId || !text) return NextResponse.json({ ok: true, ignored: true });

  try {
    await sendTextMessage(chatId, "Mình đã nhận câu hỏi, đang tìm trong Wiki...");
    const { answer, sources } = await answerWithWiki(text);
    await sendTextMessage(chatId, answer.slice(0, 4500));

    await supabase.from("chat_logs").insert({
      user_id: userId ?? null,
      lark_message_id: messageId ?? null,
      question: text,
      answer,
      sources,
    });
  } catch (err: any) {
    console.error(err);
    await sendTextMessage(chatId, `Có lỗi khi xử lý: ${err.message ?? String(err)}`);
  }

  return NextResponse.json({ ok: true });
}
