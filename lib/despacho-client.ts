import { createBrowserClient } from "@supabase/ssr";
import { buildInvitationUrl } from "@/lib/despacho-link";
import type {
  ContadorDespachoItem,
  ContadorProfile,
  DespachoData,
} from "@/lib/despacho-types";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

type DespachoClienteState = {
  profile: ContadorProfile;
  despacho: DespachoData;
  contadores: ContadorDespachoItem[];
};

async function fetchEquipo(): Promise<ContadorDespachoItem[]> {
  const response = await fetch("/api/despacho/equipo", { method: "GET" });
  const payload = (await response.json()) as {
    contadores?: ContadorDespachoItem[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo cargar el equipo.");
  }

  return payload.contadores ?? [];
}

async function inicializarDespacho(): Promise<ContadorProfile> {
  const response = await fetch("/api/despacho/inicializar", { method: "POST" });
  const payload = (await response.json()) as {
    profile?: ContadorProfile;
    error?: string;
  };

  if (!response.ok || !payload.profile) {
    throw new Error(payload.error ?? "No se pudo inicializar el despacho.");
  }

  return payload.profile;
}

export async function cargarDespachoCliente(): Promise<DespachoClienteState> {
  const supabase = createSupabaseBrowserClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado.");
  }

  let { data: profileRow, error: profileError } = await supabase
    .from("contadores")
    .select("id, rol, despacho_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  let profile: ContadorProfile;

  if (!profileRow?.despacho_id) {
    profile = await inicializarDespacho();
  } else {
    profile = {
      id: profileRow.id,
      rol: profileRow.rol === "admin" ? "admin" : "contador",
      despacho_id: profileRow.despacho_id,
    };
  }

  const { data: despachoRow, error: despachoError } = await supabase
    .from("despachos")
    .select("id, nombre")
    .eq("id", profile.despacho_id)
    .maybeSingle();

  if (despachoError) {
    throw new Error(despachoError.message);
  }

  if (!despachoRow) {
    throw new Error("Despacho no encontrado.");
  }

  const contadores = await fetchEquipo();

  return {
    profile,
    despacho: {
      id: despachoRow.id,
      nombre: despachoRow.nombre ?? "",
      invitation_token: "",
      invitation_url: "",
      rol: profile.rol,
    },
    contadores,
  };
}

export async function guardarNombreDespacho(nombre: string): Promise<void> {
  const response = await fetch("/api/despacho", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "nombre", nombre }),
  });

  const payload = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "No se pudo guardar el nombre.");
  }
}

export async function generarLinkInvitacion(): Promise<string> {
  const response = await fetch("/api/despacho", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "invitacion" }),
  });

  const payload = (await response.json()) as {
    invitation_url?: string;
    error?: string;
  };

  if (!response.ok || !payload.invitation_url) {
    throw new Error(payload.error ?? "No se pudo generar la invitación.");
  }

  return payload.invitation_url;
}
