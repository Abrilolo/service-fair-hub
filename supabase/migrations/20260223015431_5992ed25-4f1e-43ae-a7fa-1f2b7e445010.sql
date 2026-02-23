
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'SOCIO', 'BECARIO');

-- Enum for checkin status
CREATE TYPE public.checkin_estado AS ENUM ('PENDIENTE', 'PRESENTE');

-- Enum for registro status
CREATE TYPE public.registro_estado AS ENUM ('CONFIRMADO', 'CANCELADO');

-- 1) USUARIOS
CREATE TABLE public.usuarios (
  usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol public.app_role NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) ESTUDIANTES
CREATE TABLE public.estudiantes (
  estudiante_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula TEXT NOT NULL UNIQUE,
  correo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  carrera TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) PROYECTOS
CREATE TABLE public.proyectos (
  proyecto_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ NOT NULL,
  descripcion TEXT,
  cupo_total INTEGER NOT NULL,
  cupo_disponible INTEGER NOT NULL,
  socio_usuario_id UUID NOT NULL REFERENCES public.usuarios(usuario_id),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for cupo
CREATE OR REPLACE FUNCTION public.validate_cupo()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_validate_cupo
BEFORE INSERT OR UPDATE ON public.proyectos
FOR EACH ROW EXECUTE FUNCTION public.validate_cupo();

-- 4) CHECKINS
CREATE TABLE public.checkins (
  checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL UNIQUE REFERENCES public.estudiantes(estudiante_id),
  verificado_por_usuario_id UUID NOT NULL REFERENCES public.usuarios(usuario_id),
  estado public.checkin_estado NOT NULL DEFAULT 'PENDIENTE',
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) CODIGOS_TEMPORALES
CREATE TABLE public.codigos_temporales (
  codigo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_hash TEXT NOT NULL UNIQUE,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(proyecto_id),
  creado_por_usuario_id UUID NOT NULL REFERENCES public.usuarios(usuario_id),
  expira_en TIMESTAMPTZ NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT false,
  usado_en TIMESTAMPTZ,
  usado_por_estudiante_id UUID REFERENCES public.estudiantes(estudiante_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) REGISTROS_PROYECTO
CREATE TABLE public.registros_proyecto (
  registro_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL UNIQUE REFERENCES public.estudiantes(estudiante_id),
  proyecto_id UUID NOT NULL REFERENCES public.proyectos(proyecto_id),
  codigo_id UUID NOT NULL UNIQUE REFERENCES public.codigos_temporales(codigo_id),
  estado public.registro_estado NOT NULL DEFAULT 'CONFIRMADO',
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7) LOGS_EVENTO
CREATE TABLE public.logs_evento (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_evento TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id UUID,
  actor_usuario_id UUID REFERENCES public.usuarios(usuario_id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger for usuarios
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: Allow anon read on proyectos (MVP testing)
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read proyectos" ON public.proyectos FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert proyectos" ON public.proyectos FOR INSERT TO anon WITH CHECK (true);

-- RLS on other tables (open for MVP, will be tightened later)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read usuarios" ON public.usuarios FOR SELECT TO anon USING (true);

ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read estudiantes" ON public.estudiantes FOR SELECT TO anon USING (true);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codigos_temporales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_evento ENABLE ROW LEVEL SECURITY;
