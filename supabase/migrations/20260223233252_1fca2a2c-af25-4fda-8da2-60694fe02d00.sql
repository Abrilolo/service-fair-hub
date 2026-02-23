-- Add unique index on codigo_hash to prevent collisions
CREATE UNIQUE INDEX IF NOT EXISTS idx_codigos_temporales_codigo_hash ON public.codigos_temporales (codigo_hash);

-- Add index on proyecto_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_codigos_temporales_proyecto_id ON public.codigos_temporales (proyecto_id);
