-- Ejecutar en Supabase SQL Editor para activar el sistema de despachos.
-- (Las tablas despachos y contadores ya deben existir.)

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contadores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.despachos TO authenticated;

DROP POLICY IF EXISTS "despachos_insert_admin" ON public.despachos;
CREATE POLICY "despachos_insert_admin" ON public.despachos
  FOR INSERT WITH CHECK (admin_id = auth.uid());

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

-- Unirse a despacho por token de invitación (sin exponer la tabla completa)
CREATE OR REPLACE FUNCTION public.unirse_despacho(invitation text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_despacho_id uuid;
BEGIN
  SELECT id
  INTO target_despacho_id
  FROM public.despachos
  WHERE invitation_token = invitation
  LIMIT 1;

  IF target_despacho_id IS NULL THEN
    RAISE EXCEPTION 'Invitación inválida o expirada';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contadores
    WHERE id = auth.uid()
      AND despacho_id IS NOT NULL
      AND despacho_id <> target_despacho_id
  ) THEN
    RAISE EXCEPTION 'Ya perteneces a otro despacho';
  END IF;

  INSERT INTO public.contadores (id, rol, despacho_id)
  VALUES (auth.uid(), 'contador', target_despacho_id)
  ON CONFLICT (id) DO UPDATE
  SET rol = EXCLUDED.rol,
      despacho_id = EXCLUDED.despacho_id;

  RETURN target_despacho_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unirse_despacho(text) TO authenticated;
