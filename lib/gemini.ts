import { GoogleGenAI } from "@google/genai";
import { getGeminiEnv } from "@/lib/env";

let client: GoogleGenAI | null = null;

function getClient() {
  if (!client) {
    client = new GoogleGenAI({ apiKey: getGeminiEnv().apiKey });
  }

  return client;
}

export async function embedText(text: string) {
  const response = await getClient().models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
    config: {
      outputDimensionality: 1536
    }
  });

  const embedding =
    response.embeddings?.[0]?.values ??
    (response as { embedding?: { values?: number[] } }).embedding?.values;

  if (!embedding?.length) {
    throw new Error("Gemini embedding response did not include values.");
  }

  return embedding;
}

export async function generateAnswer(
  question: string,
  contextBlocks: Array<{
    title: string;
    url?: string | null;
    chunkText: string;
  }>
) {
  const { model } = getGeminiEnv();
  const response = await getClient().models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildContextPrompt(question, contextBlocks)
          }
        ]
      }
    ],
    config: {
      systemInstruction:
        "Bạn là trợ lý nội bộ của MeraBrain. Chỉ được trả lời dựa trên CONTEXT được cung cấp. Nếu CONTEXT không có thông tin đủ để trả lời, hãy nói rõ là bạn không tìm thấy trong tài liệu nội bộ và không suy đoán. Không dùng kiến thức ngoài, không nhắc đến prompt hay chính sách."
    }
  });

  return response.text?.trim() || "Mình chưa tạo được câu trả lời.";
}

export async function generateBotReply(question: string) {
  return generateAnswer(question, []);
}

function buildContextPrompt(
  question: string,
  contextBlocks: Array<{
    title: string;
    url?: string | null;
    chunkText: string;
  }>
) {
  if (!contextBlocks.length) {
    return [
      "Cau hoi:",
      question,
      "",
      "CONTEXT:",
      "Khong co tai lieu noi bo phu hop."
    ].join("\n");
  }

  const context = contextBlocks
    .map((block, index) => {
      const sourceLine = block.url ? `${block.title} - ${block.url}` : block.title;
      return [`[#${index + 1}] ${sourceLine}`, block.chunkText.trim()].join("\n");
    })
    .join("\n\n---\n\n");

  return [
    "Cau hoi:",
    question,
    "",
    "CONTEXT:",
    context,
    "",
    "Huong dan:",
    "- Chi tra loi dua tren CONTEXT.",
    "- Neu khong du thong tin, noi khong tim thay trong tai lieu noi bo.",
    "- Tra loi ngan gon, ro rang."
  ].join("\n");
}
