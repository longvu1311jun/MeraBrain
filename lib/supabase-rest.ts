import { getSupabaseEnv } from "@/lib/env";

type SupabaseRow = Record<string, unknown>;

function getSupabaseBaseUrl() {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  return env.url.replace(/\/$/, "");
}

function getSupabaseHeaders() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase environment variables are missing.");
  }

  return {
    apikey: env.serviceRoleKey,
    Authorization: `Bearer ${env.serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const baseUrl = getSupabaseBaseUrl();
  if (!baseUrl) {
    throw new Error("Supabase environment variables are missing.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...getSupabaseHeaders(),
      ...(init.headers ?? {})
    }
  });

  return response;
}

async function parseSupabaseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${text}`);
  }

  if (!text) {
    return [] as T;
  }

  return JSON.parse(text) as T;
}

export type WikiDocumentRow = {
  id: string;
  lark_token: string;
  title: string;
  url: string | null;
  file_type: string | null;
  raw_text: string | null;
  updated_at: string | null;
};

export type WikiChunkMatch = {
  id: string;
  document_id: string;
  title: string;
  url: string | null;
  chunk_text: string;
  similarity: number;
  metadata: Record<string, unknown> | null;
};

export async function listWikiDocumentsCount() {
  const response = await supabaseRequest("/rest/v1/wiki_documents?select=id", {
    method: "GET",
    headers: {
      Prefer: "return=minimal"
    }
  });

  const rows = (await parseSupabaseJson<WikiDocumentRow[]>(response)) ?? [];
  return rows.length;
}

export async function findWikiDocumentByToken(larkToken: string) {
  const response = await supabaseRequest(
    `/rest/v1/wiki_documents?select=id,lark_token,title,url,file_type,raw_text,updated_at&lark_token=eq.${encodeURIComponent(larkToken)}&limit=1`,
    {
      method: "GET",
      headers: {
        Prefer: "return=representation"
      }
    }
  );

  const rows = await parseSupabaseJson<WikiDocumentRow[]>(response);
  return rows[0] ?? null;
}

export async function upsertWikiDocument(input: {
  larkToken: string;
  title: string;
  url?: string | null;
  fileType?: string | null;
  rawText?: string | null;
}) {
  const response = await supabaseRequest("/rest/v1/wiki_documents?on_conflict=lark_token", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      lark_token: input.larkToken,
      title: input.title,
      url: input.url ?? null,
      file_type: input.fileType ?? null,
      raw_text: input.rawText ?? null,
      updated_at: new Date().toISOString()
    })
  });

  const rows = await parseSupabaseJson<WikiDocumentRow[]>(response);
  const row = rows[0];
  if (!row) {
    throw new Error("Supabase did not return the upserted wiki document.");
  }

  return row;
}

export async function replaceWikiChunks(
  documentId: string,
  chunks: Array<{
    chunkIndex: number;
    chunkText: string;
    embedding: number[];
    metadata?: Record<string, unknown> | null;
  }>
) {
  await deleteWikiChunksForDocument(documentId);

  if (!chunks.length) {
    return;
  }

  const response = await supabaseRequest("/rest/v1/wiki_chunks", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify(
      chunks.map((chunk) => ({
        document_id: documentId,
        chunk_index: chunk.chunkIndex,
        chunk_text: chunk.chunkText,
        embedding: chunk.embedding,
        metadata: chunk.metadata ?? null,
        created_at: new Date().toISOString()
      }))
    )
  });

  await parseSupabaseJson<SupabaseRow[]>(response);
}

export async function deleteWikiChunksForDocument(documentId: string) {
  const response = await supabaseRequest(
    `/rest/v1/wiki_chunks?document_id=eq.${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal"
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete wiki chunks: ${response.status} ${text}`);
  }
}

export async function matchWikiChunks(input: {
  queryEmbedding: number[];
  matchThreshold?: number;
  matchCount?: number;
}) {
  const response = await supabaseRequest("/rest/v1/rpc/match_wiki_chunks", {
    method: "POST",
    headers: {
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      query_embedding: input.queryEmbedding,
      match_threshold: input.matchThreshold ?? 0.55,
      match_count: input.matchCount ?? 5
    })
  });

  return parseSupabaseJson<WikiChunkMatch[]>(response);
}
