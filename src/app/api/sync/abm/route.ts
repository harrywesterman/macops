import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { syncAbmCache } from "@/lib/services/devices";

export const runtime = "nodejs";

export async function POST() {
  try {
    const actor = await getRequiredUser();
    const devices = await syncAbmCache(actor);
    return ok({ count: devices.length, devices });
  } catch (error) {
    return errorResponse(error);
  }
}
