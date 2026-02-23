
-- Fix function search paths
CREATE OR REPLACE FUNCTION public.validate_cupo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cupo_disponible < 0 THEN
    RAISE EXCEPTION 'cupo_disponible no puede ser negativo';
  END IF;
  IF NEW.cupo_disponible > NEW.cupo_total THEN
    RAISE EXCEPTION 'cupo_disponible no puede ser mayor que cupo_total';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add read policies for remaining tables (MVP - will tighten later)
CREATE POLICY "Allow anon read checkins" ON public.checkins FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read codigos_temporales" ON public.codigos_temporales FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read registros_proyecto" ON public.registros_proyecto FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read logs_evento" ON public.logs_evento FOR SELECT TO anon USING (true);
