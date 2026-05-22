"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useRef, useState } from "react";

const EMPRESA_NOMBRES: Record<string, string> = {
  "tortilleria-el-sol": "Tortillería El Sol",
  "farmacia-medina": "Farmacia Medina",
  "constructora-perez": "Constructora Pérez",
};

function nombreEmpresa(slug: string): string {
  if (EMPRESA_NOMBRES[slug]) return EMPRESA_NOMBRES[slug];
  return slug
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

const metricas = [
  { titulo: "Documentos este mes", valor: "14" },
  { titulo: "Último envío", valor: "hace 2 días" },
  {
    titulo: "Estado del mes",
    valor: "Al corriente",
    valorClass: "text-green-600",
  },
] as const;

const documentosRecientes = [
  {
    tipo: "XML",
    nombre: "Factura Telmex mayo.xml",
    fecha: "hace 2 días",
    badge: "Procesado",
    badgeClass: "bg-green-100 text-green-800",
  },
  {
    tipo: "PDF",
    nombre: "Recibo gasolina.pdf",
    fecha: "hace 3 días",
    badge: "Leyendo...",
    badgeClass: "bg-blue-100 text-blue-800",
  },
  {
    tipo: "Foto",
    nombre: "Ticket comida.jpg",
    fecha: "hace 5 días",
    badge: "En revisión",
    badgeClass: "bg-amber-100 text-amber-800",
  },
] as const;

const ACCEPT_FILES =
  ".xml,.pdf,application/xml,text/xml,application/pdf,image/jpeg,image/png,image/webp,image/gif,image/heic";

export default function PortalEmpresaPage() {
  const params = useParams();
  const empresaSlug = typeof params.empresa === "string" ? params.empresa : "";
  const empresaNombre = nombreEmpresa(empresaSlug);

  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    // Los archivos se procesarán en una iteración futura
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between border-b border-zinc-100 px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold tracking-tight text-green-600">
          ContaLink
        </span>
        <span className="text-sm font-medium text-zinc-700">{empresaNombre}</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:px-10">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          ← Volver al dashboard
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Bienvenido, {empresaNombre}
        </h1>
        <p className="mt-2 text-zinc-600">
          Tu contador revisa tus documentos cada semana.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {metricas.map((metrica) => (
            <div
              key={metrica.titulo}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3"
            >
              <p className="text-xs font-medium text-zinc-500">{metrica.titulo}</p>
              <p
                className={`mt-1 text-lg font-semibold text-zinc-900 ${
                  "valorClass" in metrica ? metrica.valorClass : ""
                }`}
              >
                {metrica.valor}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex w-full flex-col items-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
              isDragging
                ? "border-green-500 bg-green-50/50"
                : "border-zinc-300 bg-zinc-50/50"
            }`}
          >
            <svg
              className="h-12 w-12 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.665-7.029 5.25 5.25 0 0 0-10.15-2.2A4.502 4.502 0 0 0 2.25 15Z"
              />
            </svg>
            <p className="mt-4 text-center text-sm font-medium text-zinc-600">
              Arrastra tus facturas aquí
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_FILES}
            multiple
            className="sr-only"
            id={inputId}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            O selecciona archivos
          </button>

          <Link
            href="/subir"
            className="mt-6 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            Subir facturas al contador
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">
            Documentos recientes
          </h2>
          <ul className="mt-4 space-y-3">
            {documentosRecientes.map((doc) => (
              <li
                key={doc.nombre}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    {doc.tipo}
                  </p>
                  <p className="font-medium text-zinc-900">{doc.nombre}</p>
                  <p className="text-sm text-zinc-500">{doc.fecha}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${doc.badgeClass}`}
                >
                  {doc.badge}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 rounded-lg border border-green-200 bg-green-50 px-4 py-4">
          <p className="text-sm text-green-900">
            <span className="font-semibold">Mensaje de tu contador:</span> Por
            favor sube los estados de cuenta de mayo antes del viernes.
          </p>
        </div>
      </main>
    </div>
  );
}
