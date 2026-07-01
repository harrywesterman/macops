import { serviceProviderMetadata } from "@/lib/auth/saml";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    return new Response(serviceProviderMetadata(), {
      headers: {
        "content-type": "application/samlmetadata+xml; charset=utf-8"
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
