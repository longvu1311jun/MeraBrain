export type LarkEnv = {
  appId: string;
  appSecret: string;
  verificationToken?: string;
  encryptKey?: string;
};

export type OpenAIEnv = {
  apiKey: string;
  model: string;
};

export type GeminiEnv = {
  apiKey: string;
  model: string;
};

export type SupabaseEnv = {
  url: string;
  serviceRoleKey: string;
};

export function getLarkEnv(): LarkEnv {
  const appId = readRequiredEnv("LARK_APP_ID");
  const appSecret = readRequiredEnv("LARK_APP_SECRET");

  return {
    appId,
    appSecret,
    verificationToken: readOptionalEnv("LARK_VERIFICATION_TOKEN"),
    encryptKey: readOptionalEnv("LARK_ENCRYPT_KEY")
  };
}

export function getLarkEnvStatus() {
  return {
    appId: Boolean(readOptionalEnv("LARK_APP_ID")),
    appSecret: Boolean(readOptionalEnv("LARK_APP_SECRET")),
    verificationToken: Boolean(readOptionalEnv("LARK_VERIFICATION_TOKEN")),
    encryptKey: Boolean(readOptionalEnv("LARK_ENCRYPT_KEY"))
  };
}

export function getGeminiEnv(): GeminiEnv {
  return {
    apiKey: readRequiredEnv("GEMINI_API_KEY"),
    model: readOptionalEnv("GEMINI_MODEL") ?? "gemini-3.5-flash"
  };
}

export function getGeminiEnvStatus() {
  return {
    apiKey: Boolean(readOptionalEnv("GEMINI_API_KEY")),
    model: readOptionalEnv("GEMINI_MODEL") ?? "gemini-3.5-flash"
  };
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = readOptionalEnv("SUPABASE_URL");
  const serviceRoleKey = readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    serviceRoleKey
  };
}

export function getSupabaseEnvStatus() {
  return {
    url: Boolean(readOptionalEnv("SUPABASE_URL")),
    serviceRoleKey: Boolean(readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"))
  };
}

function readRequiredEnv(name: string) {
  const value = readOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}
