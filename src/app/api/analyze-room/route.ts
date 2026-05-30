import { NextResponse } from "next/server";
import { buildMockAnalysis } from "@/lib/ai/mockResponses";

export async function POST() {
  return NextResponse.json({
    status: "mock",
    analysis: buildMockAnalysis(),
  });
}
