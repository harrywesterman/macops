import { z } from "zod";
import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { assignMdmServer } from "@/lib/services/devices";

export const runtime = "nodejs";

const schema = z.object({
  mdmServerKey: z.enum(["UEM", "JAMF_WERKPLEKKEN", "UEM_SBT"])
});

export async function POST(request: Request, context: { params: Promise<{ serial: string }> }) {
  try {
    const actor = await getRequiredUser();
    const { serial } = await context.params;
    const body = schema.parse(await request.json());
    const result = await assignMdmServer(serial, body.mdmServerKey, actor);
    return ok(result);
  } catch (error) {
    return errorResponse(error);
  }
}
