-- Ejecutar en Supabase SQL Editor si faltan columnas en despachos/contadores.

ALTER TABLE public.despachos
  ADD COLUMN IF NOT EXISTS invitation_token text UNIQUE
  DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.despachos
  ADD COLUMN IF NOT EXISTS nombre text NOT NULL DEFAULT '';

ALTER TABLE public.despachos
  ADD COLUMN IF NOT EXISTS admin_id uuid;

ALTER TABLE public.despachos
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.contadores
  ADD COLUMN IF NOT EXISTS rol text DEFAULT 'contador';

ALTER TABLE public.contadores
  ADD COLUMN IF NOT EXISTS despacho_id uuid;

ALTER TABLE public.contadores
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.despachos
SET invitation_token = encode(gen_random_bytes(16), 'hex')
WHERE invitation_token IS NULL;
