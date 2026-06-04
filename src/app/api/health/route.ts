import { NextResponse } from "next/server";
import { healthService } from "@/services/health.service";

export async function GET() {
  const result = await healthService.check();
  return NextResponse.json(result, { status: result.status === "ok" ? 200 : 503 });
}
