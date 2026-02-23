
-- =============================================
-- PASO 1a: Crear tabla user_roles
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their own roles
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- PASO 1b: Agregar auth_id a usuarios
-- =============================================
ALTER TABLE public.usuarios
ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================
-- PASO 1c: Funcion has_role (SECURITY DEFINER)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- =============================================
-- PASO 1d: Funcion get_user_role
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- PASO 1e: Eliminar TODAS las politicas anonimas
-- =============================================
DROP POLICY IF EXISTS "Allow anon read checkins" ON public.checkins;
DROP POLICY IF EXISTS "Allow anon read codigos_temporales" ON public.codigos_temporales;
DROP POLICY IF EXISTS "Allow anon read estudiantes" ON public.estudiantes;
DROP POLICY IF EXISTS "Allow anon read logs_evento" ON public.logs_evento;
DROP POLICY IF EXISTS "Allow anon read proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Allow anon insert proyectos" ON public.proyectos;
DROP POLICY IF EXISTS "Allow anon read registros_proyecto" ON public.registros_proyecto;
DROP POLICY IF EXISTS "Allow anon read usuarios" ON public.usuarios;

-- =============================================
-- PASO 1f: Nuevas politicas RLS por rol
-- =============================================

-- ---- USUARIOS ----
CREATE POLICY "Admin full access usuarios"
ON public.usuarios FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users read own usuario"
ON public.usuarios FOR SELECT TO authenticated
USING (auth_id = auth.uid());

-- ---- PROYECTOS ----
CREATE POLICY "Admin full access proyectos"
ON public.proyectos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Socio select own proyectos"
ON public.proyectos FOR SELECT TO authenticated
USING (
  socio_usuario_id IN (
    SELECT usuario_id FROM public.usuarios WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Socio insert own proyectos"
ON public.proyectos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'SOCIO')
  AND socio_usuario_id IN (
    SELECT usuario_id FROM public.usuarios WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Socio update own proyectos"
ON public.proyectos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'SOCIO')
  AND socio_usuario_id IN (
    SELECT usuario_id FROM public.usuarios WHERE auth_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'SOCIO')
  AND socio_usuario_id IN (
    SELECT usuario_id FROM public.usuarios WHERE auth_id = auth.uid()
  )
);

CREATE POLICY "Becario read all proyectos"
ON public.proyectos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'BECARIO'));

-- ---- CODIGOS_TEMPORALES ----
CREATE POLICY "Admin full access codigos"
ON public.codigos_temporales FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Socio crud own project codigos"
ON public.codigos_temporales FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'SOCIO')
  AND proyecto_id IN (
    SELECT p.proyecto_id FROM public.proyectos p
    JOIN public.usuarios u ON u.usuario_id = p.socio_usuario_id
    WHERE u.auth_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'SOCIO')
  AND proyecto_id IN (
    SELECT p.proyecto_id FROM public.proyectos p
    JOIN public.usuarios u ON u.usuario_id = p.socio_usuario_id
    WHERE u.auth_id = auth.uid()
  )
);

-- ---- REGISTROS_PROYECTO ----
CREATE POLICY "Admin full access registros"
ON public.registros_proyecto FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Socio read own project registros"
ON public.registros_proyecto FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'SOCIO')
  AND proyecto_id IN (
    SELECT p.proyecto_id FROM public.proyectos p
    JOIN public.usuarios u ON u.usuario_id = p.socio_usuario_id
    WHERE u.auth_id = auth.uid()
  )
);

CREATE POLICY "Becario read registros"
ON public.registros_proyecto FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'BECARIO'));

-- ---- CHECKINS ----
CREATE POLICY "Admin full access checkins"
ON public.checkins FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Becario manage checkins"
ON public.checkins FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'BECARIO'))
WITH CHECK (public.has_role(auth.uid(), 'BECARIO'));

-- ---- LOGS_EVENTO ----
CREATE POLICY "Admin read all logs"
ON public.logs_evento FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Users read own logs"
ON public.logs_evento FOR SELECT TO authenticated
USING (
  actor_usuario_id IN (
    SELECT usuario_id FROM public.usuarios WHERE auth_id = auth.uid()
  )
);

-- ---- ESTUDIANTES ----
CREATE POLICY "Admin full access estudiantes"
ON public.estudiantes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'ADMIN'))
WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Authenticated read estudiantes"
ON public.estudiantes FOR SELECT TO authenticated
USING (true);

-- =============================================
-- PASO 1g: Trigger auto-crear user_roles al insertar en usuarios
-- =============================================
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.auth_id, NEW.rol)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_user_role
AFTER INSERT OR UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();
