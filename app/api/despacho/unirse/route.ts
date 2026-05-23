import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let token: string | undefined;
  try {
    const body = (await request.json()) as { token?: string };
    token = body.token?.trim();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json(
      { error: "Token de invitación requerido." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("unirse_despacho", {
    invitation: token,
  });

  if (error) {
    const message = error.message.includes("permission denied")
      ? "Faltan permisos en Supabase. Ejecuta supabase/grant-despachos-permissions.sql en el SQL Editor."
      : error.message;

    const status = error.message.includes("Invitación inválida")
      ? 404
      : error.message.includes("otro despacho")
        ? 409
        : 500;

    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true, despacho_id: data });
}
