"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  isPdfOrImageFile,
  leerFacturaDesdeArchivo,
  mapFacturaExtraida,
} from "@/lib/leer-factura";

const CFDI_NS = "http://www.sat.gob.mx/cfd/4";
const TIMBRE_NS = "http://www.sat.gob.mx/TimbreFiscalDigital";

const ACCEPT_FILES =
  ".xml,.pdf,application/xml,text/xml,application/pdf,image/jpeg,image/png,image/jpg";

type SubirFacturasPortalProps = {
  clienteId: string;
  clienteNombre: string;
  contadorEmail: string | null;
  contadorNombre: string | null;
};

type ParsedCfdi = {
  proveedor: string;
  concepto: string;
  rfc: string;
  fecha: string;
  uuid: string;
  subtotal: number;
  iva: number;
  total: number;
};

function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function readCfdiValue(element: Element, name: string): string {
  const attr = element.getAttribute(name);
  if (attr) return attr.trim();

  const byNs = element.getElementsByTagNameNS(CFDI_NS, name);
  if (byNs.length > 0) {
    return (byNs[0].textContent ?? byNs[0].getAttribute(name) ?? "").trim();
  }

  const byLocal = element.getElementsByTagName(name);
  if (byLocal.length > 0) {
    return (byLocal[0].textContent ?? byLocal[0].getAttribute(name) ?? "").trim();
  }

  return "";
}

function formatFecha(fecha: string): string {
  return fecha.split("T")[0];
}

function extractUuid(doc: Document): string {
  const byNs = doc.getElementsByTagNameNS(TIMBRE_NS, "TimbreFiscalDigital");
  const timbre =
    byNs[0] ??
    Array.from(doc.getElementsByTagName("*")).find(
      (el) => el.localName === "TimbreFiscalDigital",
    );

  if (!timbre) {
    throw new Error("No se encontró el timbre fiscal digital.");
  }

  const uuid = timbre.getAttribute("UUID")?.trim();
  if (!uuid) {
    throw new Error("No se encontró el UUID del timbre fiscal.");
  }

  return uuid;
}

function findComprobante(doc: Document): Element | null {
  const byNs = doc.getElementsByTagNameNS(CFDI_NS, "Comprobante");
  if (byNs.length > 0) return byNs[0];

  const root = doc.documentElement;
  if (
    root?.localName === "Comprobante" ||
    root?.tagName.endsWith(":Comprobante")
  ) {
    return root;
  }

  return null;
}

function extractConcepto(comprobante: Element, doc: Document): string {
  const conceptos = [
    ...Array.from(comprobante.getElementsByTagNameNS(CFDI_NS, "Concepto")),
    ...Array.from(doc.getElementsByTagNameNS(CFDI_NS, "Concepto")),
  ];

  const seen = new Set<Element>();
  const descripciones: string[] = [];

  for (const concepto of conceptos) {
    if (seen.has(concepto)) continue;
    seen.add(concepto);

    const descripcion = readCfdiValue(concepto, "Descripcion");
    if (descripcion) descripciones.push(descripcion);
  }

  return descripciones.join(", ") || "Sin concepto";
}

function parseCfdiXml(xml: string): ParsedCfdi {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("El archivo XML no es válido.");
  }

  const comprobante = findComprobante(doc);
  if (!comprobante) {
    throw new Error("No se encontró el comprobante CFDI 4.0.");
  }

  const emisores = comprobante.getElementsByTagNameNS(CFDI_NS, "Emisor");
  const emisor =
    emisores[0] ??
    Array.from(comprobante.children).find((el) =>
      el.localName.endsWith("Emisor"),
    );

  if (!emisor) {
    throw new Error("No se encontró la información del emisor.");
  }

  const proveedor = readCfdiValue(emisor, "Nombre");
  const rfc = readCfdiValue(emisor, "Rfc");
  const fecha = readCfdiValue(comprobante, "Fecha");
  const subtotalRaw = readCfdiValue(comprobante, "SubTotal");
  const totalRaw = readCfdiValue(comprobante, "Total");

  const uuid = extractUuid(doc);
  const concepto = extractConcepto(comprobante, doc);

  if (!proveedor || !rfc || !fecha || !subtotalRaw || !totalRaw) {
    throw new Error("El XML no contiene todos los datos requeridos del CFDI.");
  }

  const subtotalNum = Number.parseFloat(subtotalRaw);
  const totalNum = Number.parseFloat(totalRaw);

  if (Number.isNaN(subtotalNum) || Number.isNaN(totalNum)) {
    throw new Error("SubTotal o Total no son valores numéricos válidos.");
  }

  return {
    proveedor,
    concepto,
    rfc,
    fecha: formatFecha(fecha),
    uuid,
    subtotal: subtotalNum,
    iva: totalNum - subtotalNum,
    total: totalNum,
  };
}

function isXmlFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".xml") ||
    file.type === "application/xml" ||
    file.type === "text/xml"
  );
}

async function solicitarCuentaContable(
  proveedor: string,
  concepto: string,
): Promise<string> {
  const proveedorTrim = proveedor.trim();
  const conceptoTrim = concepto.trim();
  const conceptoFinal =
    conceptoTrim && conceptoTrim !== "Sin concepto"
      ? conceptoTrim
      : proveedorTrim;

  try {
    const response = await fetch("/api/sugerir-cuenta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proveedor: proveedorTrim,
        concepto: conceptoFinal,
      }),
    });

    if (!response.ok) return "";

    const data = (await response.json()) as { cuenta?: string };
    return data.cuenta?.trim() ?? "";
  } catch {
    return "";
  }
}

