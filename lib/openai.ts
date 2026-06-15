import OpenAI from "openai";
import { env } from "./env";

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export async function embedText(input: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input,
  });
  return res.data[0].embedding;
}
