import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "Chat de IA temporariamente desativado. Configure a chave da Anthropic para ativar."
  });
}
