
-- Add a unique QR token to registros_proyecto for scanning
ALTER TABLE public.registros_proyecto
ADD COLUMN qr_token TEXT UNIQUE DEFAULT NULL;

-- Create index for fast token lookup
CREATE INDEX idx_registros_proyecto_qr_token ON public.registros_proyecto(qr_token);

-- Allow anonymous users to read registros_proyecto by qr_token (for /mi-qr page)
CREATE POLICY "Public read own registration by qr_token"
ON public.registros_proyecto
FOR SELECT
USING (qr_token IS NOT NULL);
