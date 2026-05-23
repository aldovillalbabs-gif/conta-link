import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export type ContadorRol = "admin" | "contador";

export type ContadorProfile = {
  id: string;
  rol: ContadorRol;
  despacho_id: string | null;
};

export type ContadorConAuth = ContadorProfile & {
  nombre: string;
  email: string;
};

export async function getContadorProfile(
  userId: string,
): Promise<ContadorProfile | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("contadores")
    .select("id, rol, despacho_id")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    rol: data.rol === "admin" ? "admin" : "contador",
    despacho_id: data.despacho_id,
  };
}

export async function getContadorAuthInfo(
  contadorId: string,
): Promise<{ nombre: string; email: string } | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.auth.admin.getUserById(contadorId);
  if (error || !data.user.email) return null;

  const metadata = data.user.user_metadata as { full_name?: string } | undefined;

  return {
    email: data.user.email,
    nombre: metadata?.full_name?.trim() || data.user.email,
  };
}

export async function getContadoresEnDespacho(
  despachoId: string,
): Promise<ContadorConAuth[]> {
  const supabase = await createClient();

  const { data: contadores } = await supabase
    .from("contadores")
    .select("id, rol, despacho_id")
    .eq("despacho_id", despachoId)
    .order("created_at", { ascending: true });

  if (!contadores?.length) return [];

  const enriched = await Promise.all(
    contadores.map(async (contador) => {
      const authInfo = await getContadorAuthInfo(contador.id);
      return {
        id: contador.id,
        rol: contador.rol === "admin" ? "admin" : "contador",
        despacho_id: contador.despacho_id,
        nombre: authInfo?.nombre ?? "Contador",
        email: authInfo?.email ?? "—",
      } satisfies ContadorConAuth;
    }),
  );

  return enriched;
}
