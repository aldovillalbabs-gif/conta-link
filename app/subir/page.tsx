"use client";

import { useCallback, useId, useRef, useState } from "react";
import * as XLSX from "xlsx";

const CFDI_NS = "http://www.sat.gob.mx/cfd/4";
const TIMBRE_NS = "http://www.sat.gob.mx/TimbreFiscalDigital";

type FacturaRow = {
  id: string;
  proveedor: string;
  concepto: string;
  rfc: string;
  fecha: string;
  uuid: string;
  subtotal: string;
  iva: string;
  total: string;
  cuentaContable: string;
};

const ANALIZANDO_CUENTA = "Analizando...";

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

function formatUuidDisplay(uuid: string): string {
  return uuid.length > 8 ? `${uuid.slice(0, 8)}...` : uuid;
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

function parseCfdiXml(xml: string): Omit<FacturaRow, "id" | "cuentaContable"> {
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

  const ivaNum = totalNum - subtotalNum;

  const formatMoney = (value: number) =>
    value.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return {
    proveedor,
    concepto,
    rfc,
    fecha: formatFecha(fecha),
    uuid,
    subtotal: formatMoney(subtotalNum),
    iva: formatMoney(ivaNum),
    total: formatMoney(totalNum),
  };
}

function isXmlFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".xml") ||
    file.type === "application/xml" ||
    file.type === "text/xml"
  );
}

export default function SubirPage() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [facturas, setFacturas] = useState<FacturaRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const actualizarCuentaContable = useCallback(
    (rowId: string, cuentaContable: string) => {
      setFacturas((prev) =>
        prev.map((row) =>
          row.id === rowId ? { ...row, cuentaContable } : row,
        ),
      );
    },
    [],
  );

  const solicitarSugerenciaCuenta = useCallback(
    async (rowId: string, proveedor: string, concepto: string, total: string) => {
      actualizarCuentaContable(rowId, ANALIZANDO_CUENTA);

      const proveedorTrim = proveedor.trim();
      const conceptoTrim = concepto.trim();
      const conceptoFinal =
        conceptoTrim && conceptoTrim !== "Sin concepto"
          ? conceptoTrim
          : proveedorTrim;
      const totalTrim = total.trim();

      const payload = {
        proveedor: proveedorTrim,
        concepto: conceptoFinal,
        total: totalTrim,
      };

      console.log("[sugerir-cuenta] Enviando:", { rowId, ...payload });

      try {
        const response = await fetch("/api/sugerir-cuenta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = (await response.json()) as { cuenta?: string };
          console.log("[sugerir-cuenta] Respuesta:", { rowId, data });
          actualizarCuentaContable(rowId, data.cuenta?.trim() ?? "");
        } else {
          console.log("[sugerir-cuenta] Error:", {
            rowId,
            status: response.status,
          });
          actualizarCuentaContable(rowId, "");
        }
      } catch (err) {
        console.log("[sugerir-cuenta] Error:", err);
        actualizarCuentaContable(rowId, "");
      }
    },
    [actualizarCuentaContable],
  );

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const xmlFiles = Array.from(files).filter(isXmlFile);
    if (xmlFiles.length === 0) {
      setError("Solo se permiten archivos XML.");
      return;
    }

    const newRows: FacturaRow[] = [];
    const errors: string[] = [];

    for (const file of xmlFiles) {
      try {
        const xml = await file.text();
        const parsed = parseCfdiXml(xml);
        newRows.push({
          ...parsed,
          id: crypto.randomUUID(),
          cuentaContable: "",
        });
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

    if (newRows.length > 0) {
      setFacturas((prev) => [...prev, ...newRows]);
      for (const row of newRows) {
        void solicitarSugerenciaCuenta(
          row.id,
          row.proveedor,
          row.concepto,
          row.total,
        );
      }
    }

    if (errors.length > 0) {
      setError(errors.join(" "));
    } else {
      setError(null);
    }
  }, [solicitarSugerenciaCuenta]);

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

  const updateCuentaContable = (id: string, value: string) => {
    actualizarCuentaContable(id, value);
  };

  const exportToExcel = () => {
    const data = facturas.map((row) => ({
      Proveedor: row.proveedor,
      RFC: row.rfc,
      Fecha: row.fecha,
      UUID: row.uuid,
      Subtotal: row.subtotal,
      IVA: row.iva,
      Total: row.total,
      "Cuenta contable": row.cuentaContable,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");
    XLSX.writeFile(workbook, "facturas.xlsx");
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold tracking-tight text-green-600">
          ContaLink
        </span>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Subir facturas
        </h1>

        <div className="mt-8 flex flex-col items-center">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex w-full max-w-xl flex-col items-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
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
              Arrastra tus archivos XML aquí
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="sr-only"
            id={inputId}
            multiple
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            O selecciona archivos
          </button>

          {error && (
            <p className="mt-4 text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-10 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 font-medium text-zinc-500">
                  Proveedor
                </th>
                <th className="px-4 py-3 font-medium text-zinc-500">RFC</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Fecha</th>
                <th className="px-4 py-3 font-medium text-zinc-500">UUID</th>
                <th className="px-4 py-3 font-medium text-zinc-500">
                  Subtotal
                </th>
                <th className="px-4 py-3 font-medium text-zinc-500">IVA</th>
                <th className="px-4 py-3 font-medium text-zinc-500">Total</th>
                <th className="px-4 py-3 font-medium text-zinc-500">
                  Cuenta contable
                </th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-zinc-400"
                  >
                    Ningún archivo cargado aún
                  </td>
                </tr>
              ) : (
                facturas.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-3 text-zinc-900">{row.proveedor}</td>
                    <td className="px-4 py-3 text-zinc-900">{row.rfc}</td>
                    <td className="px-4 py-3 text-zinc-900">{row.fecha}</td>
                    <td
                      className="px-4 py-3 font-mono text-zinc-900"
                      title={row.uuid}
                    >
                      {formatUuidDisplay(row.uuid)}
                    </td>
                    <td className="px-4 py-3 text-zinc-900">{row.subtotal}</td>
                    <td className="px-4 py-3 text-zinc-900">{row.iva}</td>
                    <td className="px-4 py-3 text-zinc-900">{row.total}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.cuentaContable}
                        onChange={(e) =>
                          updateCuentaContable(row.id, e.target.value)
                        }
                        disabled={row.cuentaContable === ANALIZANDO_CUENTA}
                        placeholder=""
                        className={`w-full min-w-[120px] rounded border border-zinc-300 px-2 py-1.5 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:cursor-wait disabled:bg-zinc-50 ${
                          row.cuentaContable === ANALIZANDO_CUENTA
                            ? "italic text-zinc-400"
                            : "text-zinc-900"
                        }`}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {facturas.length > 0 && (
          <button
            type="button"
            onClick={exportToExcel}
            className="mt-6 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            Exportar a Excel
          </button>
        )}
      </main>
    </div>
  );
}
