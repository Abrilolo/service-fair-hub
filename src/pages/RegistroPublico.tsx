import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProyectoInfo {
  nombre: string;
  cupo_disponible: number;
  proyecto_id: string;
}

const RegistroPublico = () => {
  const { toast } = useToast();

  // Step 1: Code validation
  const [codigo, setCodigo] = useState("");
  const [validating, setValidating] = useState(false);
  const [proyecto, setProyecto] = useState<ProyectoInfo | null>(null);

  // Step 2: Student form
  const [matricula, setMatricula] = useState("");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [carrera, setCarrera] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 3: Success
  const [success, setSuccess] = useState<string | null>(null);

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = codigo.trim().toUpperCase();
    if (!trimmed) return;

    setValidating(true);
    // Validate code client-side first (read-only check via anon)
    // We use the edge function for the actual transaction, but we can peek at the code
    // to show project info. Since RLS blocks anon, we'll call a lightweight validation via the edge function.
    // Actually, let's just call the edge function with a "validate_only" mode or do a simple anon query.
    // Since codigos_temporales has restrictive RLS, let's use a simple approach: 
    // call the edge function with only the code to get project info.

    try {
      const { data, error } = await supabase.functions.invoke("validar-codigo", {
        body: { codigo: trimmed },
      });

      if (error || data?.error) {
        toast({
          title: "Código inválido",
          description: data?.error || error?.message || "No se pudo validar el código",
          variant: "destructive",
        });
      } else {
        setProyecto({
          nombre: data.proyecto_nombre,
          cupo_disponible: data.cupo_disponible,
          proyecto_id: data.proyecto_id,
        });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo conectar con el servidor", variant: "destructive" });
    }
    setValidating(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("registrar-estudiante", {
        body: {
          codigo: codigo.trim().toUpperCase(),
          matricula: matricula.trim(),
          nombre: nombre.trim(),
          correo: correo.trim().toLowerCase(),
          carrera: carrera.trim(),
        },
      });

      if (error || data?.error) {
        toast({
          title: "Error en registro",
          description: data?.error || error?.message || "No se pudo completar el registro",
          variant: "destructive",
        });
      } else {
        setSuccess(data.proyecto_nombre || proyecto?.nombre || "el proyecto");
      }
    } catch {
      toast({ title: "Error", description: "No se pudo conectar con el servidor", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setCodigo("");
    setProyecto(null);
    setMatricula("");
    setNombre("");
    setCorreo("");
    setCarrera("");
    setSuccess(null);
  };

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-6 pt-8 pb-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">¡Tu lugar está apartado!</h2>
              <p className="text-muted-foreground">
                Te has registrado exitosamente en <strong>{success}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Recuerda asistir el día del evento para hacer tu check-in.
              </p>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Registrar otro estudiante
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
          <CardTitle className="text-2xl">Registro de Servicio Social</CardTitle>
          <CardDescription>
            {proyecto
              ? "Completa tus datos para confirmar tu registro"
              : "Ingresa el código que te proporcionó tu socio"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!proyecto ? (
            // Step 1: Code input
            <form onSubmit={handleValidateCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código temporal</Label>
                <Input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ej. ABCD1234"
                  className="text-center font-mono text-lg tracking-widest"
                  maxLength={12}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={validating || !codigo.trim()}>
                {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Validar código
              </Button>
            </form>
          ) : (
            // Step 2: Registration form
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Proyecto</span>
                  <Badge variant="secondary">{proyecto.cupo_disponible} cupos</Badge>
                </div>
                <p className="font-semibold">{proyecto.nombre}</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="matricula">Matrícula</Label>
                  <Input
                    id="matricula"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Ej. A01234567"
                    maxLength={20}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo electrónico</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="tu@correo.com"
                    maxLength={255}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrera">Carrera</Label>
                  <Input
                    id="carrera"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    placeholder="Ej. Ingeniería en Sistemas"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleReset} className="flex-shrink-0">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Atrás
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirmar registro
                  </Button>
                </div>
              </form>

              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Solo puedes registrarte en un proyecto por feria. Asegúrate de elegir bien.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegistroPublico;
