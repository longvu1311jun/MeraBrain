import { embedText } from "@/lib/gemini";
import { getWikiEnv } from "@/lib/env";
import {
  extractDriveFileText,
  listFolderChildren,
  type LarkDriveNode
} from "@/lib/lark-drive";
import {
  createWikiSyncRun,
  getLatestRunningWikiSyncRun,
  replaceWikiChunks,
  updateWikiSyncRun,
  upsertWikiDocument,
  type WikiSyncRunRow
} from "@/lib/supabase-rest";

type SyncTask =
  | {
      kind: "folder";
      folderToken: string;
      pageToken: string | null;
    }
  | {
      kind: "file";
      token: string;
      title: string;
      fileType: string | null;
      extension: string | null;
      url: string | null;
      nodeKind: string;
    };

type SyncState = {
  queue: SyncTask[];
  visitedFolders: string[];
};

export type WikiSyncSummary = {
  folderToken: string;
  scanned: number;
  indexed: number;
  skipped: number;
  folders: number;
  errors: Array<{ title: string; token: string; reason: string }>;
  status: "running" | "completed";
  runId: string;
  remainingTasks: number;
};

const MAX_FILES_PER_BATCH = 3;
const MAX_BATCH_MS = 45_000;

export async function syncWikiFolder(folderToken?: string): Promise<WikiSyncSummary> {
  const env = getWikiEnv();
  const resolvedFolderToken = folderToken ?? env?.folderToken;
  if (!resolvedFolderToken) {
    throw new Error("Missing LARK_WIKI_FOLDER_TOKEN.");
  }

  const run = await getOrCreateRunningSyncRun(resolvedFolderToken);
  return processSyncBatch(run);
}

async function getOrCreateRunningSyncRun(folderToken: string) {
  const existing = await getLatestRunningWikiSyncRun(folderToken);
  if (existing) {
    return existing;
  }

  const state: SyncState = {
    queue: [
      {
        kind: "folder",
        folderToken,
        pageToken: null
      }
    ],
    visitedFolders: []
  };

  return createWikiSyncRun({
    folderToken,
    state
  });
}

async function processSyncBatch(run: WikiSyncRunRow): Promise<WikiSyncSummary> {
  const state = normalizeState(run.state, run.folder_token);
  const startedAt = Date.now();
  let filesProcessed = 0;
  const errors = normalizeErrors(run.errors);

  while (state.queue.length) {
    if (filesProcessed >= MAX_FILES_PER_BATCH) {
      break;
    }

    if (Date.now() - startedAt > MAX_BATCH_MS) {
      break;
    }

    const task = state.queue.shift();
    if (!task) {
      break;
    }

    if (task.kind === "folder") {
      const visited = await processFolderTask(task, state);
      if (visited) {
        run.folders += 1;
      }
      continue;
    }

    const result = await processFileTask(task);
    filesProcessed += 1;
    run.scanned += 1;

    if (result.indexed) {
      run.indexed += 1;
    } else {
      run.skipped += 1;
    }

    if (result.error) {
      errors.push({
        title: task.title,
        token: task.token,
        reason: result.error
      });
    }

    await updateRunningRun(run.id, state, run, errors);
  }

  const completed = state.queue.length === 0;
  if (completed) {
    run.status = "completed";
  }

  await updateRunningRun(run.id, state, run, errors, completed ? "completed" : "running");

  return {
    folderToken: run.folder_token,
    scanned: run.scanned,
    indexed: run.indexed,
    skipped: run.skipped,
    folders: run.folders,
    errors,
    status: completed ? "completed" : "running",
    runId: run.id,
    remainingTasks: state.queue.length
  };
}

