import NavContador from "@/components/NavContador";

export default function ConfiguracionPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavContador />
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Configuración
        </h1>
        <p className="mt-2 text-zinc-600">
          Ajustes de cuenta y preferencias del contador.
        </p>
      </main>
    </div>
  );
}
