import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { publicUrl } from "@/lib/public-url";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const response = NextResponse.redirect(publicUrl("/", request));
  clearSessionCookie(response);
  return response;
}
