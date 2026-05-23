import { NextResponse } from "next/server";
import {
  callClaudeForFactura,
  type FacturaExtraida,
  type LeerFacturaMimeType,
} from "@/lib/leer-factura";

export const runtime = "nodejs";

type LeerFacturaBody = {
  base64?: string;
  mimeType?: LeerFacturaMimeType;
};

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  let body: LeerFacturaBody;
  try {
    body = (await request.json()) as LeerFacturaBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 500 });
  }

  const base64 = body.base64?.trim();
  const mimeType = body.mimeType;

  if (!base64 || !mimeType) {
    return NextResponse.json(
      { error: "base64 y mimeType son requeridos." },
      { status: 500 },
    );
  }

  if (
    mimeType !== "application/pdf" &&
    mimeType !== "image/jpeg" &&
    mimeType !== "image/png"
  ) {
    return NextResponse.json(
      { error: "Tipo de archivo no soportado." },
      { status: 500 },
    );
  }

  console.log("[leer-factura] Llamando a Claude:", {
    mimeType,
    base64Preview: base64.slice(0, 100),
    base64Length: base64.length,
  });

  try {
    const factura: FacturaExtraida =
      mimeType === "application/pdf"
        ? await callClaudeForFactura(apiKey, { type: "document", base64 })
        : await callClaudeForFactura(apiKey, {
            type: "image",
            mediaType: mimeType,
            base64,
          });

    console.log("[leer-factura] Claude respondió OK:", {
      mimeType,
      proveedor: factura.proveedor,
      rfc_emisor: factura.rfc_emisor,
    });

    return NextResponse.json(factura);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar el documento.";

    console.error("[leer-factura] Error de Claude:", {
      mimeType,
      base64Preview: base64.slice(0, 100),
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
