
-- Allow BECARIO to insert new students (when student not found by matrícula)
CREATE POLICY "Becario insert estudiantes"
ON public.estudiantes
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'BECARIO'::app_role));

-- Allow authenticated users to insert audit logs
CREATE POLICY "Authenticated insert logs"
ON public.logs_evento
FOR INSERT
TO authenticated
WITH CHECK (
  actor_usuario_id IN (
    SELECT usuario_id FROM public.usuarios WHERE auth_id = auth.uid()
  )
);
