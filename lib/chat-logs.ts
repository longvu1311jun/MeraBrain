import { getSupabaseEnv } from "@/lib/env";

type ChatLogInput = {
  userId?: string | null;
  larkMessageId: string;
  question: string;
  answer: string;
  sources?: unknown;
};

export async function insertChatLog(input: ChatLogInput) {
  const env = getSupabaseEnv();
  if (!env) {
    console.warn("[chat-logs] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing; skip insert.");
    return { skipped: true as const };
  }

  const response = await fetch(`${env.url}/rest/v1/chat_logs`, {
    method: "POST",
    headers: {
      apikey: env.serviceRoleKey,
      Authorization: `Bearer ${env.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      user_id: input.userId ?? null,
      lark_message_id: input.larkMessageId,
      question: input.question,
      answer: input.answer,
      sources: input.sources ?? null
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to insert chat log: ${response.status} ${errorText}`);
  }

  return { skipped: false as const };
}