function notificarContador(data: {
  contadorEmail: string;
  contadorNombre: string;
  clienteNombre: string;
  proveedorFactura: string;
  montoTotal: number;
}) {
  void fetch("/api/notificar-contador", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export function SubirFacturasPortal({
  clienteId,
  clienteNombre,
  contadorEmail,
  contadorNombre,
}: SubirFacturasPortalProps) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [leyendoDocumento, setLeyendoDocumento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    if (!showSuccessBanner) return;

    const timer = window.setTimeout(() => {
      setShowSuccessBanner(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [showSuccessBanner]);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileList = Array.from(files);
      if (fileList.length === 0) return;

      const xmlFiles = fileList.filter(isXmlFile);
      const documentFiles = fileList.filter(isPdfOrImageFile);
      const unsupported = fileList.filter(
        (file) => !isXmlFile(file) && !isPdfOrImageFile(file),
      );

      if (unsupported.length > 0 && xmlFiles.length === 0 && documentFiles.length === 0) {
        setError("Solo se permiten archivos XML, PDF, JPG o PNG.");
        return;
      }

      if (xmlFiles.length === 0 && documentFiles.length === 0) {
        setError("Solo se permiten archivos XML, PDF, JPG o PNG.");
        return;
      }

      setShowSuccessBanner(false);
      setIsUploading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();
      const errors: string[] = [];
      let uploadedCount = 0;

      const guardarFacturaPortal = async (parsed: ParsedCfdi) => {
        const { data: inserted, error: insertError } = await supabase
          .from("facturas")
          .insert({
            cliente_id: clienteId,
            proveedor: parsed.proveedor,
            rfc_emisor: parsed.rfc,
            fecha: parsed.fecha,
            subtotal: parsed.subtotal,
            iva: parsed.iva,
            total: parsed.total,
            uuid_cfdi: parsed.uuid,
            cuenta_contable: "",
          })
          .select("id")
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        const cuentaContable = await solicitarCuentaContable(
          parsed.proveedor,
          parsed.concepto,
        );

        if (inserted?.id && cuentaContable) {
          const { error: updateError } = await supabase
            .from("facturas")
            .update({ cuenta_contable: cuentaContable })
            .eq("id", inserted.id);

          if (updateError) {
            throw new Error(updateError.message);
          }
        }

        if (contadorEmail) {
          notificarContador({
            contadorEmail,
            contadorNombre: contadorNombre ?? contadorEmail,
            clienteNombre,
            proveedorFactura: parsed.proveedor,
            montoTotal: parsed.total,
          });
        }
      };

      for (const file of xmlFiles) {
        try {
          const xml = await file.text();
          const parsed = parseCfdiXml(xml);
          await guardarFacturaPortal(parsed);
          uploadedCount += 1;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "No se pudo leer el archivo XML.";
          errors.push(
            xmlFiles.length > 1 ? `${file.name}: ${message}` : message,
          );
        }
      }

      if (documentFiles.length > 0) {
        setLeyendoDocumento(true);
      }

      for (const file of documentFiles) {
        try {
          const extraida = await leerFacturaDesdeArchivo(file);
          const mapped = mapFacturaExtraida(extraida);
          const parsed: ParsedCfdi = {
            proveedor: mapped.proveedor,
            concepto: mapped.concepto,
            rfc: mapped.rfc,
            fecha: mapped.fecha,
            uuid: mapped.uuid,
            subtotal: mapped.subtotal,
            iva: mapped.iva,
            total: mapped.total,
          };
          await guardarFacturaPortal(parsed);
          uploadedCount += 1;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "No se pudo leer el documento. Intenta con una imagen más clara.";
          errors.push(
            documentFiles.length > 1 ? `${file.name}: ${message}` : message,
          );
        }
      }

      setLeyendoDocumento(false);
      setIsUploading(false);

      if (uploadedCount > 0) {
        setShowSuccessBanner(true);
        router.refresh();
      }

      if (errors.length > 0) {
        setError(errors.join(" "));
      }
    },
    [clienteId, clienteNombre, contadorEmail, contadorNombre, router],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files) void processFiles(files);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void processFiles(event.dataTransfer.files);
    }
  };

  return (
    <div className="mt-10 flex flex-col items-center">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
          isDragging
            ? "border-green-500 bg-green-50/50"
            : "border-zinc-300 bg-zinc-50/50"
        }`}
      >
        <svg
          className="h-12 w-12 text-zinc-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.665-7.029 5.25 5.25 0 0 0-10.15-2.2A4.502 4.502 0 0 0 2.25 15Z"
          />
        </svg>
        <p className="mt-4 text-center text-sm font-medium text-zinc-600">
          Arrastra tus facturas aquí
        </p>
        <p className="mt-2 text-center text-xs text-zinc-500">
          Acepta XML, PDF e imágenes
        </p>
        {leyendoDocumento && (
          <p className="mt-2 text-center text-sm font-medium text-zinc-900">
            Leyendo documento con IA...
          </p>
        )}
      </div>

      {showSuccessBanner && (
        <div
          className="mt-4 w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-800"
          role="status"
        >
          ✓ Factura enviada a tu contador correctamente
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_FILES}
        multiple
        className="sr-only"
        id={inputId}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="mt-4 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        {isUploading
          ? leyendoDocumento
            ? "Leyendo documento con IA..."
            : "Subiendo..."
          : "O selecciona archivos"}
      </button>

      {error && (
        <p className="mt-4 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
