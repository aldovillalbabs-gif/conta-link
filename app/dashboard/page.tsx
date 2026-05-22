import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardClientesList from "./DashboardClientesList";
import NavContador from "@/components/NavContador";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

type Cliente = {
  id: string;
  nombre: string;
  rfc: string | null;
  sistema_contable: string;
  slug: string;
  contador_id: string;
  token: string | null;
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
      destacada: true,
    },
    {
      titulo: "Docs por clasificar",
      valor: String(docsPorClasificar),
      subtexto: `IA clasificó ${facturasClasificadas} solos`,
      valorClass: "text-amber-500",
      destacada: false,
    },
    {
      titulo: "Exportaciones listas",
      valor: String(exportacionesListas),
      subtexto: "Listas para CONTPAQi",
      valorClass: "text-green-500",
      destacada: false,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      <NavContador />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Mis clientes — mayo 2026
            </h1>
            <p className="mt-2 text-zinc-500">
              Selecciona un cliente para revisar sus documentos.
            </p>
          </div>
          <Link
            href="/exportar"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Nueva exportación
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {metricas.map((metrica) => (
            <div
              key={metrica.titulo}
              className={`rounded-lg border p-5 ${
                metrica.destacada
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  metrica.destacada ? "text-zinc-300" : "text-zinc-500"
                }`}
              >
                {metrica.titulo}
              </p>
              <p
                className={`mt-2 text-3xl font-bold tracking-tight ${
                  metrica.destacada
                    ? "text-white"
                    : metrica.valorClass ?? "text-zinc-900"
                }`}
              >
                {metrica.valor}
              </p>
              <p
                className={`mt-1 text-sm ${
                  metrica.destacada ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                {metrica.subtexto}
              </p>
            </div>
          ))}
        </div>

        {listaClientes.length === 0 ? (
          <p className="mt-16 text-center text-zinc-500">
            Aún no tienes clientes. Ve a la sección Clientes para agregar uno.
          </p>
        ) : (
          <DashboardClientesList clientes={clientesConFacturas} />
        )}
      </main>
    </div>
  );
}
