import { NextRequest, NextResponse } from "next/server";
import { env } from "../../../../lib/env";
import { chunkText } from "../../../../lib/chunk";
import { listFolderChildren, getDocxRawContent } from "../../../../lib/lark";
import { embedText } from "../../../../lib/openai";
import { getSupabaseClient } from "../../../../lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = getSupabaseClient();

  if (env.SYNC_SECRET) {
    const secret = req.headers.get("x-sync-secret");
    if (secret !== env.SYNC_SECRET) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const folderToken = body.folderToken ?? env.LARK_WIKI_FOLDER_TOKEN;
  if (!folderToken) return NextResponse.json({ error: "folderToken is required" }, { status: 400 });

  const files = await listFolderChildren(folderToken);
  let documents = 0;
  let chunks = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const file of files) {
    try {
      // MVP supports docx-like documents. Extend here for Sheets, PDFs, Bitable, etc.
      const content = await getDocxRawContent(file.token);
      if (!content.trim()) continue;

      const { data: doc, error: docError } = await supabase
        .from("wiki_documents")
        .upsert({ lark_token: file.token, title: file.name, url: file.url ?? null, file_type: file.type, raw_text: content }, { onConflict: "lark_token" })
        .select("id")
        .single();
      if (docError) throw docError;

      await supabase.from("wiki_chunks").delete().eq("document_id", doc.id);
      const parts = chunkText(content);
      for (let i = 0; i < parts.length; i++) {
        const embedding = await embedText(parts[i]);
        const { error } = await supabase.from("wiki_chunks").insert({
          document_id: doc.id,
          chunk_index: i,
          chunk_text: parts[i],
          embedding,
          metadata: { lark_token: file.token, title: file.name, url: file.url ?? null },
        });
        if (error) throw error;
        chunks++;
      }
      documents++;
    } catch (err: any) {
      errors.push({ file: file.name, error: err.message ?? String(err) });
    }
  }

  return NextResponse.json({ ok: true, scanned: files.length, documents, chunks, errors });
}
