"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import CopiarLinkPortal from "@/components/CopiarLinkPortal";
import { buildPortalUrl } from "@/lib/portal-link";

type PortalLinkActionsProps = {
  clienteId: string;
  slug: string;
  initialToken: string | null;
};

function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export default function PortalLinkActions({
  clienteId,
  slug,
  initialToken,
}: PortalLinkActionsProps) {
  const [token, setToken] = useState(initialToken);
  const [regenerating, setRegenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const regenerarLink = async () => {
    const confirmed = window.confirm(
      "¿Regenerar el link del portal? El link anterior dejará de funcionar y tendrás que mandar el nuevo link al cliente.",
    );
    if (!confirmed) return;

    setRegenerating(true);
    setError(null);
    setSuccessMessage(null);

    const newToken = crypto.randomUUID().replace(/-/g, "");
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("clientes")
      .update({ token: newToken })
      .eq("id", clienteId);

    setRegenerating(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setToken(newToken);

    try {
      await navigator.clipboard.writeText(buildPortalUrl(slug, newToken));
      setSuccessMessage("Nuevo link copiado. Mándalo a tu cliente.");
      window.setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError("Link regenerado, pero no se pudo copiar al portapapeles.");
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <CopiarLinkPortal
          slug={slug}
          token={token}
          label="Copiar link del portal"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void regenerarLink()}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
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
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          {regenerating ? "Regenerando..." : "Regenerar link"}
        </button>
      </div>
      {successMessage && (
        <p className="text-sm font-medium text-green-500" role="status">
          {successMessage}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
