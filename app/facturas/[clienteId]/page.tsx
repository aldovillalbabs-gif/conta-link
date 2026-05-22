import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import FacturasClienteTable from "./FacturasClienteTable";
import PortalLinkActions from "./PortalLinkActions";
import NavContador from "@/components/NavContador";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{ clienteId: string }>;
};

type Cliente = {
  id: string;
  nombre: string;
  contador_id: string;
  slug: string;
  token: string | null;
};

export default async function FacturasClientePage({ params }: PageProps) {
  const { clienteId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clienteData } = await supabase
    .from("clientes")
    .select("id, nombre, contador_id, slug, token")
    .eq("id", clienteId)
    .maybeSingle();

  const cliente = clienteData as Cliente | null;

  if (!cliente || cliente.contador_id !== user.id) {
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
    <div className="min-h-screen bg-white">
      <NavContador />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Volver
        </Link>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Facturas — {cliente.nombre}
          </h1>
          <PortalLinkActions
            clienteId={cliente.id}
            slug={cliente.slug}
            initialToken={cliente.token}
          />
        </div>

        <FacturasClienteTable facturasIniciales={facturasData ?? []} />
      </main>
    </div>
  );
}
