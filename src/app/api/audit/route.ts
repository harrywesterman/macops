import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { latestAuditEvents } from "@/lib/services/devices";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getRequiredUser();
    const audit = await latestAuditEvents();
    return ok({ audit });
  } catch (error) {
    return errorResponse(error);
  }
}
