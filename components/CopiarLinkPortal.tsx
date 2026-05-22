"use client";

import { useState } from "react";
import { buildPortalUrl } from "@/lib/portal-link";

type CopiarLinkPortalProps = {
  slug: string;
  token: string | null;
  label?: string;
  className?: string;
};

export default function CopiarLinkPortal({
  slug,
  token,
  label = "Copiar link",
  className = "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50",
}: CopiarLinkPortalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!token?.trim()) return;

    try {
      await navigator.clipboard.writeText(buildPortalUrl(slug, token.trim()));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!token?.trim()}
      className={className}
    >
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
