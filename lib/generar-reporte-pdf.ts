import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type FacturaReporte = {
  proveedor: string;
  rfc_emisor: string | null;
  fecha: string | null;
  subtotal: number;
  iva: number;
  total: number;
  cuenta_contable: string | null;
};

export type ClienteReporte = {
  nombre: string;
  rfc: string | null;
};

function parseDate(value: string): Date {
  if (value.includes("T")) {
    return new Date(value);
  }

  return new Date(`${value}T12:00:00`);
}

function isCurrentMonth(fecha: string | null, reference: Date): boolean {
  if (!fecha?.trim()) return false;

  const date = parseDate(fecha);
  return (
    date.getMonth() === reference.getMonth() &&
    date.getFullYear() === reference.getFullYear()
  );
}

function formatMesAnio(date: Date): string {
  const mes = date.toLocaleDateString("es-MX", { month: "long" });
  const capitalized = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${capitalized} ${date.getFullYear()}`;
}

function formatMesAnioArchivo(date: Date): string {
  const mes = date.toLocaleDateString("es-MX", { month: "long" });
  const capitalized = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${capitalized}${date.getFullYear()}`;
}

function sanitizeNombreArchivo(nombre: string): string {
  const sanitized = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");

  return sanitized || "Cliente";
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatFecha(fecha: string | null): string {
  if (!fecha?.trim()) return "—";

  return parseDate(fecha).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatFechaGeneracion(date: Date): string {
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generarReportePdf(
  cliente: ClienteReporte,
  facturas: FacturaReporte[],
): void {
  const now = new Date();
  const facturasMes = facturas.filter((factura) =>
    isCurrentMonth(factura.fecha, now),
  );

  const aprobadas = facturasMes.filter((factura) =>
    factura.cuenta_contable?.trim(),
  );
  const pendientes = facturasMes.filter(
    (factura) => !factura.cuenta_contable?.trim(),
  );

  const sumSubtotal = facturasMes.reduce(
    (acc, factura) => acc + Number(factura.subtotal),
    0,
  );
  const sumIva = facturasMes.reduce(
    (acc, factura) => acc + Number(factura.iva),
    0,
  );
  const sumTotal = facturasMes.reduce(
    (acc, factura) => acc + Number(factura.total),
    0,
  );

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const rightX = pageWidth - margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(24, 24, 27);
  doc.text("CONTALINK", margin, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(113, 113, 122);
  doc.text("Reporte mensual de facturas", margin, 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text(cliente.nombre, rightX, 20, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122);
  doc.text(
    cliente.rfc ? `RFC: ${cliente.rfc}` : "Sin RFC",
    rightX,
    27,
    { align: "right" },
  );
  doc.text(formatMesAnio(now), rightX, 34, { align: "right" });

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.4);
  doc.line(margin, 40, rightX, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text("Resumen", margin, 50);

  const resumenLineas = [
    `Total de facturas procesadas este mes: ${facturasMes.length}`,
    `Total de facturas aprobadas: ${aprobadas.length}`,
    `Total de facturas pendientes: ${pendientes.length}`,
    `Suma total de subtotales: $${formatMoney(sumSubtotal)} MXN`,
    `Suma total de IVA: $${formatMoney(sumIva)} MXN`,
    `Suma total general: $${formatMoney(sumTotal)} MXN`,
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(63, 63, 70);

  let y = 58;
  for (const linea of resumenLineas) {
    const isTotal = linea.startsWith("Suma total general");
    if (isTotal) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 24, 27);
    }

    doc.text(linea, margin, y);

    if (isTotal) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(63, 63, 70);
    }

    y += 6;
  }

  const tableBody =
    facturasMes.length > 0
      ? facturasMes.map((factura) => {
          const aprobada = Boolean(factura.cuenta_contable?.trim());
          return [
            factura.proveedor,
            factura.rfc_emisor?.trim() || "—",
            formatFecha(factura.fecha),
            `$${formatMoney(Number(factura.subtotal))}`,
            `$${formatMoney(Number(factura.iva))}`,
            `$${formatMoney(Number(factura.total))}`,
            factura.cuenta_contable?.trim() || "—",
            aprobada ? "Aprobado" : "Pendiente",
          ];
        })
      : [["Sin facturas este mes", "", "", "", "", "", "", ""]];

  autoTable(doc, {
    startY: y + 6,
    head: [
      [
        "Proveedor",
        "RFC",
        "Fecha",
        "Subtotal",
        "IVA",
        "Total",
        "Cuenta contable",
        "Estado",
      ],
    ],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [24, 24, 27],
      lineColor: [228, 228, 231],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      7: { cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index !== 7) return;

      const estado = data.cell.text[0];
      if (estado === "Aprobado") {
        data.cell.styles.textColor = [34, 197, 94];
        data.cell.styles.fontStyle = "bold";
      } else if (estado === "Pendiente") {
        data.cell.styles.textColor = [245, 158, 11];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: margin, right: margin },
  });

  const fechaGeneracion = formatFechaGeneracion(now);
  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(
      "Generado por ContaLink — conta-link.vercel.app",
      margin,
      pageHeight - 10,
    );
    doc.text(fechaGeneracion, rightX, pageHeight - 10, { align: "right" });
  }

  const filename = `Reporte_${sanitizeNombreArchivo(cliente.nombre)}_${formatMesAnioArchivo(now)}.pdf`;
  doc.save(filename);
}
