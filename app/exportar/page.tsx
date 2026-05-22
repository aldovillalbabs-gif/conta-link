"use client";

import { useState } from "react";

const PASOS = [
  "Selecciona los documentos",
  "Resumen de la póliza",
  "Formato de exportación",
  "¡Archivo generado!",
] as const;

const movimientos = [
  {
    id: "1",
    nombre: "Factura Telmex",
    detalle: "comunicaciones",
    cuenta: "630-004 Comunicaciones",
    monto: "$580.00",
  },
  {
    id: "2",
    nombre: "Recibo gasolina OXXO",
    detalle: "",
    cuenta: "602-001 Combustibles",
    monto: "$1,200.00",
  },
  {
    id: "3",
    nombre: "Factura Lala",
    detalle: "materia prima",
    cuenta: "500-010 Insumos producción",
    monto: "$8,400.00",
  },
  {
    id: "4",
    nombre: "Comida con clientes",
    detalle: "",
    cuenta: "630-012 Gastos representación",
    monto: "$2,340.00",
  },
  {
    id: "5",
    nombre: "Factura CFE electricidad",
    detalle: "",
    cuenta: "630-001 Servicios básicos",
    monto: "$3,100.00",
  },
] as const;

const formatos = [
  { id: "contpaqi", nombre: "CONTPAQi", descripcion: "Layout .txt para importación directa" },
  { id: "aspel", nombre: "Aspel COI", descripcion: "Formato compatible Aspel" },
  { id: "xml", nombre: "XML SAT", descripcion: "Exportación fiscal XML" },
  { id: "excel", nombre: "Excel genérico", descripcion: "Hoja de cálculo estándar" },
] as const;

const vistaPreviaExcel = [
  ["630-004", "Comunicaciones Telmex", "580.00", "", "TME850101ABC", "a1b2c3d4..."],
  ["602-001", "Combustibles OXXO", "1,200.00", "", "OXX970101XYZ", "e5f6g7h8..."],
  ["500-010", "Insumos Lala", "8,400.00", "", "LAL900101DEF", "i9j0k1l2..."],
] as const;

export default function ExportarPage() {
  const [paso, setPaso] = useState(0);
  const [formatoSeleccionado, setFormatoSeleccionado] = useState("contpaqi");

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold tracking-tight text-green-600">
          ContaLink
        </span>
      </header>

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

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <span className="text-sm font-medium text-zinc-700">
                Tortillería El Sol · Mayo 2026
              </span>
              <span className="text-sm text-zinc-500">5 de 5 seleccionados</span>
            </div>

            <ul className="mt-4 space-y-2">
              {movimientos.map((mov) => (
                <li
                  key={mov.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">
                      {mov.nombre}
                      {mov.detalle ? (
                        <span className="font-normal text-zinc-500">
                          {" "}
                          — {mov.detalle}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-zinc-600">{mov.cuenta}</span>
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                        IA
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 font-medium text-zinc-900">
                    {mov.monto}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setPaso(1)}
              className="mt-8 w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 sm:w-auto"
            >
              Revisar resumen →
            </button>
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
                    ["Empresa", "Tortillería El Sol"],
                    ["RFC", "TES850101ABC"],
                    ["Período", "Mayo 2026"],
                    ["Movimientos", "5"],
                    ["Subtotal", "$13,474.14"],
                    ["IVA", "$2,145.86"],
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
                      $15,620.00
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
                    {vistaPreviaExcel.map((fila, i) => (
                      <tr key={i} className="border-b border-zinc-100 last:border-0">
                        {fila.map((celda, j) => (
                          <td key={j} className="px-3 py-2 text-zinc-700">
                            {celda}
                          </td>
                        ))}
                      </tr>
                    ))}
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
                onClick={() => setPaso(3)}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                Generar y descargar archivo →
              </button>
            </div>
          </section>
        )}

        {paso === 3 && (
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
              Archivo generado exitosamente
            </p>
            <p className="mt-1 text-zinc-600">
              Listo para importarse en CONTPAQi sin modificaciones.
            </p>

            <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm text-zinc-700">
              {[
                "Tortilleria_El_Sol_Egresos_Mayo2026.xlsx",
                "5 movimientos · $15,620.00 MXN",
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
                className="rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                Descargar archivo
              </button>
              <button
                type="button"
                onClick={() => setPaso(0)}
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
