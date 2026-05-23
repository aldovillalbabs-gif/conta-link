"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  cargarDespachoCliente,
  generarLinkInvitacion,
  guardarNombreDespacho,
} from "@/lib/despacho-client";
import type { ContadorDespachoItem, DespachoData } from "@/lib/despacho-types";

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MiDespacho() {
  const [loading, setLoading] = useState(true);
  const [despacho, setDespacho] = useState<DespachoData | null>(null);
  const [contadores, setContadores] = useState<ContadorDespachoItem[]>([]);
  const [nombreDespacho, setNombreDespacho] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const data = await cargarDespachoCliente();
      setDespacho(data.despacho);
      setContadores(data.contadores);
      setNombreDespacho(data.despacho.nombre);
      setInvitationUrl(data.despacho.invitation_url);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el despacho.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleSaveNombre = () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await guardarNombreDespacho(nombreDespacho);
        setDespacho((prev) =>
          prev ? { ...prev, nombre: nombreDespacho.trim() } : prev,
        );
        setSuccess("Nombre del despacho guardado.");
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "No se pudo guardar el nombre.",
        );
      }
    });
  };

  const handleInvitar = () => {
    setError(null);
    setSuccess(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const url = await generarLinkInvitacion();
        setInvitationUrl(url);
        setSuccess("Link de invitación generado.");
      } catch (inviteError) {
        setError(
          inviteError instanceof Error
            ? inviteError.message
            : "No se pudo generar la invitación.",
        );
      }
    });
  };

  const handleCopy = async () => {
    if (!invitationUrl) return;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar el link.");
    }
  };

  const esAdmin = despacho?.rol === "admin";

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Mi despacho</h2>
      <p className="mt-2 text-sm text-zinc-600">
        Administra tu despacho contable e invita a tu equipo.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">Cargando despacho...</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <label
              htmlFor="nombre-despacho"
              className="block text-sm font-medium text-zinc-700"
            >
              Nombre del despacho
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <input
                id="nombre-despacho"
                type="text"
                value={nombreDespacho}
                onChange={(e) => {
                  setNombreDespacho(e.target.value);
                  setSuccess(null);
                }}
                disabled={!esAdmin || isPending}
                placeholder="Ej. Despacho García & Asociados"
                className="min-w-[240px] flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500"
              />
              {esAdmin && (
                <button
                  type="button"
                  onClick={handleSaveNombre}
                  disabled={isPending}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Guardar
                </button>
              )}
            </div>
          </div>

          {esAdmin && (
            <div>
              <p className="text-sm font-medium text-zinc-700">Invitar contador</p>
              <p className="mt-1 text-sm text-zinc-500">
                Genera un link para que otro contador se una a tu despacho.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleInvitar}
                  disabled={isPending}
                  className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Invitar contador
                </button>
                {invitationUrl && (
                  <>
                    <input
                      type="text"
                      readOnly
                      value={invitationUrl}
                      className="min-w-[240px] flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
                    >
                      {copied ? "Copiado" : "Copiar link"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-zinc-700">
              Contadores del despacho
            </p>
            {contadores.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                Aún no hay contadores en este despacho.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {contadores.map((contador) => (
                  <li
                    key={contador.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900">
                        {getInitials(contador.nombre)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {contador.nombre}
                        </p>
                        <p className="text-xs text-zinc-500">{contador.email}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        contador.rol === "admin"
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-600"
                      }`}
                    >
                      {contador.rol === "admin" ? "Admin" : "Contador"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm font-medium text-green-600" role="status">
              {success}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
