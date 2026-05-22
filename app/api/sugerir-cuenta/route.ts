import { NextResponse } from "next/server";

type SugerirCuentaBody = {
  proveedor?: string;
  concepto?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  let body: SugerirCuentaBody;
  try {
    body = (await request.json()) as SugerirCuentaBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 500 });
  }

  const proveedor = body.proveedor?.trim();
  const concepto = body.concepto?.trim();

  if (!proveedor || !concepto) {
    return NextResponse.json(
      { error: "proveedor y concepto son requeridos." },
      { status: 500 },
    );
  }

  const prompt = `Eres un contador mexicano experto. Sugiere UNA cuenta contable del catálogo SAT para este movimiento. Responde SOLO con el número y nombre de la cuenta, ejemplo: '602-001 Combustibles'. Proveedor: ${proveedor}. Concepto: ${concepto}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Error de Anthropic: ${errorBody}` },
        { status: 500 },
      );
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };

    const cuenta = data.content
      ?.find((block) => block.type === "text")
      ?.text?.trim();

    if (!cuenta) {
      return NextResponse.json(
        { error: "No se recibió una sugerencia válida." },
        { status: 500 },
      );
    }

    return NextResponse.json({ cuenta });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar la API de Anthropic." },
      { status: 500 },
    );
  }
}
