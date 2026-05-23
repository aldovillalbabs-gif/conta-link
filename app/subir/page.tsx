"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import NavContador from "@/components/NavContador";
import { listarClientesAccesibles } from "@/lib/clientes-acceso";
import {
  formatMoneyDisplay,
  isPdfOrImageFile,
  leerFacturaDesdeArchivo,
  mapFacturaExtraida,
} from "@/lib/leer-factura";

const CFDI_NS = "http://www.sat.gob.mx/cfd/4";
const TIMBRE_NS = "http://www.sat.gob.mx/TimbreFiscalDigital";

type ClienteOption = {
  id: string;
  nombre: string;
};

type FacturaRow = {
  id: string;
  facturaDbId?: string;
  cuentaAprobada?: boolean;
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

const SUGIRIENDO_CUENTA = "Sugiriendo...";

function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function moneyToNumber(value: string): number {
  return Number.parseFloat(value.replace(/,/g, ""));
}

type GuardarFacturaInput = {
  cliente_id: string;
  proveedor: string;
  rfc_emisor: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  uuid_cfdi: string;
  cuenta_contable: string;
};

async function guardarFactura(data: GuardarFacturaInput) {
  const supabase = createSupabaseBrowserClient();
  const { data: inserted, error } = await supabase
    .from("facturas")
    .insert(data)
    .select("id")
    .single();

  return { id: inserted?.id as string | undefined, error };
}

async function actualizarCuentaContableFactura(
  facturaDbId: string,
  cuenta_contable: string,
) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("facturas")
    .update({ cuenta_contable })
    .eq("id", facturaDbId);

  return { error };
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50">
          <NavContador />
          <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
            <p className="text-sm text-zinc-500">Cargando...</p>
          </main>
        </div>
      }
    >
      <SubirPageContent />
    </Suspense>
  );
}

