import { NextResponse } from "next/server";
import { ensureAdminProfile } from "@/lib/despacho-service";
import { createClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const profile = await ensureAdminProfile(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo inicializar el despacho.",
      },
      { status: 500 },
    );
  }
}
