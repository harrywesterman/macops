import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { searchDevices } from "@/lib/services/devices";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await getRequiredUser();
    const url = new URL(request.url);
    const devices = await searchDevices(url.searchParams.get("query") ?? undefined);
    return ok({ devices });
  } catch (error) {
    return errorResponse(error);
  }
}
