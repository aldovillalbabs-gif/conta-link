"use client";

import {
  generarReportePdf,
  type ClienteReporte,
  type FacturaReporte,
} from "@/lib/generar-reporte-pdf";

type DescargarReportePdfProps = {
  cliente: ClienteReporte;
  facturas: FacturaReporte[];
};

export default function DescargarReportePdf({
  cliente,
  facturas,
}: DescargarReportePdfProps) {
  const handleDownload = () => {
    generarReportePdf(cliente, facturas);
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
    >
      Descargar reporte PDF
    </button>
  );
}
