import { getGeminiEnvStatus, getLarkEnvStatus, getSupabaseEnvStatus } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "mera-lark-ai-bot",
    lark: getLarkEnvStatus(),
    gemini: getGeminiEnvStatus(),
    supabase: getSupabaseEnvStatus()
  });
}
