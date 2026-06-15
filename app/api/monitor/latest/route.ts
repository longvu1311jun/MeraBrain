import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("chat_logs")
    .select("id,user_id,lark_message_id,question,answer,sources,created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ latest: data ?? null }, { headers: { "Cache-Control": "no-store" } });
}