async function processFolderTask(task: Extract<SyncTask, { kind: "folder" }>, state: SyncState) {
  if (state.visitedFolders.includes(task.folderToken)) {
    return false;
  }

  state.visitedFolders.push(task.folderToken);
  console.log("[wiki-sync] folder task", task);

  const page = await listFolderChildren(task.folderToken, task.pageToken);
  console.log("[wiki-sync] folder page", {
    folderToken: task.folderToken,
    pageToken: task.pageToken,
    itemCount: page.items.length,
    hasMore: page.hasMore,
    nextPageToken: page.nextPageToken,
    rawKeys: Object.keys(page.raw),
    childrenType: Array.isArray(page.childrenRaw) ? "array" : typeof page.childrenRaw,
    childrenPreview: Array.isArray(page.childrenRaw) ? page.childrenRaw.slice(0, 3) : page.childrenRaw
  });

  for (const item of page.items) {
    console.log("[wiki-sync] discovered item", {
      kind: item.kind,
      token: item.token,
      title: item.title,
      fileType: item.fileType,
      extension: item.extension
    });

    if (item.kind === "folder") {
      state.queue.push({
        kind: "folder",
        folderToken: item.token,
        pageToken: null
      });
      continue;
    }

    state.queue.push({
      kind: "file",
      token: item.token,
      title: item.title,
      fileType: item.fileType ?? null,
      extension: item.extension ?? null,
      url: item.url ?? null,
      nodeKind: item.kind
    });
  }

  if (page.nextPageToken) {
    state.queue.push({
      kind: "folder",
      folderToken: task.folderToken,
      pageToken: page.nextPageToken
    });
  }

  return true;
}

async function processFileTask(task: Extract<SyncTask, { kind: "file" }>) {
  try {
    console.log("[wiki-sync] indexing file", {
      token: task.token,
      title: task.title,
      fileType: task.fileType,
      extension: task.extension,
      kind: task.nodeKind
    });

    if (shouldSkipFile(task)) {
      console.log("[wiki-sync] skipped unsupported file", {
        token: task.token,
        title: task.title,
        fileType: task.fileType,
        extension: task.extension
      });
      return { indexed: false, error: null as string | null };
    }

    const rawText = await extractDriveFileText({
      title: task.title,
      token: task.token,
      fileType: task.fileType,
      extension: task.extension
    });

    const normalizedText = normalizeText(rawText);
    if (!normalizedText) {
      console.log("[wiki-sync] skipped empty text", {
        token: task.token,
        title: task.title
      });
      return { indexed: false, error: null as string | null };
    }

    const documentRow = await upsertWikiDocument({
      larkToken: task.token,
      title: task.title,
      url: task.url ?? null,
      fileType: task.fileType ?? task.nodeKind,
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
          title: task.title,
          url: task.url ?? null,
          kind: task.nodeKind,
          token: task.token,
          chunk_index: index
        }
      });
    }

    await replaceWikiChunks(documentRow.id, indexedChunks);
    return { indexed: true, error: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[wiki-sync] file index failed", {
      token: task.token,
      title: task.title,
      error: message
    });
    return { indexed: false, error: message };
  }
}

async function updateRunningRun(
  runId: string,
  state: SyncState,
  run: WikiSyncRunRow,
  errors: Array<{ title: string; token: string; reason: string }>,
  status?: "running" | "completed"
) {
  run.errors = errors;
  await updateWikiSyncRun(runId, {
    status: status ?? "running",
    state,
    scanned: run.scanned,
    indexed: run.indexed,
    skipped: run.skipped,
    folders: run.folders,
    errors
  });
}

function normalizeState(state: Record<string, unknown>, folderToken: string): SyncState {
  const queue = Array.isArray(state.queue) ? (state.queue as SyncTask[]) : [];
  const visitedFolders = Array.isArray(state.visitedFolders)
    ? state.visitedFolders.filter((value): value is string => typeof value === "string")
    : [folderToken];

  if (!queue.length) {
    queue.push({
      kind: "folder",
      folderToken,
      pageToken: null
    });
  }

  return {
    queue,
    visitedFolders
  };
}

function normalizeErrors(errors: unknown) {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.filter((error): error is { title: string; token: string; reason: string } => {
    if (!error || typeof error !== "object") {
      return false;
    }

    const record = error as Record<string, unknown>;
    return (
      typeof record.title === "string" &&
      typeof record.token === "string" &&
      typeof record.reason === "string"
    );
  });
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
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shouldSkipFile(task: Extract<SyncTask, { kind: "file" }>) {
  const title = task.title.toLowerCase();
  const extension = (task.extension ?? "").toLowerCase();
  const fileType = (task.fileType ?? "").toLowerCase();

  return (
    title.endsWith(".lnk") ||
    extension === "lnk" ||
    fileType === "shortcut" ||
    extension === "json" ||
    title.includes("shortcut.lnk") ||
    title.includes("raw - shortcut.lnk")
  );
}
