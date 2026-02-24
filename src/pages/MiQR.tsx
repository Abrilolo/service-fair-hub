import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

const MiQR = () => {
  const { toast } = useToast();

  // Form
  const [matricula, setMatricula] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [carrera, setCarrera] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Result
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");

  // Lookup mode: student already registered
  const [lookupMatricula, setLookupMatricula] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [mode, setMode] = useState<"choose" | "register" | "lookup" | "done">("choose");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const trimmedMatricula = matricula.trim();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

    // Check if student already exists
    const { data: existing } = await supabase
      .from("estudiantes")
      .select("qr_token, nombre" as any)
      .eq("matricula", trimmedMatricula)
      .maybeSingle() as { data: { qr_token: string | null; nombre: string } | null };

    if (existing) {
      if (existing.qr_token) {
        setQrToken(existing.qr_token);
        setStudentName(existing.nombre);
        setMode("done");
        setSubmitting(false);
        return;
      }
      // Update with qr_token
      const { error } = await supabase
        .from("estudiantes")
        .update({ qr_token: token } as any)
        .eq("matricula", trimmedMatricula);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      setQrToken(token);
      setStudentName(existing.nombre);
      setMode("done");
      setSubmitting(false);
      return;
    }

    // Insert new student
    const { error } = await supabase
      .from("estudiantes")
      .insert({
        matricula: trimmedMatricula,
        nombre: nombre.trim(),
        correo: correo.trim(),
        carrera: carrera.trim(),
        qr_token: token,
      } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setQrToken(token);
    setStudentName(nombre.trim());
    setMode("done");
    setSubmitting(false);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookingUp(true);

    const { data, error } = await supabase
      .from("estudiantes")
      .select("qr_token, nombre" as any)
      .eq("matricula", lookupMatricula.trim())
      .maybeSingle() as { data: { qr_token: string | null; nombre: string } | null; error: any };

    if (error || !data) {
      toast({ title: "No encontrado", description: "No se encontró un estudiante con esa matrícula. Regístrate primero.", variant: "destructive" });
      setLookingUp(false);
      return;
    }

    if (!data.qr_token) {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
      await supabase.from("estudiantes").update({ qr_token: token } as any).eq("matricula", lookupMatricula.trim());
      setQrToken(token);
    } else {
      setQrToken(data.qr_token);
    }
    setStudentName(data.nombre);
    setMode("done");
    setLookingUp(false);
  };

  if (mode === "done" && qrToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="space-y-6 pt-8 pb-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <QrCode className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{studentName}</h2>
              <p className="text-sm text-muted-foreground">Tu QR para la feria</p>
            </div>
            <div className="flex justify-center rounded-xl border bg-white p-4">
              <QRCodeSVG value={qrToken} size={220} level="H" includeMargin />
            </div>
            <p className="text-xs text-muted-foreground">
              Guarda una captura de pantalla. Muestra este QR al becario en la feria para confirmar tu asistencia.
            </p>
            <Button variant="outline" onClick={() => { setMode("choose"); setQrToken(null); }} className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mi QR de Feria</CardTitle>
          <CardDescription>
            {mode === "choose"
              ? "Obtén tu código QR para la feria de servicio social"
              : mode === "register"
              ? "Completa tus datos para generar tu QR"
              : "Ingresa tu matrícula para ver tu QR"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "choose" && (
            <div className="space-y-3">
              <Button onClick={() => setMode("register")} className="w-full" size="lg">
                Soy nuevo — Registrarme
              </Button>
              <Button onClick={() => setMode("lookup")} variant="outline" className="w-full" size="lg">
                Ya me registré — Ver mi QR
              </Button>
            </div>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ej. A01234567" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Juan Pérez García" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo institucional</Label>
                <Input id="correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="Ej. a01234567@tec.mx" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carrera">Carrera</Label>
                <Input id="carrera" value={carrera} onChange={(e) => setCarrera(e.target.value)} placeholder="Ej. ITC, IDM, IMT" required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("choose")}>Atrás</Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                  Generar mi QR
                </Button>
              </div>
            </form>
          )}

          {mode === "lookup" && (
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lookup-matricula">Matrícula</Label>
                <Input id="lookup-matricula" value={lookupMatricula} onChange={(e) => setLookupMatricula(e.target.value)} placeholder="Ej. A01234567" required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("choose")}>Atrás</Button>
                <Button type="submit" className="flex-1" disabled={lookingUp}>
                  {lookingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Ver mi QR
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MiQR;
