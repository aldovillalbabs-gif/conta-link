import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold tracking-tight text-green-600">
          ContaLink
        </span>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Automatiza tu proceso contable
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600">
          Sube tus facturas, nosotros hacemos el resto
        </p>
        <Link
          href="/dashboard"
          className="mt-10 rounded-lg bg-green-600 px-8 py-3.5 text-base font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
        >
          Subir facturas
        </Link>
      </main>
    </div>
  );
}
