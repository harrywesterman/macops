import { getRequiredUser } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http";
import { latestMutations } from "@/lib/services/devices";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getRequiredUser();
    const mutations = await latestMutations();
    return ok({ mutations });
  } catch (error) {
    return errorResponse(error);
  }
}
