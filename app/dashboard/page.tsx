import Link from "next/link";
import { redirect } from "next/navigation";
import NavContador from "@/components/NavContador";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

type Cliente = {
  id: string;
  nombre: string;
  rfc: string | null;
  sistema_contable: string;
  slug: string;
  contador_id: string;
  created_at?: string;
};

type FacturaResumen = {
  cliente_id: string;
  cuenta_contable: string | null;
};

type ClienteConFacturas = Cliente & {
  totalFacturas: number;
  pendientes: number;
  progreso: number;
};

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .eq("contador_id", user.id)
    .order("created_at", { ascending: false });

  const listaClientes = (clientes ?? []) as Cliente[];

  const clienteIds = listaClientes.map((cliente) => cliente.id);
  const { data: facturas } =
    clienteIds.length > 0
      ? await supabase
          .from("facturas")
          .select("cliente_id, cuenta_contable")
          .in("cliente_id", clienteIds)
      : { data: [] as FacturaResumen[] };

  const facturasList = (facturas ?? []) as FacturaResumen[];

  const clientesConFacturas: ClienteConFacturas[] = listaClientes.map(
    (cliente) => {
      const facturasCliente = facturasList.filter(
        (factura) => factura.cliente_id === cliente.id,
      );
      const totalFacturas = facturasCliente.length;
      const pendientes = facturasCliente.filter(
        (factura) => !factura.cuenta_contable?.trim(),
      ).length;
      const progreso =
        totalFacturas === 0
          ? 0
          : pendientes === 0
            ? 100
            : 50;

      return {
        ...cliente,
        totalFacturas,
        pendientes,
        progreso,
      };
    },
  );

  const docsPorClasificar = facturasList.filter(
    (factura) => !factura.cuenta_contable?.trim(),
  ).length;

  const facturasClasificadas = facturasList.filter((factura) =>
    factura.cuenta_contable?.trim(),
  ).length;

  const exportacionesListas = new Set(
    facturasList
      .filter((factura) => factura.cuenta_contable?.trim())
      .map((factura) => factura.cliente_id),
  ).size;

  const clientesConPendientes = clientesConFacturas.filter(
    (cliente) => cliente.pendientes > 0,
  ).length;

  const metricas = [
    {
      titulo: "Clientes activos",
      valor: String(listaClientes.length),
      subtexto: `${clientesConPendientes} con docs pendientes`,
      valorClass: "text-zinc-900",
    },
    {
      titulo: "Docs por clasificar",
      valor: String(docsPorClasificar),
      subtexto: `IA clasificó ${facturasClasificadas} solos`,
      valorClass: "text-amber-600",
    },
    {
      titulo: "Exportaciones listas",
      valor: String(exportacionesListas),
      subtexto: "Listas para CONTPAQi",
      valorClass: "text-green-600",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <NavContador />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Mis clientes — mayo 2026
            </h1>
            <p className="mt-2 text-zinc-600">
              Selecciona un cliente para revisar sus documentos.
            </p>
          </div>
          <Link
            href="/exportar"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            Nueva exportación
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {metricas.map((metrica) => (
            <div
              key={metrica.titulo}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-zinc-500">
                {metrica.titulo}
              </p>
              <p
                className={`mt-2 text-3xl font-bold tracking-tight ${metrica.valorClass}`}
              >
                {metrica.valor}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{metrica.subtexto}</p>
            </div>
          ))}
        </div>

        {listaClientes.length === 0 ? (
          <p className="mt-16 text-center text-zinc-500">
            Aún no tienes clientes. Ve a la sección Clientes para agregar uno.
          </p>
        ) : (
          <ul className="mt-10 space-y-3">
            {clientesConFacturas.map((cliente) => (
              <li
                key={cliente.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white"
              >
                <Link
                  href={`/facturas/${cliente.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4 p-4 transition-colors hover:bg-zinc-50"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                    {getInitials(cliente.nombre)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-zinc-900">
                        {cliente.nombre}
                      </h2>
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
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

                  <span className="hidden shrink-0 text-sm font-medium text-zinc-400 sm:block">
                    {cliente.progreso}%
                  </span>
                </Link>
                <Link
                  href="/exportar"
                  className="mr-4 shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  Exportar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
