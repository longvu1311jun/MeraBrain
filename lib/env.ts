import { z } from "zod";

const schema = z.object({
  LARK_APP_ID: z.string().min(1),
  LARK_APP_SECRET: z.string().min(1),
  LARK_VERIFICATION_TOKEN: z.string().optional().default(""),
  LARK_WIKI_FOLDER_TOKEN: z.string().optional().default(""),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().optional().default("gpt-4.1-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().optional().default("text-embedding-3-small"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SYNC_SECRET: z.string().optional().default(""),
});

export const env = schema.parse(process.env);
