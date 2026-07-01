import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError } from "@/lib/http";

export const SESSION_COOKIE = "macops_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type CurrentUser = {
  email: string;
  name?: string | null;
  groups: string[];
};

function sign(value: string) {
  return createHmac("sha256", env.sessionSecret).update(value).digest("base64url");
}

function encodeCookie(sessionId: string) {
  return `${sessionId}.${sign(sessionId)}`;
}

function decodeCookie(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const [sessionId, signature] = value.split(".");
  if (!sessionId || !signature) {
    return undefined;
  }

  const expected = sign(sessionId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return undefined;
  }

  return sessionId;
}

export async function createSession(user: CurrentUser) {
  const id = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.userSession.create({
    data: {
      id,
      email: user.email,
      name: user.name,
      groups: user.groups.join(","),
      expiresAt
    }
  });

  return { cookieValue: encodeCookie(id), expiresAt };
}

export function setSessionCookie(response: NextResponse, cookieValue: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, cookieValue, {
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function getOptionalUser(): Promise<CurrentUser | undefined> {
  const cookieStore = await cookies();
  const sessionId = decodeCookie(cookieStore.get(SESSION_COOKIE)?.value);
  if (!sessionId) {
    return undefined;
  }

  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return undefined;
  }

  return {
    email: session.email,
    name: session.name,
    groups: session.groups.split(",").filter(Boolean)
  };
}

export async function getRequiredUser() {
  const user = await getOptionalUser();
  if (!user) {
    throw new AppError("Niet ingelogd", 401, "UNAUTHENTICATED");
  }

  const allowed = new Set(env.ping.allowedGroups);
  if (!user.groups.some((group) => allowed.has(group))) {
    throw new AppError("Geen toegang voor deze groep", 403, "FORBIDDEN");
  }

  return user;
}

export function createMockUser(): CurrentUser {
  return {
    email: "macops.operator@example.org",
    name: "MacOps Operator",
    groups: ["Gebruikers Ondersteuning", "LiMa"]
  };
}
