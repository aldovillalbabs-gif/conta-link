import { NextResponse } from "next/server";
import {
  getDespachoForUser,
  regenerarTokenInvitacion,
  updateDespachoNombre,
} from "@/lib/despacho-service";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const data = await getDespachoForUser(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el despacho.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: { action?: string; nombre?: string };
  try {
    body = (await request.json()) as { action?: string; nombre?: string };
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  try {
    const { profile, despacho } = await getDespachoForUser(user.id);

    if (profile.rol !== "admin") {
      return NextResponse.json(
        { error: "Solo el administrador puede realizar esta acción." },
        { status: 403 },
      );
    }

    if (body.action === "nombre") {
      const nombre = body.nombre?.trim() ?? "";
      await updateDespachoNombre(user.id, despacho.id, nombre);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "invitacion") {
      const invitation_url = await regenerarTokenInvitacion(
        user.id,
        despacho.id,
      );
      return NextResponse.json({ invitation_url });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo completar la acción.",
      },
      { status: 500 },
    );
  }
}
