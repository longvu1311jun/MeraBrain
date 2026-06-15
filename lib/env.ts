export type LarkEnv = {
  appId: string;
  appSecret: string;
  verificationToken?: string;
  encryptKey?: string;
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
