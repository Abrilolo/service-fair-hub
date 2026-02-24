
-- Allow anon to insert into estudiantes (self-registration via public page)
CREATE POLICY "Anon insert estudiantes for self-registration"
ON public.estudiantes
FOR INSERT
WITH CHECK (true);
