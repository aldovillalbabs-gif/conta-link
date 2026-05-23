import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FacturasClienteTable from "@/app/facturas/[clienteId]/FacturasClienteTable";
import NavContador from "@/components/NavContador";
import { getContadorProfile } from "@/lib/contadores";
import { createClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{ contadorId: string; clienteId: string }>;
};

type Cliente = {
  id: string;
  nombre: string;
  rfc: string | null;
  contador_id: string;
};

export default async function AdminClienteFacturasPage({ params }: PageProps) {
  const { contadorId, clienteId } = await params;
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

  const { data: clienteData } = await supabase
    .from("clientes")
    .select("id, nombre, rfc, contador_id")
    .eq("id", clienteId)
    .maybeSingle();

  const cliente = clienteData as Cliente | null;

  if (!cliente || cliente.contador_id !== contadorId) {
    notFound();
  }

  const { data: facturasData } = await supabase
    .from("facturas")
    .select(
      "id, proveedor, rfc_emisor, fecha, subtotal, iva, total, cuenta_contable",
    )
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-50">
      <NavContador />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <Link
          href={`/admin/${contadorId}`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Volver a clientes
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Facturas — {cliente.nombre}
            </h1>
            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Solo lectura
            </span>
          </div>
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          Vista de administrador. No puedes aprobar ni eliminar facturas.
        </p>

        <FacturasClienteTable
          facturasIniciales={facturasData ?? []}
          readOnly
        />
      </main>
    </div>
  );
}
