
-- Add proyecto_id to checkins for per-project attendance
ALTER TABLE public.checkins ADD COLUMN proyecto_id uuid REFERENCES public.proyectos(proyecto_id);

-- Drop the old one-to-one constraint on estudiante_id (if exists)
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_estudiante_id_fkey;

-- Add proper foreign key for estudiante_id
ALTER TABLE public.checkins ADD CONSTRAINT checkins_estudiante_id_fkey 
  FOREIGN KEY (estudiante_id) REFERENCES public.estudiantes(estudiante_id);

-- Unique constraint: one check-in per student per project
ALTER TABLE public.checkins ADD CONSTRAINT checkins_estudiante_proyecto_unique 
  UNIQUE (estudiante_id, proyecto_id);

-- Index for lookups
CREATE INDEX idx_checkins_estudiante ON public.checkins(estudiante_id);
CREATE INDEX idx_checkins_proyecto ON public.checkins(proyecto_id);

-- Allow SOCIO to read checkins for their own projects
CREATE POLICY "Socio read own project checkins"
  ON public.checkins FOR SELECT
  USING (
    has_role(auth.uid(), 'SOCIO'::app_role) 
    AND proyecto_id IN (
      SELECT p.proyecto_id FROM proyectos p
      JOIN usuarios u ON u.usuario_id = p.socio_usuario_id
      WHERE u.auth_id = auth.uid()
    )
  );
