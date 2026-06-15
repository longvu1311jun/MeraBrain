import { randomUUID } from "node:crypto";
import { getLarkEnv } from "@/lib/env";

const LARK_OPEN_API_BASE_URL = "https://open.larksuite.com/open-apis";

type TenantTokenCache = {
  token: string;
  expiresAt: number;
};

let tenantTokenCache: TenantTokenCache | null = null;

export async function replyTextToMessage(
  messageId: string,
  text: string,
  options: { replyInThread?: boolean } = {}
) {
  const token = await getTenantAccessToken();
  const response = await fetch(
    `${LARK_OPEN_API_BASE_URL}/im/v1/messages/${encodeURIComponent(messageId)}/reply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        msg_type: "text",
        content: JSON.stringify({ text }),
        reply_in_thread: options.replyInThread ?? false,
        uuid: randomUUID()
      })
    }
  );

  return parseLarkJsonResponse(response, "reply message");
}

export async function sendTextToChat(chatId: string, text: string) {
  const token = await getTenantAccessToken();
  const response = await fetch(
    `${LARK_OPEN_API_BASE_URL}/im/v1/messages?receive_id_type=chat_id`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        receive_id: chatId,
        msg_type: "text",
        content: JSON.stringify({ text }),
        uuid: randomUUID()
      })
    }
  );

  return parseLarkJsonResponse(response, "send message");
}

async function getTenantAccessToken() {
  if (tenantTokenCache && tenantTokenCache.expiresAt > Date.now()) {
    return tenantTokenCache.token;
  }

  const { appId, appSecret } = getLarkEnv();
  const response = await fetch(
    `${LARK_OPEN_API_BASE_URL}/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret
      })
    }
  );

  const data = (await response.json()) as {
    code?: number;
    msg?: string;
    tenant_access_token?: string;
    expire?: number;
  };

  if (!response.ok || data.code !== 0 || !data.tenant_access_token) {
    throw new LarkApiError("get tenant_access_token", response.status, data);
  }

  tenantTokenCache = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + Math.max((data.expire ?? 7200) - 300, 60) * 1000
  };

  return tenantTokenCache.token;
}

async function parseLarkJsonResponse(response: Response, action: string) {
  const data = (await response.json()) as { code?: number; msg?: string };
  if (!response.ok || data.code !== 0) {
    throw new LarkApiError(action, response.status, data);
  }

  return data;
}

export class LarkApiError extends Error {
  constructor(
    action: string,
    readonly status: number,
    readonly responseBody: unknown
  ) {
    super(`Lark API failed while trying to ${action}`);
  }
}
