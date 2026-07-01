import { ensureSqlitePragmas, prisma } from "@/lib/db";
import { ok, errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureSqlitePragmas();
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", database: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}
