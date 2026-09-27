// Health check para o deploy (Docker HEALTHCHECK / load balancer): app de pé e banco acessível.
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "db_unreachable" }, { status: 503 });
  }
}
