"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: nombre.trim(),
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-green-600"
          >
            ContaLink
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Regístrate para empezar a usar ContaLink
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-zinc-700"
            >
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              autoComplete="name"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-zinc-700"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          {error && (
            <p className="text-center text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-zinc-600">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-green-600 hover:text-green-700"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
