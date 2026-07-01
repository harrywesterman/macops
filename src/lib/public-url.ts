import { env } from "@/lib/env";

function firstHeader(value: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}

function isInternalHost(host: string | undefined) {
  if (!host) {
    return true;
  }

  const hostname = host.split(":")[0];
  return hostname === "0.0.0.0" || hostname === "127.0.0.1" || hostname === "::1";
}

export function safeReturnPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function publicOrigin(request: Request) {
  const forwardedHost = firstHeader(request.headers.get("x-forwarded-host"));
  const forwardedProto = firstHeader(request.headers.get("x-forwarded-proto"));
  const host = firstHeader(request.headers.get("host"));
  const proto = forwardedProto ?? new URL(request.url).protocol.replace(":", "") ?? "http";

  if (forwardedHost) {
    return `${proto}://${forwardedHost}`;
  }

  if (!isInternalHost(host)) {
    return `${proto}://${host}`;
  }

  return env.appBaseUrl.replace(/\/$/, "");
}

export function publicUrl(path: string, request: Request) {
  return new URL(safeReturnPath(path, "/"), publicOrigin(request));
}
