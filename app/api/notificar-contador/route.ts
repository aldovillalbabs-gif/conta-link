import { NextResponse } from "next/server";
import { Resend } from "resend";

type NotificarContadorBody = {
  contadorEmail?: string;
  contadorNombre?: string;
  clienteNombre?: string;
  proveedorFactura?: string;
  montoTotal?: number;
};

const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://conta-link.vercel.app";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMonto(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildEmailHtml(
  clienteNombre: string,
  proveedorFactura: string,
  montoTotal: number,
): string {
  const cliente = escapeHtml(clienteNombre);
  const proveedor = escapeHtml(proveedorFactura);
  const monto = formatMonto(montoTotal);
  const dashboardUrl = `${DASHBOARD_URL}/dashboard`;

  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nueva factura de ${cliente}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:32px 32px 24px;text-align:center;">
                <div style="font-size:24px;font-weight:700;color:#16a34a;letter-spacing:-0.02em;">ContaLink</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <h1 style="margin:0;font-size:20px;line-height:1.4;color:#18181b;text-align:center;">
                  Tu cliente ${cliente} acaba de subir una factura
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:8px;">
                  <tr>
                    <td style="padding:16px 20px;border-bottom:1px solid #e4e4e7;">
                      <span style="display:block;font-size:12px;color:#71717a;margin-bottom:4px;">Proveedor</span>
                      <span style="font-size:16px;color:#18181b;font-weight:600;">${proveedor}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 20px;">
                      <span style="display:block;font-size:12px;color:#71717a;margin-bottom:4px;">Monto</span>
                      <span style="font-size:16px;color:#18181b;font-weight:600;">$${monto} MXN</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;text-align:center;">
                <a href="${dashboardUrl}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
                  Ver factura
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid #f4f4f5;text-align:center;">
                <p style="margin:0;font-size:12px;color:#71717a;">
                  ContaLink — Automatiza tu proceso contable
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY no está configurada." },
      { status: 500 },
    );
  }

  let body: NotificarContadorBody;
  try {
    body = (await request.json()) as NotificarContadorBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 500 });
  }

  const contadorEmail = body.contadorEmail?.trim();
  const clienteNombre = body.clienteNombre?.trim();
  const proveedorFactura = body.proveedorFactura?.trim();
  const montoTotal = body.montoTotal;

  if (
    !contadorEmail ||
    !clienteNombre ||
    !proveedorFactura ||
    montoTotal === undefined ||
    Number.isNaN(Number(montoTotal))
  ) {
    return NextResponse.json(
      { error: "Faltan campos requeridos en el body." },
      { status: 400 },
    );
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: "ContaLink <onboarding@resend.dev>",
      to: contadorEmail,
      subject: `Nueva factura de ${clienteNombre}`,
      html: buildEmailHtml(clienteNombre, proveedorFactura, Number(montoTotal)),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo enviar el email." },
      { status: 500 },
    );
  }
}
