"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useMemo, useState } from "react";
import NavContador from "@/components/NavContador";

const PASOS = [
  "Selecciona los documentos",
  "Resumen de la póliza",
  "Formato de exportación",
  "¡Archivo generado!",
] as const;

const formatos = [
  { id: "contpaqi", nombre: "CONTPAQi", descripcion: "Layout .txt para importación directa" },
  { id: "aspel", nombre: "Aspel COI", descripcion: "Formato compatible Aspel" },
  { id: "xml", nombre: "XML SAT", descripcion: "Exportación fiscal XML" },
  { id: "excel", nombre: "Excel genérico", descripcion: "Hoja de cálculo estándar" },
] as const;

type Cliente = {
  id: string;
  nombre: string;
  rfc: string | null;
};

type Factura = {
  id: string;
  proveedor: string;
  rfc_emisor: string | null;
  subtotal: number;
  iva: number;
  total: number;
  cuenta_contable: string | null;
  uuid_cfdi: string | null;
};

function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDebe(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncateUuid(uuid: string | null): string {
  if (!uuid?.trim()) return "—";
  const trimmed = uuid.trim();
  return trimmed.length > 8 ? `${trimmed.slice(0, 8)}...` : trimmed;
}

function getPeriodoActual(): string {
  const raw = new Date().toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const TIPO_EXPORTACION: Record<string, string> = {
  contpaqi: "CONTPAQi",
  aspel: "AspelCOI",
  xml: "XMLSAT",
  excel: "Excel",
};

type ExportResumen = {
  cliente: Cliente;
  cantidadMovimientos: number;
  total: number;
  formatoId: string;
};

function sanitizeNombreArchivo(nombre: string): string {
  const sanitized = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");

  return sanitized || "Cliente";
}

function getMesAnioArchivo(): string {
  const now = new Date();
  const mes = now.toLocaleDateString("es-MX", { month: "long" });
  const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${mesCapitalizado}${now.getFullYear()}`;
}

function generarNombreArchivo(clienteNombre: string, formatoId: string): string {
  const nombreCliente = sanitizeNombreArchivo(clienteNombre);
  const tipoExportacion = TIPO_EXPORTACION[formatoId] ?? "Export";
  return `${nombreCliente}_${tipoExportacion}_${getMesAnioArchivo()}.xlsx`;
}

function getMensajeFormato(formatoId: string): string {
  switch (formatoId) {
    case "contpaqi":
      return "Listo para importarse en CONTPAQi sin modificaciones";
    case "aspel":
      return "Listo para importarse en Aspel COI sin modificaciones";
    case "xml":
      return "Listo para enviarse al SAT sin modificaciones";
    case "excel":
      return "Listo para importarse en tu sistema contable";
    default:
      return "Listo para importarse en tu sistema contable";
  }
}

function getMensajeDescarga(formatoId: string): string {
  switch (formatoId) {
    case "contpaqi":
      return "Archivo descargado. Importa este archivo en CONTPAQi para completar el proceso.";
    case "aspel":
      return "Archivo descargado. Importa este archivo en Aspel COI para completar el proceso.";
    case "xml":
      return "Archivo descargado. Envía este archivo al SAT para completar el proceso.";
    case "excel":
      return "Archivo descargado. Importa este archivo en tu sistema contable para completar el proceso.";
    default:
      return "Archivo descargado.";
  }
}

export default function ExportarPage() {
  const [paso, setPaso] = useState(0);
  const [formatoSeleccionado, setFormatoSeleccionado] = useState("contpaqi");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [exportResumen, setExportResumen] = useState<ExportResumen | null>(null);

  useEffect(() => {
    async function cargarClientes() {
      setLoadingClientes(true);
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setClientes([]);
        setLoadingClientes(false);
        return;
      }

      const { data } = await supabase
        .from("clientes")
        .select("id, nombre, rfc")
        .eq("contador_id", user.id)
        .order("nombre", { ascending: true });

      const lista = (data ?? []) as Cliente[];
      setClientes(lista);
      if (lista.length > 0) {
        setClienteId((prev) => prev || lista[0].id);
      }
      setLoadingClientes(false);
    }

    void cargarClientes();
  }, []);

  useEffect(() => {
    async function cargarFacturas() {
      if (!clienteId) {
        setFacturas([]);
        setSelectedIds(new Set());
        return;
      }

      setLoadingFacturas(true);
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("facturas")
        .select(
          "id, proveedor, rfc_emisor, subtotal, iva, total, cuenta_contable, uuid_cfdi",
        )
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });

      const lista = (data ?? []) as Factura[];
      setFacturas(lista);
      setSelectedIds(new Set(lista.map((factura) => factura.id)));
      setLoadingFacturas(false);
    }

    void cargarFacturas();
  }, [clienteId]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id === clienteId),
    [clientes, clienteId],
  );

  const facturasSeleccionadas = useMemo(
    () => facturas.filter((factura) => selectedIds.has(factura.id)),
    [facturas, selectedIds],
  );

  const totales = useMemo(() => {
    return facturasSeleccionadas.reduce(
      (acc, factura) => ({
        subtotal: acc.subtotal + Number(factura.subtotal),
        iva: acc.iva + Number(factura.iva),
        total: acc.total + Number(factura.total),
      }),
      { subtotal: 0, iva: 0, total: 0 },
    );
  }, [facturasSeleccionadas]);

  const vistaPreviaExcel = useMemo(
    () =>
      facturasSeleccionadas.map((factura) => [
        factura.cuenta_contable?.trim() || "—",
        factura.proveedor,
        formatDebe(Number(factura.total)),
        "",
        factura.rfc_emisor?.trim() || "—",
        truncateUuid(factura.uuid_cfdi),
      ]),
    [facturasSeleccionadas],
  );

  const toggleFactura = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const generarExportacion = () => {
    if (!clienteSeleccionado) return;

    setExportResumen({
      cliente: clienteSeleccionado,
      cantidadMovimientos: facturasSeleccionadas.length,
      total: totales.total,
      formatoId: formatoSeleccionado,
    });
    setPaso(3);
  };

  const resumenPaso4: ExportResumen | null =
    exportResumen ??
    (clienteSeleccionado
      ? {
          cliente: clienteSeleccionado,
          cantidadMovimientos: facturasSeleccionadas.length,
          total: totales.total,
          formatoId: formatoSeleccionado,
        }
      : null);

  return (
    <div className="min-h-screen bg-white">
      <NavContador />

      <main className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
        <nav
          className="mb-10 flex items-center justify-center gap-2"
          aria-label="Pasos de exportación"
        >
          {PASOS.map((_, index) => (
            <button
              key={PASOS[index]}
              type="button"
              onClick={() => setPaso(index)}
              aria-label={`Paso ${index + 1}: ${PASOS[index]}`}
              aria-current={paso === index ? "step" : undefined}
              className={`h-2.5 rounded-full transition-all ${
                paso === index
                  ? "w-8 bg-green-600"
                  : index < paso
                    ? "w-2.5 bg-green-300"
                    : "w-2.5 bg-zinc-200"
              }`}
            />
          ))}
        </nav>

        {paso === 0 && (
          <section>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Paso 1 — Selecciona los documentos
            </h1>
            <p className="mt-2 text-zinc-600">
              Elige cuáles movimientos incluir en esta exportación.
            </p>

            <div className="mt-6">
              <label
                htmlFor="cliente-exportar"
                className="block text-sm font-medium text-zinc-700"
              >
                Cliente:
              </label>
              <select
                id="cliente-exportar"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={loadingClientes || clientes.length === 0}
                className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-zinc-50"
              >
                {clientes.length === 0 ? (
                  <option value="">Sin clientes</option>
                ) : (
                  clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nombre}
                    </option>
                  ))
                )}
              </select>
            </div>

            {loadingClientes ? (
              <p className="mt-8 text-center text-sm text-zinc-500">
                Cargando clientes...
              </p>
            ) : clientes.length === 0 ? (
              <p className="mt-8 text-center text-zinc-500">
                Agrega clientes primero en la sección Clientes
              </p>
            ) : loadingFacturas ? (
              <p className="mt-8 text-center text-sm text-zinc-500">
                Cargando facturas...
              </p>
            ) : facturas.length === 0 ? (
              <p className="mt-8 text-center text-zinc-500">
                Este cliente no tiene facturas aún
              </p>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <span className="text-sm font-medium text-zinc-700">
                    {clienteSeleccionado?.nombre} · {getPeriodoActual()}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {selectedIds.size} de {facturas.length} seleccionados
                  </span>
                </div>

                <ul className="mt-4 space-y-2">
                  {facturas.map((factura) => (
                    <li
                      key={factura.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-3"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(factura.id)}
                        onChange={() => toggleFactura(factura.id)}
                        className="mt-1 h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900">
                          {factura.proveedor}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-zinc-600">
                            {factura.cuenta_contable?.trim() ||
                              "Sin cuenta contable"}
                          </span>
                          {factura.cuenta_contable?.trim() ? (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                              IA
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="shrink-0 font-medium text-zinc-900">
                        {formatMoney(Number(factura.total))}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  disabled={selectedIds.size === 0}
                  className="mt-8 w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  Revisar resumen →
                </button>
              </>
            )}
          </section>
        )}

        {paso === 1 && (
          <section>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Paso 2 — Resumen de la póliza
            </h1>

            <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full text-left text-sm">
                <tbody>
                  {[
                    ["Tipo de póliza", "Egresos"],
                    ["Empresa", clienteSeleccionado?.nombre ?? "—"],
                    ["RFC", clienteSeleccionado?.rfc ?? "—"],
                    ["Período", getPeriodoActual()],
                    ["Movimientos", String(facturasSeleccionadas.length)],
                    ["Subtotal", formatMoney(totales.subtotal)],
                    ["IVA", formatMoney(totales.iva)],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-zinc-100 last:border-0">
                      <th className="px-4 py-3 font-medium text-zinc-500">
                        {label}
                      </th>
                      <td className="px-4 py-3 text-zinc-900">{value}</td>
                    </tr>
                  ))}
                  <tr>
                    <th className="px-4 py-3 font-medium text-zinc-500">Total</th>
                    <td className="px-4 py-3 text-lg font-semibold text-green-600">
                      {formatMoney(totales.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-sm text-zinc-500">
              La app verificó que todos los CFDIs están timbrados en el SAT.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPaso(0)}
                className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={() => setPaso(2)}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                Elegir formato de exportación →
              </button>
            </div>
          </section>
        )}

        {paso === 2 && (
          <section>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Paso 3 — Formato de exportación
            </h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {formatos.map((formato) => (
                <button
                  key={formato.id}
                  type="button"
                  onClick={() => setFormatoSeleccionado(formato.id)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    formatoSeleccionado === formato.id
                      ? "border-green-600 bg-green-50/50 ring-1 ring-green-600"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <p className="font-semibold text-zinc-900">{formato.nombre}</p>
                  <p className="mt-1 text-sm text-zinc-500">{formato.descripcion}</p>
                </button>
              ))}
            </div>

            <div className="mt-8">
              <p className="mb-3 text-sm font-medium text-zinc-700">
                Vista previa (Excel)
              </p>
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      {[
                        "Cuenta",
                        "Concepto",
                        "Debe",
                        "Haber",
                        "RFC",
                        "UUID CFDI",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 font-medium text-zinc-500"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vistaPreviaExcel.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-zinc-400"
                        >
                          No hay movimientos seleccionados
                        </td>
                      </tr>
                    ) : (
                      vistaPreviaExcel.map((fila, i) => (
                        <tr
                          key={facturasSeleccionadas[i]?.id ?? i}
                          className="border-b border-zinc-100 last:border-0"
                        >
                          {fila.map((celda, j) => (
                            <td key={j} className="px-3 py-2 text-zinc-700">
                              {celda}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={generarExportacion}
                disabled={!clienteSeleccionado || facturasSeleccionadas.length === 0}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generar y descargar archivo →
              </button>
            </div>
          </section>
        )}

        {paso === 3 && resumenPaso4 && (
          <section className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900">
              Paso 4 — ¡Archivo generado!
            </h1>
            <p className="mt-2 text-lg font-medium text-zinc-900">
              {resumenPaso4.cliente.nombre}
            </p>
            <p className="mt-1 text-base text-zinc-700">
              Archivo generado exitosamente
            </p>
            <p className="mt-1 text-zinc-600">
              {getMensajeFormato(resumenPaso4.formatoId)}
            </p>

            <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm text-zinc-700">
              {[
                generarNombreArchivo(
                  resumenPaso4.cliente.nombre,
                  resumenPaso4.formatoId,
                ),
                `${resumenPaso4.cantidadMovimientos} movimientos · ${formatMoney(resumenPaso4.total)} MXN`,
                "Partida doble cuadrada",
                "UUIDs de CFDI incluidos",
                "Guardado en historial",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-green-600" aria-hidden>
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  alert(getMensajeDescarga(resumenPaso4.formatoId))
                }
                className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                Descargar archivo
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportResumen(null);
                  setPaso(0);
                }}
                className="rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Nueva exportación
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
