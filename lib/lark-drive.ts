import { Buffer } from "node:buffer";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse, VerbosityLevel } from "pdf-parse";
import * as XLSX from "xlsx";
import { getLarkTenantAccessToken } from "@/lib/lark";

const LARK_OPEN_API_BASE_URL = "https://open.larksuite.com/open-apis";

export type LarkDriveNodeKind = "folder" | "doc" | "sheet" | "file" | "unknown";

export type LarkDriveNode = {
  kind: LarkDriveNodeKind;
  token: string;
  title: string;
  url?: string | null;
  fileType?: string | null;
  extension?: string | null;
  raw: Record<string, unknown>;
};

export type LarkDriveFolderPage = {
  items: LarkDriveNode[];
  nextPageToken: string | null;
  hasMore: boolean;
  raw: Record<string, unknown>;
};

export async function listFolderChildren(folderToken: string, pageToken?: string | null) {
  const token = await getLarkTenantAccessToken();
  const url = new URL(`${LARK_OPEN_API_BASE_URL}/drive/explorer/v2/folder/${encodeURIComponent(folderToken)}/children`);
  if (pageToken) {
    url.searchParams.set("page_token", pageToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const payload = await readJson(response, "list folder children");
  const data = (payload as { data?: Record<string, unknown> })?.data ?? payload;
  const rawItems = getArrayFromAny(data, ["items", "children", "files", "data"]);

  return {
    items: rawItems.map(normalizeDriveNode).filter((item): item is LarkDriveNode => Boolean(item?.token)),
    nextPageToken:
      readString(data, ["page_token", "next_page_token", "nextPageToken"]) ?? null,
    hasMore: readBoolean(data, ["has_more", "hasMore"]) ?? false,
    raw: data as Record<string, unknown>
  } satisfies LarkDriveFolderPage;
}

export async function getDocumentRawContent(documentId: string) {
  const token = await getLarkTenantAccessToken();
  const response = await fetch(
    `${LARK_OPEN_API_BASE_URL}/docx/v1/documents/${encodeURIComponent(documentId)}/raw_content`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const payload = await readAnyBody(response, "get document raw content");
  return extractTextPayload(payload);
}

export async function downloadDriveFileBytes(fileToken: string) {
  const token = await getLarkTenantAccessToken();
  const response = await fetch(
    `${LARK_OPEN_API_BASE_URL}/drive/v1/files/${encodeURIComponent(fileToken)}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to download file ${fileToken}: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json();
    const downloadUrl = readString(payload, [
      "download_url",
      "file_download_url",
      "url",
      "data.download_url",
      "data.file_download_url"
    ]);

    if (!downloadUrl) {
      throw new Error(`Download response for ${fileToken} did not include a download URL.`);
    }

    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch download URL for ${fileToken}: ${fileResponse.status}`);
    }

    return Buffer.from(await fileResponse.arrayBuffer());
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function extractDriveFileText(input: {
  title: string;
  token: string;
  fileType?: string | null;
  extension?: string | null;
}) {
  const extension = (input.extension ?? path.extname(input.title)).toLowerCase().replace(".", "");
  const fileType = (input.fileType ?? "").toLowerCase();

  if (fileType === "doc" || fileType === "docx" || extension === "doc" || extension === "docx") {
    return getDocumentRawContent(input.token);
  }

  const bytes = await downloadDriveFileBytes(input.token);

  if (fileType === "sheet" || extension === "xlsx" || extension === "xls") {
    return extractSpreadsheetText(bytes);
  }

  if (extension === "pdf") {
    const parser = new PDFParse({
      data: bytes,
      verbosity: VerbosityLevel.ERRORS
    });
    const parsed = await parser.getText();
    const text = parsed.pages.map((page) => page.text).join("\n\n").trim();
    await parser.destroy();
    return text;
  }

  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer: bytes });
    return result.value.trim();
  }

  if (isTextExtension(extension)) {
    return new TextDecoder("utf-8").decode(bytes).trim();
  }

  return new TextDecoder("utf-8").decode(bytes).trim();
}

function extractSpreadsheetText(bytes: Buffer) {
  const workbook = XLSX.read(bytes, { type: "buffer" });
  const sheetTexts = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet).trim();
    return csv ? `[#${sheetName}]\n${csv}` : "";
  }).filter(Boolean);

  return sheetTexts.join("\n\n---\n\n").trim();
}

function normalizeDriveNode(raw: Record<string, unknown>): LarkDriveNode | null {
  const token =
    readString(raw, ["token", "file_token", "doc_token", "folder_token", "id"]) ?? "";
  const title =
    readString(raw, ["title", "name", "file_name", "obj_name", "document_title"]) ?? token;
  const url = readString(raw, ["url", "web_url", "link"]);
  const kind = normalizeKind(readString(raw, ["type", "obj_type", "node_type", "file_type"]));
  const extension = readString(raw, ["extension", "file_extension"]);

  if (!token) {
    return null;
  }

  return {
    kind,
    token,
    title,
    url: url ?? null,
    fileType: readString(raw, ["file_type", "type", "obj_type"]) ?? null,
    extension: extension ?? null,
    raw
  };
}

function normalizeKind(value: string | null): LarkDriveNodeKind {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("folder")) {
    return "folder";
  }
  if (normalized.includes("sheet")) {
    return "sheet";
  }
  if (normalized.includes("doc")) {
    return "doc";
  }
  if (normalized.includes("file") || normalized.includes("pdf") || normalized.includes("txt")) {
    return "file";
  }
  return "unknown";
}

function isTextExtension(extension: string) {
  return ["txt", "md", "csv", "json", "log", "yaml", "yml", "html", "htm", "xml"].includes(extension);
}

async function readAnyBody(response: Response, action: string) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to ${action}: ${response.status} ${text}`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function readJson(response: Response, action: string) {
  const body = await readAnyBody(response, action);
  if (typeof body === "string") {
    throw new Error(`Expected JSON from ${action} but received text.`);
  }

  return body as Record<string, unknown>;
}

function extractTextPayload(payload: unknown) {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const direct = readString(record, ["raw_content", "content", "markdown", "text"]);
  if (direct) {
    return direct.trim();
  }

  const data = record.data;
  if (data && typeof data === "object") {
    const nested = readString(data as Record<string, unknown>, [
      "raw_content",
      "content",
      "markdown",
      "text"
    ]);
    if (nested) {
      return nested.trim();
    }
  }

  return JSON.stringify(record, null, 2);
}

function getArrayFromAny(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readPath(source, key);
    if (Array.isArray(value)) {
      return value as Record<string, unknown>[];
    }
  }

  return [];
}

function readString(source: unknown, keys: string[]) {
  for (const key of keys) {
    const value = readPath(source, key);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readBoolean(source: unknown, keys: string[]) {
  for (const key of keys) {
    const value = readPath(source, key);
    if (typeof value === "boolean") {
      return value;
    }
  }

  return null;
}

function readPath(source: unknown, pathExpression: string): unknown {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  return pathExpression.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[part];
  }, source);
}
