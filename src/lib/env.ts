import { existsSync, readFileSync } from "node:fs";

const DEFAULT_DATABASE_URL = "file:./dev.db";
const DEFAULT_SESSION_SECRET = "local-development-secret-change-me-please";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_DATABASE_URL;
}

export type RuntimeMode = "mock" | "live";

function readSecretValue(envName: string, pathEnvName: string) {
  const direct = process.env[envName];
  if (direct) {
    return direct;
  }

  const path = process.env[pathEnvName];
  if (path && existsSync(path)) {
    return readFileSync(path, "utf8").trim();
  }

  return undefined;
}

function csv(value: string | undefined, fallback: string[]) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET ?? DEFAULT_SESSION_SECRET,
  authMockEnabled: process.env.AUTH_MOCK_ENABLED !== "false",
  integrationMode: (process.env.INTEGRATION_MODE === "live" ? "live" : "mock") satisfies RuntimeMode,
  ping: {
    entryPoint: process.env.PING_ENTRY_POINT,
    idpCert: readSecretValue("PING_IDP_CERT", "PING_IDP_CERT_PATH"),
    allowedGroups: csv(process.env.PING_ALLOWED_GROUPS, ["Gebruikers Ondersteuning", "LiMa"]),
    groupAttribute: process.env.PING_GROUP_ATTRIBUTE ?? "groups",
    issuer: process.env.PING_SP_ENTITY_ID ?? `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/auth/metadata`,
    privateKey: readSecretValue("PING_SP_PRIVATE_KEY", "PING_SP_PRIVATE_KEY_PATH"),
    publicCert: readSecretValue("PING_SP_PUBLIC_CERT", "PING_SP_PUBLIC_CERT_PATH")
  },
  abm: {
    clientId: process.env.ABM_CLIENT_ID,
    keyId: process.env.ABM_KEY_ID,
    privateKey: readSecretValue("ABM_PRIVATE_KEY", "ABM_PRIVATE_KEY_PATH"),
    scope: process.env.ABM_SCOPE ?? "business.api",
    baseUrl: process.env.ABM_BASE_URL ?? "https://api-business.apple.com",
    tokenUrl: process.env.ABM_TOKEN_URL ?? "https://account.apple.com/auth/oauth2/token"
  },
  jamf: {
    baseUrl: process.env.JAMF_BASE_URL,
    clientId: process.env.JAMF_CLIENT_ID,
    clientSecret: readSecretValue("JAMF_CLIENT_SECRET", "JAMF_CLIENT_SECRET_PATH")
  },
  serviceNow: {
    baseUrl: process.env.SERVICENOW_BASE_URL,
    clientId: process.env.SERVICENOW_CLIENT_ID,
    clientSecret: readSecretValue("SERVICENOW_CLIENT_SECRET", "SERVICENOW_CLIENT_SECRET_PATH")
  }
};

export function isLiveMode() {
  return env.integrationMode === "live";
}
