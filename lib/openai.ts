import OpenAI from "openai";
import { getEnv } from "./env";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: getEnv().OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function embedText(input: string): Promise<number[]> {
  const env = getEnv();
  const res = await getOpenAIClient().embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input,
  });
  return res.data[0].embedding;
}
