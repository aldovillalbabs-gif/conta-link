import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import NavContador from "@/components/NavContador";

const SISTEMAS_CONTABLES = [
  "CONTPAQi",
  "Aspel COI",
  "QuickBooks",
  "SAP Business One",
  "Otro",
] as const;

type Cliente = {
  id: string;
  nombre: string;
  rfc: string | null;
  sistema_contable: string;
  slug: string;
  contador_id: string;
};

function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en las variables de entorno.",
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll puede fallar en Server Components de solo lectura
        }
      },
    },
  });
}

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function crearCliente(formData: FormData) {
  "use server";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const contadorId = "dcb4cd75-0a68-4488-9a99-05bd28d99eb7";

  const nombre = String(formData.get("nombre") ?? "").trim();
  const rfc = String(formData.get("rfc") ?? "").trim();
  const sistemaContable = String(formData.get("sistema_contable") ?? "").trim();

  if (!nombre) {
    redirect(
      `/clientes?nuevo=true&error=${encodeURIComponent("El nombre es requerido.")}`,
    );
  }

  if (
    !SISTEMAS_CONTABLES.includes(
      sistemaContable as (typeof SISTEMAS_CONTABLES)[number],
    )
  ) {
    redirect(
      `/clientes?nuevo=true&error=${encodeURIComponent("Sistema contable inválido.")}`,
    );
  }

  const slug = slugify(nombre);

  if (!slug) {
    redirect(
      `/clientes?nuevo=true&error=${encodeURIComponent("El nombre no genera un identificador válido.")}`,
    );
  }

  const { error: insertError } = await supabase.from("clientes").insert({
    nombre,
    rfc: rfc || null,
    sistema_contable: sistemaContable,
    contador_id: contadorId,
    slug,
  });

  if (insertError) {
    redirect(
      `/clientes?nuevo=true&error=${encodeURIComponent(insertError.message)}`,
    );
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; error?: string }>;
}) {
  const params = await searchParams;
  const mostrarFormulario = params.nuevo === "true";
  const errorMensaje = params.error ? decodeURIComponent(params.error) : null;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clientes, error: fetchError } = await supabase
    .from("clientes")
    .select("id, nombre, rfc, sistema_contable, slug, contador_id")
    .eq("contador_id", user.id)
    .order("nombre", { ascending: true });

  const listaClientes = (clientes ?? []) as Cliente[];

  return (
    <div className="min-h-screen bg-white">
      <NavContador />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Mis clientes
            </h1>
          </div>
          {!mostrarFormulario && (
            <Link
              href="/clientes?nuevo=true"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
            >
              Agregar cliente
            </Link>
          )}
        </div>

        {fetchError && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            No se pudieron cargar los clientes.
          </p>
        )}

        {mostrarFormulario && (
          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Agregar cliente
            </h2>

            <form action={crearCliente} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="nombre"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Nombre de la empresa
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label
                  htmlFor="rfc"
                  className="block text-sm font-medium text-zinc-700"
                >
                  RFC
                </label>
                <input
                  id="rfc"
                  name="rfc"
                  type="text"
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                />
              </div>

              <div>
                <label
                  htmlFor="sistema_contable"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Sistema contable
                </label>
                <select
                  id="sistema_contable"
                  name="sistema_contable"
                  defaultValue="CONTPAQi"
                  className="mt-1.5 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                >
                  {SISTEMAS_CONTABLES.map((sistema) => (
                    <option key={sistema} value={sistema}>
                      {sistema}
                    </option>
                  ))}
                </select>
              </div>

              {errorMensaje && (
                <p className="text-sm text-red-600" role="alert">
                  {errorMensaje}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Link
                  href="/clientes"
                  className="flex flex-1 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  Guardar cliente
                </button>
              </div>
            </form>
          </div>
        )}

        {!fetchError && listaClientes.length === 0 && !mostrarFormulario && (
          <p className="mt-16 text-center text-zinc-500">
            Aún no tienes clientes. Agrega tu primer cliente para comenzar.
          </p>
        )}

        {!fetchError && listaClientes.length > 0 && (
          <ul className={`space-y-3 ${mostrarFormulario ? "mt-8" : "mt-8"}`}>
            {listaClientes.map((cliente) => (
              <li
                key={cliente.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700">
                  {getInitials(cliente.nombre)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{cliente.nombre}</p>
                  <p className="text-sm text-zinc-500">
                    {cliente.rfc ? `RFC: ${cliente.rfc}` : "Sin RFC"}
                  </p>
                  <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                    {cliente.sistema_contable}
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/portal/${cliente.slug}`}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Ver portal
                  </Link>
                  <Link
                    href="/subir"
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    Subir facturas
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
