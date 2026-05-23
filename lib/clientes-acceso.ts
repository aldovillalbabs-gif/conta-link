import type { SupabaseClient } from "@supabase/supabase-js";

export type ClienteAccesible = {
  id: string;
  nombre: string;
  rfc: string | null;
};

export async function listarClientesAccesibles(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClienteAccesible[]> {
  const { data: profile } = await supabase
    .from("contadores")
    .select("rol, despacho_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.rol === "admin" && profile.despacho_id) {
    const { data: contadores } = await supabase
      .from("contadores")
      .select("id")
      .eq("despacho_id", profile.despacho_id);

    const contadorIds = (contadores ?? []).map((contador) => contador.id);
    if (contadorIds.length === 0) return [];

    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nombre, rfc")
      .in("contador_id", contadorIds)
      .order("nombre", { ascending: true });

    return (clientes ?? []) as ClienteAccesible[];
  }

  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nombre, rfc")
    .eq("contador_id", userId)
    .order("nombre", { ascending: true });

  return (clientes ?? []) as ClienteAccesible[];
}
