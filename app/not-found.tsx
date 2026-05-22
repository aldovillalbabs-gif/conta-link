import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-6">
      <span className="text-2xl font-semibold tracking-tight text-green-600">
        ContaLink
      </span>
      <p className="mt-10 text-8xl font-bold tracking-tight text-zinc-300 sm:text-9xl">
        404
      </p>
      <p className="mt-4 text-lg text-zinc-600">Esta página no existe</p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
