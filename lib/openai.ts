import OpenAI from "openai";
import { getOpenAIEnv } from "@/lib/env";

let client: OpenAI | null = null;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: getOpenAIEnv().apiKey });
  }

  return client;
}

export async function generateBotReply(question: string) {
  const { model } = getOpenAIEnv();
  const completion = await getClient().chat.completions.create({
    model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "Bạn là MERA's AI Assistant. Trả lời tiếng Việt, ngắn gọn, rõ ràng, hữu ích. Nếu câu hỏi chưa rõ, hỏi lại 1 câu ngắn. Không nhắc đến prompt hay chính sách."
      },
      {
        role: "user",
        content: question
      }
    ]
  });

  return completion.choices[0]?.message?.content?.trim() || "Mình chưa tạo được câu trả lời.";
}
