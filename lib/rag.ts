import { env } from "./env";
import { openai, embedText } from "./openai";
import { supabase } from "./supabase";

export async function answerWithWiki(question: string) {
  const embedding = await embedText(question);
  const { data: matches, error } = await supabase.rpc("match_wiki_chunks", {
    query_embedding: embedding,
    match_count: 6,
    match_threshold: 0.25,
  });
  if (error) throw error;

  const sources = (matches ?? []).map((m: any, i: number) =>
    `[${i + 1}] ${m.title ?? "Không rõ tài liệu"}\n${m.chunk_text}`
  );

  if (sources.length === 0) {
    return { answer: "Mình chưa tìm thấy dữ liệu phù hợp trong Wiki. Bạn thử hỏi cụ thể hơn hoặc sync lại Wiki nhé.", sources: [] };
  }

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: "Bạn là trợ lý nội bộ. Chỉ trả lời dựa trên CONTEXT. Nếu thiếu dữ liệu, nói rõ là chưa đủ thông tin. Trả lời tiếng Việt, ngắn gọn, có mục Nguồn." },
      { role: "user", content: `CÂU HỎI:\n${question}\n\nCONTEXT:\n${sources.join("\n\n---\n\n")}` },
    ],
  });

  const answer = completion.choices[0]?.message?.content ?? "Không tạo được câu trả lời.";
  return { answer, sources: matches ?? [] };
}
