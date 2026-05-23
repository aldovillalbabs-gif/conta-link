export type FacturaExtraida = {
  proveedor: string | null;
  rfc_emisor: string | null;
  fecha: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  concepto: string | null;
  uuid: string | null;
};

export type LeerFacturaMimeType =
  | "image/jpeg"
  | "image/png"
  | "application/pdf";

const PROMPT =
  "Eres un experto en facturas mexicanas. Extrae los datos de este documento y devuelve SOLO un JSON con estos campos exactos: { proveedor, rfc_emisor, fecha, subtotal, iva, total, concepto, uuid }. Si algún campo no existe usa null. La fecha debe estar en formato YYYY-MM-DD. Los montos deben ser números sin comas ni signos de peso.";

export const CLAUDE_FACTURA_MODEL = "claude-haiku-4-5-20251001";

export function extractJsonFromText(text: string): FacturaExtraida {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("No se encontró JSON en la respuesta.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as FacturaExtraida;
  return parsed;
}

export async function callClaudeForFactura(
  apiKey: string,
  content:
    | { type: "document"; base64: string }
    | {
        type: "image";
        mediaType: "image/jpeg" | "image/png";
        base64: string;
      },
): Promise<FacturaExtraida> {
  const messageContent =
    content.type === "document"
      ? [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: content.base64,
            },
          },
          {
            type: "text",
            text: PROMPT,
          },
        ]
      : [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: content.mediaType,
              data: content.base64,
            },
          },
          {
            type: "text",
            text: PROMPT,
          },
        ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_FACTURA_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error de Anthropic: ${errorBody}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = data.content?.find((block) => block.type === "text")?.text?.trim();

  if (!text) {
    throw new Error("No se recibió una respuesta válida de Claude.");
  }

  return extractJsonFromText(text);
}

export function normalizeMimeType(file: File): LeerFacturaMimeType | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (
    type === "application/pdf" ||
    name.endsWith(".pdf")
  ) {
    return "application/pdf";
  }

  if (
    type === "image/jpeg" ||
    type === "image/jpg" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (type === "image/png" || name.endsWith(".png")) {
    return "image/png";
  }

  return null;
}

export function isPdfOrImageFile(file: File): boolean {
  return normalizeMimeType(file) !== null;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el archivo."));
        return;
      }

      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("No se pudo codificar el archivo."));
        return;
      }

      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export async function leerFacturaDesdeArchivo(
  file: File,
): Promise<FacturaExtraida> {
  const mimeType = normalizeMimeType(file);
  if (!mimeType) {
    throw new Error("Formato de archivo no soportado.");
  }

  const base64 = await fileToBase64(file);
  const response = await fetch("/api/leer-factura", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType }),
  });

  if (!response.ok) {
    throw new Error(
      "No se pudo leer el documento. Intenta con una imagen más clara.",
    );
  }

  return (await response.json()) as FacturaExtraida;
}

export function mapFacturaExtraida(
  data: FacturaExtraida,
): {
  proveedor: string;
  concepto: string;
  rfc: string;
  fecha: string;
  uuid: string;
  subtotal: number;
  iva: number;
  total: number;
} {
  if (
    !data.proveedor?.trim() ||
    !data.rfc_emisor?.trim() ||
    !data.fecha?.trim() ||
    data.subtotal == null ||
    data.total == null
  ) {
    throw new Error(
      "No se pudo leer el documento. Intenta con una imagen más clara.",
    );
  }

  const subtotal = Number(data.subtotal);
  const total = Number(data.total);
  const iva =
    data.iva != null ? Number(data.iva) : Number((total - subtotal).toFixed(2));

  if (Number.isNaN(subtotal) || Number.isNaN(total) || Number.isNaN(iva)) {
    throw new Error(
      "No se pudo leer el documento. Intenta con una imagen más clara.",
    );
  }

  return {
    proveedor: data.proveedor.trim(),
    concepto: data.concepto?.trim() || "Sin concepto",
    rfc: data.rfc_emisor.trim(),
    fecha: data.fecha.trim(),
    uuid: data.uuid?.trim() || "",
    subtotal,
    iva,
    total,
  };
}

export function formatMoneyDisplay(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
