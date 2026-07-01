import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { integrationHealth } from "@/lib/services/devices";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getRequiredUser();
    const integrations = await integrationHealth();
    return ok({ integrations });
  } catch (error) {
    return errorResponse(error);
  }
}
