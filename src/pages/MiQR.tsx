import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const MiQR = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [registro, setRegistro] = useState<{
    estudiante_nombre: string;
    matricula: string;
    proyecto_nombre: string;
    qr_token: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No se proporcionó un token válido.");
      setLoading(false);
      return;
    }

    const fetchRegistro = async () => {
      const { data, error: err } = await supabase
        .from("registros_proyecto")
        .select("qr_token, estudiantes(nombre, matricula), proyectos(nombre)")
        .eq("qr_token", token)
        .maybeSingle();

      if (err || !data) {
        setError("Registro no encontrado. Verifica tu enlace.");
      } else {
        const est = data.estudiantes as { nombre: string; matricula: string } | null;
        const proy = data.proyectos as { nombre: string } | null;
        setRegistro({
          estudiante_nombre: est?.nombre ?? "—",
          matricula: est?.matricula ?? "—",
          proyecto_nombre: proy?.nombre ?? "—",
          qr_token: data.qr_token!,
        });
      }
      setLoading(false);
    };

    fetchRegistro();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !registro) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="space-y-4 pt-8 pb-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="space-y-6 pt-8 pb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <QrCode className="h-7 w-7 text-primary" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold">{registro.estudiante_nombre}</h2>
            <p className="text-sm text-muted-foreground">{registro.matricula}</p>
            <Badge variant="secondary" className="mt-2">{registro.proyecto_nombre}</Badge>
          </div>

          <div className="flex justify-center rounded-xl border bg-white p-4">
            <QRCodeSVG
              value={registro.qr_token}
              size={220}
              level="H"
              includeMargin
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Muestra este QR al becario el día del evento para confirmar tu asistencia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MiQR;
