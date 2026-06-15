import {
  createDecipheriv,
  createHash,
  timingSafeEqual
} from "node:crypto";
import { getLarkEnv } from "@/lib/env";

export type LarkEventPayload = {
  challenge?: string;
  token?: string;
  type?: string;
  schema?: string;
  header?: {
    event_id?: string;
    event_type?: string;
    token?: string;
    tenant_key?: string;
    app_id?: string;
    create_time?: string;
  };
  event?: {
    sender?: {
      sender_id?: {
        union_id?: string;
        user_id?: string;
        open_id?: string;
      };
      sender_type?: string;
      tenant_key?: string;
    };
    message?: {
      message_id?: string;
      root_id?: string;
      parent_id?: string;
      thread_id?: string;
      chat_id?: string;
      chat_type?: string;
      message_type?: string;
      content?: string;
      mentions?: Array<{
        key?: string;
        name?: string;
        tenant_key?: string;
        id?: {
          union_id?: string;
          user_id?: string;
          open_id?: string;
        };
      }>;
    };
  };
};

export function parseLarkEventPayload(rawBody: string, headers: Headers) {
  const { verificationToken, encryptKey } = getLarkEnv();
  const body = parseJsonObject(rawBody);
  const isEncryptedPayload = typeof body.encrypt === "string";

  if (encryptKey && isEncryptedPayload) {
    verifyLarkSignature(rawBody, headers, encryptKey);
  }

  const payload = decryptIfNeeded(body, encryptKey);

  if (verificationToken) {
    verifyLarkToken(payload, verificationToken);
  } else {
    console.warn("[lark/events] LARK_VERIFICATION_TOKEN is not configured; token verification skipped.");
  }

  return payload;
}

function decryptIfNeeded(body: Record<string, unknown>, encryptKey: string | undefined) {
  if (typeof body.encrypt !== "string") {
    return body as LarkEventPayload;
  }

  if (!encryptKey) {
    throw new Error("Received encrypted Lark event but LARK_ENCRYPT_KEY is missing.");
  }

  return parseJsonObject(decryptLarkEvent(body.encrypt, encryptKey)) as LarkEventPayload;
}

function verifyLarkSignature(rawBody: string, headers: Headers, encryptKey: string) {
  const timestamp = headers.get("x-lark-request-timestamp");
  const nonce = headers.get("x-lark-request-nonce");
  const receivedSignature = headers.get("x-lark-signature");

  if (!timestamp || !nonce || !receivedSignature) {
    throw new Error("Missing Lark signature headers.");
  }

  const expectedSignature = createHash("sha256")
    .update(timestamp + nonce + encryptKey + rawBody)
    .digest("hex");

  if (!safeEqual(expectedSignature, receivedSignature)) {
    throw new Error("Invalid Lark signature.");
  }
}

function verifyLarkToken(payload: LarkEventPayload, verificationToken: string) {
  const token = payload.header?.token ?? payload.token;
  if (token !== verificationToken) {
    throw new Error("Invalid Lark verification token.");
  }
}

function decryptLarkEvent(encrypted: string, encryptKey: string) {
  const encryptedBuffer = Buffer.from(encrypted, "base64");
  const iv = encryptedBuffer.subarray(0, 16);
  const encryptedEvent = encryptedBuffer.subarray(16);
  const key = createHash("sha256").update(encryptKey).digest();
  const decipher = createDecipheriv("aes-256-cbc", key, iv);

  return decipher.update(encryptedEvent, undefined, "utf8") + decipher.final("utf8");
}

function parseJsonObject(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected JSON object.");
  }

  return parsed as Record<string, unknown>;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
