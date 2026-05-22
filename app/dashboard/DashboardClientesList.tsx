"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CopiarLinkPortal from "@/components/CopiarLinkPortal";

type ClienteItem = {
  id: string;
  nombre: string;
  rfc: string | null;
  sistema_contable: string;
  slug: string;
  token: string | null;
  totalFacturas: number;
  pendientes: number;
  progreso: number;
};

type DashboardClientesListProps = {
  clientes: ClienteItem[];
};

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function DashboardClientesList({
  clientes,
}: DashboardClientesListProps) {
  const pathname = usePathname();

  return (
    <ul className="mt-10 space-y-3">
      {clientes.map((cliente) => {
        const selected = pathname === `/facturas/${cliente.id}`;

        return (
          <li
            key={cliente.id}
            className={`flex items-center gap-3 rounded-lg border border-zinc-200 bg-white transition-colors ${
              selected
                ? "border-l-[3px] border-l-green-500"
                : "border-l-[3px] border-l-transparent"
            }`}
          >
            <Link
              href={`/facturas/${cliente.id}`}
              className="flex min-w-0 flex-1 items-center gap-4 p-4 transition-colors hover:bg-zinc-50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-900">
                {getInitials(cliente.nombre)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-zinc-900">{cliente.nombre}</h2>
                  <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-900">
                    {cliente.sistema_contable}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {cliente.rfc ? `RFC: ${cliente.rfc}` : "Sin RFC"}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {cliente.totalFacturas} docs
                  {cliente.pendientes > 0
                    ? ` · ${cliente.pendientes} pendientes`
                    : ""}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full rounded-full ${
                      cliente.progreso === 100
                        ? "bg-green-500"
                        : cliente.progreso === 50
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${cliente.progreso}%` }}
                  />
                </div>
              </div>

              <span className="hidden shrink-0 text-sm font-medium text-zinc-500 sm:block">
                {cliente.progreso}%
              </span>
            </Link>
            <div className="mr-4 flex shrink-0 flex-wrap gap-2">
              <CopiarLinkPortal
                slug={cliente.slug}
                token={cliente.token}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Link
                href="/exportar"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                Exportar
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
