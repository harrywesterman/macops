import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { consumeRelayState, createSamlClient, profileToUser } from "@/lib/auth/saml";
import { errorResponse } from "@/lib/http";
import { publicUrl, safeReturnPath } from "@/lib/public-url";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const SAMLResponse = String(form.get("SAMLResponse") ?? "");
    const RelayState = String(form.get("RelayState") ?? "");

    const result = await createSamlClient().validatePostResponseAsync({ SAMLResponse, RelayState });
    if (result.loggedOut || !result.profile) {
      return NextResponse.redirect(publicUrl("/auth/logout", request));
    }

    const user = profileToUser(result.profile);
    const session = await createSession(user);
    const returnTo = safeReturnPath(await consumeRelayState(RelayState), "/dashboard");
    const response = NextResponse.redirect(publicUrl(returnTo, request));
    setSessionCookie(response, session.cookieValue, session.expiresAt);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
