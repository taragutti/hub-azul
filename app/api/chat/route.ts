import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    message: "Chat de IA temporariamente desativado."
  });
}

export async function POST() {
  return NextResponse.json({
    message: "Chat de IA temporariamente desativado."
  });
}
