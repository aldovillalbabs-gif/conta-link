import { NextResponse } from "next/server";
import { Resend } from "resend";

type ContactoBody = {
  nombre?: string;
  email?: string;
  mensaje?: string;
};

const CONTACTO_DESTINO = "aldo.villalbabs@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(nombre: string, email: string, mensaje: string): string {
  const safeNombre = escapeHtml(nombre);
  const safeEmail = escapeHtml(email);
  const safeMensaje = escapeHtml(mensaje).replace(/\n/g, "<br />");

  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nuevo mensaje de contacto</title>
  </head>
  <body style="margin:0;padding:32px 16px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e4e4e7;">
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 24px;font-size:20px;color:#18181b;">Nuevo mensaje de contacto</h1>
          <p style="margin:0 0 12px;font-size:14px;color:#71717a;">Nombre</p>
          <p style="margin:0 0 20px;font-size:16px;color:#18181b;font-weight:600;">${safeNombre}</p>
          <p style="margin:0 0 12px;font-size:14px;color:#71717a;">Email</p>
          <p style="margin:0 0 20px;font-size:16px;color:#18181b;font-weight:600;">${safeEmail}</p>
          <p style="margin:0 0 12px;font-size:14px;color:#71717a;">Mensaje</p>
          <p style="margin:0;font-size:16px;line-height:1.6;color:#18181b;">${safeMensaje}</p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  let body: ContactoBody;
  try {
    body = (await request.json()) as ContactoBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 500 });
  }

  const nombre = body.nombre?.trim();
  const email = body.email?.trim();
  const mensaje = body.mensaje?.trim();

  if (!nombre || !email || !mensaje) {
    return NextResponse.json(
      { error: "Nombre, email y mensaje son requeridos." },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: "ContaLink <onboarding@resend.dev>",
      to: CONTACTO_DESTINO,
      replyTo: email,
      subject: "Nuevo mensaje de contacto — ContaLink",
      html: buildEmailHtml(nombre, email, mensaje),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo enviar el mensaje." },
      { status: 500 },
    );
  }
}
