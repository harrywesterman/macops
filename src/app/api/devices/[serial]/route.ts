import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { getDevice } from "@/lib/services/devices";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ serial: string }> }) {
  try {
    await getRequiredUser();
    const { serial } = await context.params;
    const device = await getDevice(serial);
    return ok({ device });
  } catch (error) {
    return errorResponse(error);
  }
}
