-- Ejecutar en Supabase SQL Editor (en este orden).

-- Tabla de despachos contables
CREATE TABLE IF NOT EXISTS public.despachos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT '',
  admin_id uuid NOT NULL,
  invitation_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Perfil de contador vinculado a auth.users
CREATE TABLE IF NOT EXISTS public.contadores (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'contador',
  despacho_id uuid REFERENCES public.despachos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Columnas solicitadas (si la tabla ya existía sin ellas)
ALTER TABLE public.contadores ADD COLUMN IF NOT EXISTS rol text DEFAULT 'contador';
ALTER TABLE public.contadores ADD COLUMN IF NOT EXISTS despacho_id uuid;

-- Restricción de roles
ALTER TABLE public.contadores DROP CONSTRAINT IF EXISTS contadores_rol_check;
ALTER TABLE public.contadores
  ADD CONSTRAINT contadores_rol_check CHECK (rol IN ('admin', 'contador'));

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_contadores_despacho_id ON public.contadores(despacho_id);
CREATE INDEX IF NOT EXISTS idx_despachos_invitation_token ON public.despachos(invitation_token);

-- RLS básico (ajustar según políticas de producción)
ALTER TABLE public.despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contadores_select_own" ON public.contadores;
CREATE POLICY "contadores_select_own" ON public.contadores
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "contadores_select_same_despacho" ON public.contadores;
CREATE POLICY "contadores_select_same_despacho" ON public.contadores
  FOR SELECT USING (
    despacho_id IS NOT NULL
    AND despacho_id IN (
      SELECT c.despacho_id FROM public.contadores c WHERE c.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "despachos_select_member" ON public.despachos;
CREATE POLICY "despachos_select_member" ON public.despachos
  FOR SELECT USING (
    id IN (SELECT c.despacho_id FROM public.contadores c WHERE c.id = auth.uid())
    OR admin_id = auth.uid()
  );

-- Permisos requeridos para service_role y usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contadores TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despachos TO service_role;
GRANT SELECT ON public.contadores TO authenticated;
GRANT SELECT ON public.despachos TO authenticated;

DROP POLICY IF EXISTS "despachos_update_admin" ON public.despachos;
CREATE POLICY "despachos_update_admin" ON public.despachos
  FOR UPDATE USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

DROP POLICY IF EXISTS "contadores_insert_own" ON public.contadores;
CREATE POLICY "contadores_insert_own" ON public.contadores
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "contadores_update_own" ON public.contadores;
CREATE POLICY "contadores_update_own" ON public.contadores
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
