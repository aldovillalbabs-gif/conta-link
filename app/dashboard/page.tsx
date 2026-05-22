import Link from "next/link";

const metricas = [
  {
    titulo: "Clientes activos",
    valor: "18",
    subtexto: "3 con docs pendientes",
    valorClass: "text-zinc-900",
  },
  {
    titulo: "Docs por clasificar",
    valor: "11",
    subtexto: "IA clasificó 34 solos",
    valorClass: "text-amber-600",
  },
  {
    titulo: "Exportaciones listas",
    valor: "6",
    subtexto: "Listas para CONTPAQi",
    valorClass: "text-green-600",
  },
] as const;

const clientes = [
  {
    nombre: "Tortillería El Sol",
    slug: "tortilleria-el-sol",
    iniciales: "TE",
    docs: 14,
    pendientes: 3,
    progreso: 79,
    progresoColor: "bg-green-500",
    badge: "3 pendientes",
    badgeClass: "bg-amber-100 text-amber-800",
  },
  {
    nombre: "Farmacia Medina",
    slug: "farmacia-medina",
    iniciales: "FM",
    docs: 22,
    pendientes: 0,
    progreso: 100,
    progresoColor: "bg-green-500",
    badge: "Listo",
    badgeClass: "bg-green-100 text-green-800",
  },
  {
    nombre: "Constructora Pérez",
    slug: "constructora-perez",
    iniciales: "CP",
    docs: 8,
    pendientes: 8,
    progreso: 12,
    progresoColor: "bg-amber-500",
    badge: "Nuevo",
    badgeClass: "bg-purple-100 text-purple-800",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold tracking-tight text-green-600">
          ContaLink
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-700">
            C.P. Ramírez
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
            CR
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Mis clientes — mayo 2026
        </h1>
        <p className="mt-2 text-zinc-600">
          Selecciona un cliente para revisar sus documentos.
        </p>

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

        <ul className="mt-10 space-y-3">
          {clientes.map((cliente) => (
            <li key={cliente.nombre}>
              <Link
                href={`/portal/${cliente.slug}`}
                className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                  {cliente.iniciales}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-zinc-900">
                      {cliente.nombre}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cliente.badgeClass}`}
                    >
                      {cliente.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {cliente.docs} docs
                    {cliente.pendientes > 0
                      ? ` · ${cliente.pendientes} pendientes`
                      : " · 0 pendientes"}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full ${cliente.progresoColor}`}
                      style={{ width: `${cliente.progreso}%` }}
                    />
                  </div>
                </div>

                <span className="hidden shrink-0 text-sm font-medium text-zinc-400 sm:block">
                  {cliente.progreso}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
