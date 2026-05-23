"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";

export type FacturaRow = {
  id: string;
  proveedor: string;
  rfc_emisor: string | null;
  fecha: string | null;
  subtotal: number;
  iva: number;
  total: number;
  cuenta_contable: string | null;
};

type FacturaEditable = FacturaRow & {
  cuentaContable: string;
  aprobada: boolean;
};

type FacturasClienteTableProps = {
  facturasIniciales: FacturaRow[];
  readOnly?: boolean;
};

function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFecha(fecha: string | null): string {
  if (!fecha?.trim()) return "—";
  const value = fecha.includes("T") ? fecha : `${fecha}T12:00:00`;
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toEditable(factura: FacturaRow): FacturaEditable {
  const cuenta = factura.cuenta_contable?.trim() ?? "";
  return {
    ...factura,
    cuentaContable: cuenta,
    aprobada: Boolean(cuenta),
  };
}

export default function FacturasClienteTable({
  facturasIniciales,
  readOnly = false,
}: FacturasClienteTableProps) {
  const [facturas, setFacturas] = useState<FacturaEditable[]>(() =>
    facturasIniciales.map(toEditable),
  );
  const [error, setError] = useState<string | null>(null);
  const [aprobandoId, setAprobandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const updateCuentaContable = (id: string, value: string) => {
    setFacturas((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, cuentaContable: value, aprobada: false }
          : row,
      ),
    );
  };

  const aprobarFactura = async (id: string) => {
    const row = facturas.find((item) => item.id === id);
    if (!row?.cuentaContable.trim()) {
      setError("Ingresa una cuenta contable antes de aprobar.");
      return;
    }

    setAprobandoId(id);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("facturas")
      .update({ cuenta_contable: row.cuentaContable.trim() })
      .eq("id", id);

    setAprobandoId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setFacturas((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              cuentaContable: row.cuentaContable.trim(),
              aprobada: true,
              cuenta_contable: row.cuentaContable.trim(),
            }
          : item,
      ),
    );
  };

  const eliminarFactura = async (id: string) => {
    const confirmed = window.confirm(
      "¿Estás seguro de que quieres eliminar esta factura? Esta acción no se puede deshacer",
    );
    if (!confirmed) return;

    setEliminandoId(id);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: deleteError } = await supabase
      .from("facturas")
      .delete()
      .eq("id", id);

    setEliminandoId(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setFacturas((prev) => prev.filter((item) => item.id !== id));
  };

  if (facturas.length === 0) {
    return (
      <p className="mt-8 text-center text-zinc-500">
        Este cliente no tiene facturas aún.
      </p>
    );
  }

  return (
    <>
      {error && (
        <p className="mt-6 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {[
                "Proveedor",
                "RFC",
                "Fecha",
                "Subtotal",
                "IVA",
                "Total",
                "Cuenta contable",
                "Estado",
                ...(readOnly ? [] : [""]),
              ].map((columna, index) => (
                <th
                  key={columna || `col-${index}`}
                  className="px-4 py-3 font-medium text-zinc-500"
                  aria-label={columna === "" ? "Acciones" : undefined}
                >
                  {columna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facturas.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-4 py-3 text-zinc-900">{row.proveedor}</td>
                <td className="px-4 py-3 text-zinc-900">
                  {row.rfc_emisor?.trim() || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-900">
                  {formatFecha(row.fecha)}
                </td>
                <td className="px-4 py-3 text-zinc-900">
                  {formatMoney(Number(row.subtotal))}
                </td>
                <td className="px-4 py-3 text-zinc-900">
                  {formatMoney(Number(row.iva))}
                </td>
                <td className="px-4 py-3 text-zinc-900">
                  {formatMoney(Number(row.total))}
                </td>
                <td className="px-4 py-3">
                  {readOnly ? (
                    <span className="text-zinc-900">
                      {row.cuentaContable.trim() || "—"}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={row.cuentaContable}
                      onChange={(e) =>
                        updateCuentaContable(row.id, e.target.value)
                      }
                      className="w-full min-w-[180px] rounded border border-zinc-200 px-2 py-1.5 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.aprobada ? (
                      <span className="rounded-full border border-zinc-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Aprobado
                      </span>
                    ) : (
                      <>
                        <span className="rounded-full border border-zinc-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                          Pendiente
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => void aprobarFactura(row.id)}
                            disabled={
                              aprobandoId === row.id ||
                              !row.cuentaContable.trim()
                            }
                            className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {aprobandoId === row.id ? "Guardando..." : "Aprobar"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
                {!readOnly && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void eliminarFactura(row.id)}
                      disabled={eliminandoId === row.id}
                      aria-label="Eliminar factura"
                      title="Eliminar"
                      className="inline-flex rounded p-1 text-zinc-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        className="h-4 w-4"
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
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
