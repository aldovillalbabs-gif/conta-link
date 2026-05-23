import * as XLSX from "xlsx";

export type FacturaExport = {
  id: string;
  proveedor: string;
  rfc_emisor: string | null;
  fecha: string | null;
  subtotal: number;
  iva: number;
  total: number;
  cuenta_contable: string | null;
  uuid_cfdi: string | null;
};

export type ClienteExport = {
  id: string;
  nombre: string;
  rfc: string | null;
};

export type FormatoExportId =
  | "quickbooks"
  | "contpaqi"
  | "aspel"
  | "xml"
  | "excel";

export type ExportSuccess = {
  ok: true;
  filename: string;
  blob: Blob;
};

export type ExportFailure = {
  ok: false;
  reason: "desarrollo" | "error";
  message: string;
};

export type ExportOutcome = ExportSuccess | ExportFailure;

export function sanitizeNombreArchivo(nombre: string): string {
  const sanitized = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");

  return sanitized || "Cliente";
}

export function getMesAnioArchivo(date = new Date()): string {
  const mes = date.toLocaleDateString("es-MX", { month: "long" });
  const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${mesCapitalizado}${date.getFullYear()}`;
}

export function getMesNumero(date = new Date()): string {
  return String(date.getMonth() + 1).padStart(2, "0");
}

export function getAnio(date = new Date()): string {
  return String(date.getFullYear());
}

export function generarNombreArchivo(
  cliente: ClienteExport,
  formatoId: FormatoExportId,
  date = new Date(),
): string {
  const mesAnio = getMesAnioArchivo(date);
  const nombreCliente = sanitizeNombreArchivo(cliente.nombre);
  const rfc = sanitizeNombreArchivo(cliente.rfc?.trim() || "SINRFC");

  switch (formatoId) {
    case "quickbooks":
      return `QuickBooks_${nombreCliente}_${mesAnio}.csv`;
    case "xml":
      return `SAT_${rfc}_${mesAnio}.xml`;
    case "excel":
      return `${nombreCliente}_Facturas_${mesAnio}.xlsx`;
    case "contpaqi":
      return `${nombreCliente}_CONTPAQi_${mesAnio}.txt`;
    case "aspel":
      return `${nombreCliente}_AspelCOI_${mesAnio}.txt`;
    default:
      return `${nombreCliente}_Export_${mesAnio}.xlsx`;
  }
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseDate(fecha: string | null, fallback = new Date()): Date {
  if (!fecha?.trim()) return fallback;
  const parsed = new Date(fecha.includes("T") ? fecha : `${fecha}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function formatDateQuickBooks(fecha: string | null): string {
  const date = parseDate(fecha);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function formatDateIso(fecha: string | null, fallback = new Date()): string {
  const date = parseDate(fecha, fallback);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getDescripcionFactura(factura: FacturaExport): string {
  return factura.proveedor.trim() || "Sin concepto";
}

function parseCuentaContable(cuenta: string | null): { numCta: string; desCta: string } {
  const value = cuenta?.trim() || "";
  if (!value) {
    return { numCta: "000000", desCta: "Sin cuenta" };
  }

  const spaceIndex = value.indexOf(" ");
  if (spaceIndex === -1) {
    return { numCta: value.replace(/\s/g, ""), desCta: value };
  }

  return {
    numCta: value.slice(0, spaceIndex).replace(/\s/g, ""),
    desCta: value.slice(spaceIndex + 1).trim() || value,
  };
}

function formatMonto(value: number): string {
  return Number(value).toFixed(2);
}

function filtrarDuplicadosPorUuid(facturas: FacturaExport[]): FacturaExport[] {
  const seen = new Set<string>();

  return facturas.filter((factura) => {
    const uuid = factura.uuid_cfdi?.trim();
    if (!uuid) return true;
    if (seen.has(uuid)) return false;
    seen.add(uuid);
    return true;
  });
}

function generarQuickBooksCsv(
  facturas: FacturaExport[],
): Blob {
  const facturasUnicas = filtrarDuplicadosPorUuid(facturas);
  const header = "Date,Description,Amount,Account,Vendor,Reference";
  const rows = facturasUnicas.map((factura) => {
    const uuid = factura.uuid_cfdi?.trim() ?? "";
    const reference = uuid.slice(0, 8);
    const amount = (-Math.abs(Number(factura.total))).toFixed(2);

    return [
      formatDateQuickBooks(factura.fecha),
      getDescripcionFactura(factura),
      amount,
      factura.cuenta_contable?.trim() || "Sin cuenta",
      factura.proveedor.trim() || "Sin proveedor",
      reference,
    ]
      .map((field) => escapeCsvField(String(field)))
      .join(",");
  });

  const csv = `\uFEFF${[header, ...rows].join("\r\n")}`;
  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

function generarXmlSat(
  cliente: ClienteExport,
  facturas: FacturaExport[],
  date = new Date(),
): Blob {
  const rfc = escapeXml(cliente.rfc?.trim() || "XAXX010101000");
  const mes = getMesNumero(date);
  const anio = getAnio(date);
  const polizaFecha = formatDateIso(null, date);

  const totalDebe = facturas.reduce(
    (sum, factura) => sum + Number(factura.total),
    0,
  );

  const transaccionesFacturas = facturas
    .map((factura) => {
      const { numCta, desCta } = parseCuentaContable(factura.cuenta_contable);
      const concepto = escapeXml(getDescripcionFactura(factura));
      const debe = formatMonto(Number(factura.total));
      const haber = "0.00";

      return `    <PLZ:Transaccion NumCta="${escapeXml(numCta)}" DesCta="${escapeXml(desCta)}" Concepto="${concepto}" Debe="${debe}" Haber="${haber}" />`;
    })
    .join("\n");

  const contrapartida = `    <PLZ:Transaccion NumCta="102-001" DesCta="Bancos" Concepto="Salida de bancos" Debe="0.00" Haber="${formatMonto(totalDebe)}" />`;
  const transacciones = [transaccionesFacturas, contrapartida]
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PLZ:Polizas xmlns:PLZ="http://www.sat.gob.mx/Polizas"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/Polizas http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo/PolizasPeriodo_1_3.xsd"
  Version="1.3"
  RFC="${rfc}"
  Mes="${mes}"
  Anio="${anio}"
  TipoSolicitud="AF">
  <PLZ:Poliza NumUnIdenPol="1" Fecha="${polizaFecha}" Concepto="Egresos del periodo">
${transacciones}
  </PLZ:Poliza>
</PLZ:Polizas>`;

  return new Blob([xml], { type: "application/xml;charset=utf-8;" });
}

function generarExcelXlsx(facturas: FacturaExport[]): Blob {
  const facturasUnicas = filtrarDuplicadosPorUuid(facturas);
  const rows = facturasUnicas.map((factura) => ({
    Proveedor: factura.proveedor,
    "RFC Emisor": factura.rfc_emisor?.trim() ?? "",
    Fecha: factura.fecha?.trim() ?? "",
    "UUID CFDI": factura.uuid_cfdi?.trim() ?? "",
    Subtotal: Number(factura.subtotal),
    IVA: Number(factura.iva),
    Total: Number(factura.total),
    "Cuenta Contable": factura.cuenta_contable?.trim() ?? "",
    Estado: factura.cuenta_contable?.trim() ? "Aprobado" : "Pendiente",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function generarExportacion(
  cliente: ClienteExport,
  facturas: FacturaExport[],
  formatoId: FormatoExportId,
  date = new Date(),
): ExportOutcome {
  if (formatoId === "contpaqi" || formatoId === "aspel") {
    return {
      ok: false,
      reason: "desarrollo",
      message:
        "Formato en desarrollo. Por favor exporta como Excel genérico e importa manualmente.",
    };
  }

  if (facturas.length === 0) {
    return {
      ok: false,
      reason: "error",
      message: "No hay facturas seleccionadas para exportar.",
    };
  }

  try {
    let blob: Blob;

    switch (formatoId) {
      case "quickbooks":
        blob = generarQuickBooksCsv(facturas);
        break;
      case "xml":
        blob = generarXmlSat(cliente, facturas, date);
        break;
      case "excel":
        blob = generarExcelXlsx(facturas);
        break;
      default:
        return {
          ok: false,
          reason: "error",
          message: "Formato de exportación no soportado.",
        };
    }

    return {
      ok: true,
      filename: generarNombreArchivo(cliente, formatoId, date),
      blob,
    };
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "No se pudo generar el archivo de exportación.",
    };
  }
}

export function descargarBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
