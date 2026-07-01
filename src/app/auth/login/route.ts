import { NextRequest, NextResponse } from "next/server";
import { createMockUser, createSession, setSessionCookie } from "@/lib/auth/session";
import { createRelayState, createSamlClient } from "@/lib/auth/saml";
import { env } from "@/lib/env";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/dashboard";
    if (env.authMockEnabled) {
      const session = await createSession(createMockUser());
      const response = NextResponse.redirect(new URL(returnTo, request.url));
      setSessionCookie(response, session.cookieValue, session.expiresAt);
      return response;
    }

    const relayState = await createRelayState(returnTo);
    const url = await createSamlClient().getAuthorizeUrlAsync(relayState, undefined, { samlFallback: "login-request" });
    return NextResponse.redirect(url);
  } catch (error) {
    return errorResponse(error);
  }
}
