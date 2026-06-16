import { NextRequest, NextResponse } from "next/server";
import { getWikiEnv } from "@/lib/env";
import { syncWikiFolder } from "@/lib/wiki-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const env = getWikiEnv();
  if (!env?.folderToken) {
    return NextResponse.json(
      { ok: false, error: "missing_lark_wiki_folder_token" },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { secret?: string };
  if (env.syncSecret && body.secret !== env.syncSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!env.syncSecret) {
    return NextResponse.json(
      { ok: false, error: "missing_lark_wiki_sync_secret" },
      { status: 400 }
    );
  }

  const result = await syncWikiFolder(env.folderToken);
  return NextResponse.json({ ok: true, result });
}
