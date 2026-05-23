import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { buildInvitationUrl } from "@/lib/despacho-link";
import type { ContadorDespachoItem, ContadorProfile } from "@/lib/despacho-types";
import { createClient } from "@/lib/supabase-server";

function permissionMessage(errorMessage: string): string {
  if (errorMessage.includes("permission denied")) {
    return "Faltan permisos en Supabase. Ejecuta supabase/grant-despachos-permissions.sql en el SQL Editor.";
  }

  return errorMessage;
}

export async function ensureAdminProfile(
  userId: string,
): Promise<ContadorProfile> {
  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("contadores")
    .select("id, rol, despacho_id")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(permissionMessage(existingError.message));
  }

  if (existing?.despacho_id) {
    return {
      id: existing.id,
      rol: existing.rol === "admin" ? "admin" : "contador",
      despacho_id: existing.despacho_id,
    };
  }

  const { data: despacho, error: despachoError } = await supabase
    .from("despachos")
    .insert({
      nombre: "",
      admin_id: userId,
    })
    .select("id")
    .single();

  if (despachoError || !despacho) {
    throw new Error(
      permissionMessage(despachoError?.message ?? "No se pudo crear el despacho."),
    );
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("contadores")
      .update({ rol: "admin", despacho_id: despacho.id })
      .eq("id", userId);

    if (updateError) {
      throw new Error(permissionMessage(updateError.message));
    }
  } else {
    const { error: insertError } = await supabase.from("contadores").insert({
      id: userId,
      rol: "admin",
      despacho_id: despacho.id,
    });

    if (insertError) {
      throw new Error(permissionMessage(insertError.message));
    }
  }

  return {
    id: userId,
    rol: "admin",
    despacho_id: despacho.id,
  };
}

export async function getEquipoDespacho(
  despachoId: string,
): Promise<ContadorDespachoItem[]> {
  const supabase = await createClient();

  const { data: contadoresRows, error } = await supabase
    .from("contadores")
    .select("id, rol")
    .eq("despacho_id", despachoId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(permissionMessage(error.message));
  }

  const admin = createSupabaseAdminClient();
  const contadores: ContadorDespachoItem[] = [];

  for (const contador of contadoresRows ?? []) {
    let nombre = "Contador";
    let email = "—";

    if (admin) {
      const { data: authUser } = await admin.auth.admin.getUserById(contador.id);
      if (authUser?.user?.email) {
        email = authUser.user.email;
        const metadata = authUser.user.user_metadata as
          | { full_name?: string }
          | undefined;
        nombre = metadata?.full_name?.trim() || authUser.user.email;
      }
    }

    contadores.push({
      id: contador.id,
      nombre,
      email,
      rol: contador.rol === "admin" ? "admin" : "contador",
    });
  }

  return contadores;
}

export async function getDespachoForUser(userId: string) {
  const supabase = await createClient();

  let { data: profile, error: profileError } = await supabase
    .from("contadores")
    .select("id, rol, despacho_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(permissionMessage(profileError.message));
  }

  if (!profile?.despacho_id) {
    profile = await ensureAdminProfile(userId);
  }

  const { data: despachoRow, error: despachoError } = await supabase
    .from("despachos")
    .select("id, nombre")
    .eq("id", profile.despacho_id)
    .maybeSingle();

  if (despachoError) {
    throw new Error(permissionMessage(despachoError.message));
  }

  if (!despachoRow) {
    throw new Error("Despacho no encontrado.");
  }

  const contadores = await getEquipoDespacho(profile.despacho_id);

  return {
    profile: {
      id: profile.id,
      rol: profile.rol === "admin" ? "admin" : "contador",
      despacho_id: profile.despacho_id,
    } as ContadorProfile,
    despacho: {
      id: despachoRow.id,
      nombre: despachoRow.nombre ?? "",
      invitation_token: "",
      invitation_url: "",
      rol: profile.rol === "admin" ? "admin" : "contador",
    },
    contadores,
  };
}

export async function updateDespachoNombre(
  userId: string,
  despachoId: string,
  nombre: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("contadores")
    .select("rol")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(permissionMessage(profileError.message));
  }

  if (profile?.rol !== "admin") {
    throw new Error("Solo el administrador puede editar el despacho.");
  }

  const { error } = await supabase
    .from("despachos")
    .update({ nombre: nombre.trim() })
    .eq("id", despachoId)
    .eq("admin_id", userId);

  if (error) {
    throw new Error(permissionMessage(error.message));
  }
}

export async function regenerarTokenInvitacion(
  userId: string,
  despachoId: string,
): Promise<string> {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("contadores")
    .select("rol")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(permissionMessage(profileError.message));
  }

  if (profile?.rol !== "admin") {
    throw new Error("Solo el administrador puede generar invitaciones.");
  }

  const newToken = crypto.randomUUID().replace(/-/g, "");

  const { error } = await supabase
    .from("despachos")
    .update({ invitation_token: newToken })
    .eq("id", despachoId)
    .eq("admin_id", userId);

  if (error) {
    if (error.message.includes("invitation_token")) {
      throw new Error(
        "Falta la columna invitation_token. Ejecuta supabase/fix-despachos-schema.sql en el SQL Editor.",
      );
    }
    throw new Error(permissionMessage(error.message));
  }

  return buildInvitationUrl(newToken);
}
