import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import NavContador from "@/components/NavContador";
import {
  getContadorAuthInfo,
  getContadorProfile,
} from "@/lib/contadores";
import { createClient } from "@/lib/supabase-server";

type FacturaResumen = {
  cliente_id: string;
  cuenta_contable: string | null;
};

type ContadorStats = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  totalClientes: number;
  facturasPendientes: number;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getContadorProfile(user.id);

  if (!profile || profile.rol !== "admin" || !profile.despacho_id) {
    redirect("/dashboard");
  }

  const { data: contadoresRows } = await supabase
    .from("contadores")
    .select("id, rol")
    .eq("despacho_id", profile.despacho_id)
    .order("created_at", { ascending: true });

  const contadorIds = (contadoresRows ?? []).map((contador) => contador.id);

  const { data: clientesRows } =
    contadorIds.length > 0
      ? await supabase
          .from("clientes")
          .select("id, contador_id")
          .in("contador_id", contadorIds)
      : { data: [] as { id: string; contador_id: string }[] };

  const clienteIds = (clientesRows ?? []).map((cliente) => cliente.id);

  const { data: facturasRows } =
    clienteIds.length > 0
      ? await supabase
          .from("facturas")
          .select("cliente_id, cuenta_contable")
          .in("cliente_id", clienteIds)
      : { data: [] as FacturaResumen[] };

  const facturasList = facturasRows ?? [];
  const clientesList = clientesRows ?? [];

  const contadoresStats: ContadorStats[] = await Promise.all(
    (contadoresRows ?? []).map(async (contador) => {
      const authInfo = await getContadorAuthInfo(contador.id);
      const clientesContador = clientesList.filter(
        (cliente) => cliente.contador_id === contador.id,
      );
      const clienteIdsContador = clientesContador.map((cliente) => cliente.id);
      const facturasContador = facturasList.filter((factura) =>
        clienteIdsContador.includes(factura.cliente_id),
      );
      const pendientes = facturasContador.filter(
        (factura) => !factura.cuenta_contable?.trim(),
      ).length;

      return {
        id: contador.id,
        nombre: authInfo?.nombre ?? "Contador",
        email: authInfo?.email ?? "—",
        rol: contador.rol,
        totalClientes: clientesContador.length,
        facturasPendientes: pendientes,
      };
    }),
  );

  const totalClientes = clientesList.length;
  const totalPendientes = facturasList.filter(
    (factura) => !factura.cuenta_contable?.trim(),
  ).length;
  const totalAprobadas = facturasList.filter((factura) =>
    factura.cuenta_contable?.trim(),
  ).length;

  const { data: despacho } = await supabase
    .from("despachos")
    .select("nombre")
    .eq("id", profile.despacho_id)
    .maybeSingle();

  if (!despacho) {
    notFound();
  }

  const metricas = [
    {
      titulo: "Total clientes",
      valor: String(totalClientes),
      destacada: true,
    },
    {
      titulo: "Facturas pendientes",
      valor: String(totalPendientes),
      valorClass: "text-amber-500",
      destacada: false,
    },
    {
      titulo: "Facturas aprobadas",
      valor: String(totalAprobadas),
      valorClass: "text-green-600",
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
              Vista del despacho
            </h1>
            <p className="mt-2 text-zinc-500">
              {despacho.nombre?.trim()
                ? despacho.nombre
                : "Resumen de contadores y actividad del despacho."}
            </p>
          </div>
          <Link
            href="/configuracion"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            Configurar despacho
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
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">Contadores</h2>

          {contadoresStats.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No hay contadores en este despacho.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50">
                    {[
                      "Contador",
                      "Clientes",
                      "Pendientes",
                      "",
                    ].map((columna) => (
                      <th
                        key={columna || "acciones"}
                        className="px-4 py-3 font-medium text-zinc-500"
                      >
                        {columna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contadoresStats.map((contador) => (
                    <tr
                      key={contador.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-zinc-900">
                          {contador.nombre}
                          {contador.rol === "admin" && (
                            <span className="ml-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {contador.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-zinc-900">
                        {contador.totalClientes}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            contador.facturasPendientes > 0
                              ? "font-medium text-amber-600"
                              : "text-zinc-900"
                          }
                        >
                          {contador.facturasPendientes}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/admin/${contador.id}`}
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
                        >
                          Ver clientes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
