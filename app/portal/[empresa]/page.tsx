import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";
import { SubirFacturasPortal } from "./SubirFacturasPortal";

type PageProps = {
  params: Promise<{ empresa: string }>;
};

type Cliente = {
  id: string;
  nombre: string;
  slug: string;
};

type Factura = {
  id: string;
  proveedor: string;
  fecha: string | null;
  cuenta_contable: string | null;
  created_at: string;
};

function parseDate(value: string): Date {
  if (value.includes("T")) {
    return new Date(value);
  }

  return new Date(`${value}T12:00:00`);
}

function formatFecha(value: string): string {
  return parseDate(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isCurrentMonth(value: string): boolean {
  const date = parseDate(value);
  const now = new Date();
  return (
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function getBadge(factura: Factura) {
  if (factura.cuenta_contable?.trim()) {
    return {
      label: "Procesado",
      className: "bg-green-100 text-green-800",
    };
  }

  return {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800",
  };
}

export default async function PortalEmpresaPage({ params }: PageProps) {
  const { empresa: empresaSlug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienteData } = await supabase
    .from("clientes")
    .select("id, nombre, slug")
    .eq("slug", empresaSlug)
    .maybeSingle();

  const cliente = clienteData as Cliente | null;

  if (!cliente) {
    return (
      <div className="min-h-screen bg-white">
        <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 sm:px-10">
          <span className="text-xl font-semibold tracking-tight text-green-600">
            ContaLink
          </span>
        </header>

        <main className="mx-auto max-w-3xl px-6 py-20 text-center sm:px-10">
          <p className="text-lg font-medium text-zinc-700">Portal no encontrado</p>
        </main>
      </div>
    );
  }

  const { data: facturasData } = await supabase
    .from("facturas")
    .select("id, proveedor, fecha, cuenta_contable, created_at")
    .eq("cliente_id", cliente.id)
    .order("created_at", { ascending: false });

  const facturas = (facturasData ?? []) as Factura[];

  const documentosEsteMes = facturas.filter((factura) =>
    isCurrentMonth(factura.created_at),
  ).length;

  const ultimoEnvio = facturas[0]
    ? formatFecha(facturas[0].created_at)
    : "—";

  const estadoMes =
    facturas.length > 0
      ? { valor: "Al corriente", valorClass: "text-green-600" }
      : { valor: "Sin documentos", valorClass: "text-zinc-900" };

  const metricas = [
    { titulo: "Documentos este mes", valor: String(documentosEsteMes) },
    { titulo: "Último envío", valor: ultimoEnvio },
    {
      titulo: "Estado del mes",
      valor: estadoMes.valor,
      valorClass: estadoMes.valorClass,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold tracking-tight text-green-600">
          ContaLink
        </span>
        <span className="text-sm font-medium text-zinc-700">{cliente.nombre}</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Bienvenido, {cliente.nombre}
        </h1>
        <p className="mt-2 text-zinc-600">
          Tu contador revisa tus documentos cada semana.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {metricas.map((metrica) => (
            <div
              key={metrica.titulo}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3"
            >
              <p className="text-xs font-medium text-zinc-500">{metrica.titulo}</p>
              <p
                className={`mt-1 text-lg font-semibold text-zinc-900 ${
                  "valorClass" in metrica ? metrica.valorClass : ""
                }`}
              >
                {metrica.valor}
              </p>
            </div>
          ))}
        </div>

        <SubirFacturasPortal clienteId={cliente.id} />

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">
            Documentos recientes
          </h2>
          {facturas.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              Aún no hay documentos registrados.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {facturas.map((factura) => {
                const badge = getBadge(factura);
                const fechaMostrar = factura.fecha
                  ? formatFecha(factura.fecha)
                  : formatFecha(factura.created_at);

                return (
                  <li
                    key={factura.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        Factura
                      </p>
                      <p className="font-medium text-zinc-900">{factura.proveedor}</p>
                      <p className="text-sm text-zinc-500">{fechaMostrar}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-10 rounded-lg border border-green-200 bg-green-50 px-4 py-4">
          <p className="text-sm text-green-900">
            <span className="font-semibold">Mensaje de tu contador:</span> Sube tus
            facturas del mes para que pueda procesarlas.
          </p>
        </div>
      </main>
    </div>
  );
}
