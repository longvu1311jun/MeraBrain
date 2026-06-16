import { embedText, generateAnswer } from "@/lib/gemini";
import { matchWikiChunks, type WikiChunkMatch } from "@/lib/supabase-rest";

export type WikiAnswerResult = {
  answer: string;
  matches: WikiChunkMatch[];
  usedContext: boolean;
};

export async function answerQuestionFromWiki(question: string): Promise<WikiAnswerResult> {
  try {
    const queryEmbedding = await embedText(question);
    const matches = await matchWikiChunks({
      queryEmbedding,
      matchThreshold: 0.56,
      matchCount: 5
    });

    const topMatches = matches.filter((match) => match.similarity >= 0.56);
    if (!topMatches.length) {
      return {
        answer:
          "Mình không tìm thấy thông tin liên quan trong tài liệu nội bộ của MeraBrain.",
        matches: [],
        usedContext: false
      };
    }

    const answer = await generateAnswer(
      question,
      topMatches.map((match) => ({
        title: match.title,
        url: match.url,
        chunkText: match.chunk_text
      }))
    );

    return {
      answer,
      matches: topMatches,
      usedContext: true
    };
  } catch (error) {
    console.error("[wiki-answer] failed to answer from wiki", error);
    return {
      answer:
        "Mình chưa truy cập được kho tài liệu nội bộ lúc này. Hãy thử lại sau khi đồng bộ xong.",
      matches: [],
      usedContext: false
    };
  }
}