function SubirPageContent() {
  const searchParams = useSearchParams();
  const clienteIdParam = searchParams.get("clienteId");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [facturas, setFacturas] = useState<FacturaRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [leyendoDocumento, setLeyendoDocumento] = useState(false);

  useEffect(() => {
    async function cargarClientes() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const lista = await listarClientesAccesibles(supabase, user.id);
      setClientes(lista);

      if (
        clienteIdParam &&
        lista.some((cliente) => cliente.id === clienteIdParam)
      ) {
        setClienteId(clienteIdParam);
      } else if (lista.length > 0) {
        setClienteId((prev) => prev || lista[0].id);
      }
    }

    void cargarClientes();
  }, [clienteIdParam]);

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
    async (rowId: string, proveedor: string, concepto: string) => {
      actualizarCuentaContable(rowId, SUGIRIENDO_CUENTA);

      const proveedorTrim = proveedor.trim();
      const conceptoTrim = concepto.trim();
      const conceptoFinal =
        conceptoTrim && conceptoTrim !== "Sin concepto"
          ? conceptoTrim
          : proveedorTrim;

      const payload = {
        proveedor: proveedorTrim,
        concepto: conceptoFinal,
      };

      try {
        const response = await fetch("/api/sugerir-cuenta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = (await response.json()) as { cuenta?: string };
          actualizarCuentaContable(rowId, data.cuenta?.trim() ?? "");
        } else {
          actualizarCuentaContable(rowId, "");
        }
      } catch {
        actualizarCuentaContable(rowId, "");
      }
    },
    [actualizarCuentaContable],
  );

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
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

    if (!clienteId) {
      setError("Selecciona un cliente antes de subir facturas.");
      return;
    }

    const newRows: FacturaRow[] = [];
    const errors: string[] = [];

    for (const file of xmlFiles) {
      try {
        const xml = await file.text();
        const parsed = parseCfdiXml(xml);
        const row: FacturaRow = {
          ...parsed,
          id: crypto.randomUUID(),
          cuentaContable: "",
        };

        const { id: facturaDbId, error: saveError } = await guardarFactura({
          cliente_id: clienteId,
          proveedor: parsed.proveedor,
          rfc_emisor: parsed.rfc,
          fecha: parsed.fecha,
          subtotal: moneyToNumber(parsed.subtotal),
          iva: moneyToNumber(parsed.iva),
          total: moneyToNumber(parsed.total),
          uuid_cfdi: parsed.uuid,
          cuenta_contable: "",
        });

        if (saveError) {
          errors.push(
            xmlFiles.length > 1
              ? `${file.name}: ${saveError.message}`
              : saveError.message,
          );
          continue;
        }

        if (facturaDbId) {
          row.facturaDbId = facturaDbId;
        }

        newRows.push(row);
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
      setError(null);
    }

    for (const file of documentFiles) {
      try {
        const extraida = await leerFacturaDesdeArchivo(file);
        const parsed = mapFacturaExtraida(extraida);
        const row: FacturaRow = {
          id: crypto.randomUUID(),
          proveedor: parsed.proveedor,
          concepto: parsed.concepto,
          rfc: parsed.rfc,
          fecha: parsed.fecha,
          uuid: parsed.uuid,
          subtotal: formatMoneyDisplay(parsed.subtotal),
          iva: formatMoneyDisplay(parsed.iva),
          total: formatMoneyDisplay(parsed.total),
          cuentaContable: "",
        };

        const { id: facturaDbId, error: saveError } = await guardarFactura({
          cliente_id: clienteId,
          proveedor: parsed.proveedor,
          rfc_emisor: parsed.rfc,
          fecha: parsed.fecha,
          subtotal: parsed.subtotal,
          iva: parsed.iva,
          total: parsed.total,
          uuid_cfdi: parsed.uuid,
          cuenta_contable: "",
        });

        if (saveError) {
          errors.push(
            documentFiles.length > 1
              ? `${file.name}: ${saveError.message}`
              : saveError.message,
          );
          continue;
        }

        if (facturaDbId) {
          row.facturaDbId = facturaDbId;
        }

        newRows.push(row);
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

    if (newRows.length > 0) {
      setFacturas((prev) => [...prev, ...newRows]);
      for (const row of newRows) {
        void solicitarSugerenciaCuenta(row.id, row.proveedor, row.concepto);
      }
    }

    if (errors.length > 0) {
      setError(errors.join(" "));
    } else {
      setError(null);
    }
  }, [clienteId, solicitarSugerenciaCuenta]);

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
    setFacturas((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, cuentaContable: value, cuentaAprobada: false } : row,
      ),
    );
  };

  const aprobarCuentaContable = async (rowId: string) => {
    const row = facturas.find((item) => item.id === rowId);
    if (!row?.facturaDbId || !row.cuentaContable || row.cuentaContable === SUGIRIENDO_CUENTA) {
      return;
    }

    const { error: updateError } = await actualizarCuentaContableFactura(
      row.facturaDbId,
      row.cuentaContable,
    );

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setFacturas((prev) =>
      prev.map((item) =>
        item.id === rowId ? { ...item, cuentaAprobada: true } : item,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <NavContador />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Volver al dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Subir facturas
        </h1>

        <div className="mt-6 w-full max-w-xl">
          <label
            htmlFor="cliente"
            className="block text-sm font-medium text-zinc-700"
          >
            Cliente:
          </label>
          <select
            id="cliente"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {clientes.length === 0 ? (
              <option value="">Sin clientes registrados</option>
            ) : (
              clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))
            )}
          </select>
        </div>

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
              Arrastra tus archivos XML, PDF o imágenes aquí
            </p>
            {leyendoDocumento && (
              <p className="mt-2 text-center text-sm font-medium text-zinc-900">
                Leyendo documento con IA...
              </p>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xml,.pdf,application/xml,text/xml,application/pdf,image/jpeg,image/png,image/jpg"
            className="sr-only"
            id={inputId}
            multiple
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={leyendoDocumento}
            className="mt-4 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {leyendoDocumento ? "Leyendo documento con IA..." : "O selecciona archivos"}
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
                      <div className="flex min-w-[200px] flex-col gap-2">
                        <input
                          type="text"
                          value={row.cuentaContable}
                          onChange={(e) =>
                            updateCuentaContable(row.id, e.target.value)
                          }
                          disabled={row.cuentaContable === SUGIRIENDO_CUENTA}
                          placeholder=""
                          className={`w-full rounded border border-zinc-300 px-2 py-1.5 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:cursor-wait disabled:bg-zinc-50 ${
                            row.cuentaContable === SUGIRIENDO_CUENTA
                              ? "italic text-zinc-400"
                              : "text-zinc-900"
                          }`}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void aprobarCuentaContable(row.id)}
                            disabled={
                              row.cuentaAprobada ||
                              !row.facturaDbId ||
                              !row.cuentaContable ||
                              row.cuentaContable === SUGIRIENDO_CUENTA
                            }
                            className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          {row.cuentaAprobada ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Aprobado
                            </span>
                          ) : row.facturaDbId ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Pendiente
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {facturas.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFacturas([]);
                setError(null);
              }}
              className="rounded-lg border border-red-200 bg-red-50 px-6 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              Limpiar tabla
            </button>
            <Link
              href="/exportar"
              className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            >
              Exportar a CONTPAQi →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
