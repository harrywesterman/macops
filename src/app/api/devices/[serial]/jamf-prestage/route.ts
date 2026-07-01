import { z } from "zod";
import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { assignJamfPrestage } from "@/lib/services/devices";

export const runtime = "nodejs";

const schema = z.object({
  prestageKey: z.enum(["ONTWIKKEL", "BASIS", "BASIS_COMMUNICATIE", "BASIS_INFORMATIEBEHEER"])
});

export async function POST(request: Request, context: { params: Promise<{ serial: string }> }) {
  try {
    const actor = await getRequiredUser();
    const { serial } = await context.params;
    const body = schema.parse(await request.json());
    const result = await assignJamfPrestage(serial, body.prestageKey, actor);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
