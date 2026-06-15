import { NextRequest, NextResponse } from "next/server";
import { answerWithWiki } from "../../../../lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });
  const result = await answerWithWiki(question);
  return NextResponse.json(result);
}
