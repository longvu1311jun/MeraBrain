import { NextRequest, NextResponse } from "next/server";
import { getWikiEnv } from "@/lib/env";
import { syncWikiFolder } from "@/lib/wiki-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
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

    console.log("[admin/sync-lark-drive] sync started", {
      folderToken: env.folderToken
    });

    const result = await syncWikiFolder(env.folderToken);
    console.log("[admin/sync-lark-drive] sync finished", result);

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[admin/sync-lark-drive] sync failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "sync_failed",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
