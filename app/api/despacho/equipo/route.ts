import { NextResponse } from "next/server";
import { getEquipoDespacho } from "@/lib/despacho-service";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("contadores")
    .select("despacho_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.despacho_id) {
    return NextResponse.json(
      { error: "Despacho no inicializado." },
      { status: 404 },
    );
  }

  try {
    const contadores = await getEquipoDespacho(profile.despacho_id);
    return NextResponse.json({ contadores });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el equipo.",
      },
      { status: 500 },
    );
  }
}
