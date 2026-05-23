import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import NavContador from "@/components/NavContador";
import { getContadorAuthInfo, getContadorProfile } from "@/lib/contadores";
import { createClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{ contadorId: string }>;
};

type ClienteRow = {
  id: string;
  nombre: string;
  rfc: string | null;
  contador_id: string;
};

type FacturaResumen = {
  cliente_id: string;
  cuenta_contable: string | null;
};

export default async function AdminContadorPage({ params }: PageProps) {
  const { contadorId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminProfile = await getContadorProfile(user.id);

  if (
    !adminProfile ||
    adminProfile.rol !== "admin" ||
    !adminProfile.despacho_id
  ) {
    redirect("/dashboard");
  }

  const { data: contadorTarget } = await supabase
    .from("contadores")
    .select("id, despacho_id")
    .eq("id", contadorId)
    .maybeSingle();

  if (
    !contadorTarget ||
    contadorTarget.despacho_id !== adminProfile.despacho_id
  ) {
    notFound();
  }

  const contadorInfo = await getContadorAuthInfo(contadorId);

  const { data: clientesData } = await supabase
    .from("clientes")
    .select("id, nombre, rfc, contador_id")
    .eq("contador_id", contadorId)
    .order("created_at", { ascending: false });

  const clientes = (clientesData ?? []) as ClienteRow[];
  const clienteIds = clientes.map((cliente) => cliente.id);

  const { data: facturasData } =
    clienteIds.length > 0
      ? await supabase
          .from("facturas")
          .select("cliente_id, cuenta_contable")
          .in("cliente_id", clienteIds)
      : { data: [] as FacturaResumen[] };

  const facturasList = facturasData ?? [];

  const clientesConStats = clientes.map((cliente) => {
    const facturasCliente = facturasList.filter(
      (factura) => factura.cliente_id === cliente.id,
    );
    const pendientes = facturasCliente.filter(
      (factura) => !factura.cuenta_contable?.trim(),
    ).length;

    return {
      ...cliente,
      totalFacturas: facturasCliente.length,
      pendientes,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <NavContador />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Volver al despacho
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Clientes — {contadorInfo?.nombre ?? "Contador"}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {contadorInfo?.email ?? "—"}
            </p>
          </div>
        </div>

        {clientesConStats.length === 0 ? (
          <p className="mt-12 text-center text-zinc-500">
            Este contador no tiene clientes asignados.
          </p>
        ) : (
          <div className="mt-8 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  {["Cliente", "RFC", "Facturas", "Pendientes", ""].map(
                    (columna) => (
                      <th
                        key={columna || "acciones"}
                        className="px-4 py-3 font-medium text-zinc-500"
                      >
                        {columna}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {clientesConStats.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="px-4 py-4 font-medium text-zinc-900">
                      {cliente.nombre}
                    </td>
                    <td className="px-4 py-4 text-zinc-900">
                      {cliente.rfc?.trim() || "—"}
                    </td>
                    <td className="px-4 py-4 text-zinc-900">
                      {cliente.totalFacturas}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          cliente.pendientes > 0
                            ? "font-medium text-amber-600"
                            : "text-zinc-900"
                        }
                      >
                        {cliente.pendientes}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/subir?clienteId=${cliente.id}`}
                          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
                        >
                          Subir facturas
                        </Link>
                        <Link
                          href={`/admin/${contadorId}/${cliente.id}`}
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
                        >
                          Ver facturas
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
