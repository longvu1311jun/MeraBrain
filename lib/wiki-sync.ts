import { embedText } from "@/lib/gemini";
import { getWikiEnv } from "@/lib/env";
import {
  extractDriveFileText,
  listFolderChildren,
  type LarkDriveNode
} from "@/lib/lark-drive";
import {
  replaceWikiChunks,
  upsertWikiDocument
} from "@/lib/supabase-rest";

export type WikiSyncSummary = {
  folderToken: string;
  scanned: number;
  indexed: number;
  skipped: number;
  folders: number;
  errors: Array<{ title: string; token: string; reason: string }>;
};

export async function syncWikiFolder(folderToken?: string): Promise<WikiSyncSummary> {
  const env = getWikiEnv();
  const resolvedFolderToken = folderToken ?? env?.folderToken;
  if (!resolvedFolderToken) {
    throw new Error("Missing LARK_WIKI_FOLDER_TOKEN.");
  }

  const summary: WikiSyncSummary = {
    folderToken: resolvedFolderToken,
    scanned: 0,
    indexed: 0,
    skipped: 0,
    folders: 0,
    errors: []
  };

  const visitedFolders = new Set<string>();
  await syncFolderRecursive(resolvedFolderToken, visitedFolders, summary);
  return summary;
}

async function syncFolderRecursive(
  folderToken: string,
  visitedFolders: Set<string>,
  summary: WikiSyncSummary
) {
  if (visitedFolders.has(folderToken)) {
    return;
  }

  visitedFolders.add(folderToken);
  summary.folders += 1;

  let pageToken: string | null = null;
  do {
    const page = await listFolderChildren(folderToken, pageToken);
    console.log("[wiki-sync] folder page", {
      folderToken,
      pageToken,
      itemCount: page.items.length,
      hasMore: page.hasMore,
      nextPageToken: page.nextPageToken,
      rawKeys: Object.keys(page.raw),
      childrenType: Array.isArray(page.childrenRaw) ? "array" : typeof page.childrenRaw,
      childrenPreview: Array.isArray(page.childrenRaw)
        ? page.childrenRaw.slice(0, 3)
        : page.childrenRaw
    });

    for (const item of page.items) {
      summary.scanned += 1;
      console.log("[wiki-sync] found item", {
        kind: item.kind,
        token: item.token,
        title: item.title,
        fileType: item.fileType,
        extension: item.extension
      });
      if (item.kind === "folder") {
        await syncFolderRecursive(item.token, visitedFolders, summary);
        continue;
      }

      await indexDriveNode(item, summary);
    }

    pageToken = page.nextPageToken;
  } while (pageToken);
}

async function indexDriveNode(node: LarkDriveNode, summary: WikiSyncSummary) {
  try {
    console.log("[wiki-sync] indexing node", {
      token: node.token,
      title: node.title,
      kind: node.kind,
      fileType: node.fileType,
      extension: node.extension
    });
    const rawText = await extractDriveFileText({
      title: node.title,
      token: node.token,
      fileType: node.fileType,
      extension: node.extension
    });

    const normalizedText = normalizeText(rawText);
    if (!normalizedText) {
      summary.skipped += 1;
      console.log("[wiki-sync] skipped empty text", {
        token: node.token,
        title: node.title
      });
      return;
    }

    const documentRow = await upsertWikiDocument({
      larkToken: node.token,
      title: node.title,
      url: node.url ?? null,
      fileType: node.fileType ?? node.kind,
      rawText: normalizedText
    });

    const chunks = splitTextIntoChunks(normalizedText, 1200, 200);
    const indexedChunks = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunkText = chunks[index];
      const embedding = await embedText(chunkText);
      indexedChunks.push({
        chunkIndex: index,
        chunkText,
        embedding,
        metadata: {
          title: node.title,
          url: node.url ?? null,
          kind: node.kind,
          token: node.token,
          chunk_index: index
        }
      });
    }

    await replaceWikiChunks(documentRow.id, indexedChunks);
    summary.indexed += 1;
  } catch (error) {
    console.error("[wiki-sync] index failed", {
      token: node.token,
      title: node.title,
      error: error instanceof Error ? error.message : String(error)
    });
    summary.errors.push({
      title: node.title,
      token: node.token,
      reason: error instanceof Error ? error.message : String(error)
    });
  }
}

function splitTextIntoChunks(text: string, maxChars: number, overlapChars: number) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current.trim());
    }

    if (paragraph.length > maxChars) {
      let start = 0;
      while (start < paragraph.length) {
        const slice = paragraph.slice(start, start + maxChars);
        chunks.push(slice.trim());
        start += maxChars - overlapChars;
      }
      current = "";
      continue;
    }

    current = paragraph;
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
