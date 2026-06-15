import { env } from "./env";

const LARK_API = "https://open.larksuite.com/open-apis";
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getTenantAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const res = await fetch(`${LARK_API}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET }),
  });
  const data = await res.json();
  if (!res.ok || data.code !== 0) throw new Error(`Lark token error: ${JSON.stringify(data)}`);

  cachedToken = { token: data.tenant_access_token, expiresAt: Date.now() + (data.expire ?? 7200) * 1000 };
  return cachedToken.token;
}

export async function larkFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getTenantAccessToken();
  const res = await fetch(`${LARK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code !== 0) throw new Error(`Lark API error ${path}: ${JSON.stringify(data)}`);
  return data;
}

export async function sendTextMessage(chatId: string, text: string) {
  return larkFetch(`/im/v1/messages?receive_id_type=chat_id`, {
    method: "POST",
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: "text",
      content: JSON.stringify({ text }),
    }),
  });
}

export function parseLarkTextMessage(body: any): { chatId?: string; text?: string; messageId?: string; userId?: string } {
  const event = body?.event;
  const message = event?.message;
  const chatId = message?.chat_id;
  const messageId = message?.message_id;
  const userId = event?.sender?.sender_id?.user_id ?? event?.sender?.sender_id?.open_id;
  let text = "";
  try {
    const content = JSON.parse(message?.content ?? "{}");
    text = content.text ?? "";
  } catch {
    text = message?.content ?? "";
  }
  return { chatId, text: text.trim(), messageId, userId };
}

// Folder API endpoint varies by Drive/Wiki object type. For MVP, paste/export docs to text or adapt this function.
// Common pattern for Lark Drive Explorer folder children is kept here as a single replaceable integration point.
export async function listFolderChildren(folderToken: string): Promise<Array<{ token: string; name: string; type: string; url?: string }>> {
  const data: any = await larkFetch(`/drive/explorer/v2/folder/${folderToken}/children?page_size=50`, { method: "GET" });
  const files = data?.data?.files ?? data?.data?.children ?? [];
  return files.map((f: any) => ({ token: f.token ?? f.file_token, name: f.name, type: f.type, url: f.url }));
}

export async function getDocxRawContent(documentId: string): Promise<string> {
  // For Lark Docs/Docx, adjust endpoint depending on actual file type in your Wiki.
  // This returns plain text in some tenants; otherwise use export/download API.
  const data: any = await larkFetch(`/docx/v1/documents/${documentId}/raw_content`, { method: "GET" });
  return data?.data?.content ?? data?.data?.text ?? "";
}
