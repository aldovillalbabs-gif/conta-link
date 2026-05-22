import Link from "next/link";
import NavContador from "@/components/NavContador";

export default function ClientesPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavContador />
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Clientes
        </h1>
        <p className="mt-2 text-zinc-600">
          Gestiona tus clientes desde el dashboard.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-green-600 hover:text-green-700"
        >
          Ir al dashboard →
        </Link>
      </main>
    </div>
  );
}
