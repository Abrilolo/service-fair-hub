import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  ClipboardCheck,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Estudiante {
  estudiante_id: string;
  matricula: string;
  nombre: string;
  correo: string;
  carrera: string;
}

interface Inscripcion {
  registro_id: string;
  proyecto_id: string;
  estado: string;
  proyectos: { nombre: string } | null;
}

interface CheckinRecord {
  checkin_id: string;
  estudiante_id: string;
  proyecto_id: string | null;
  estado: "PENDIENTE" | "PRESENTE";
  fecha_hora: string;
  verificado_por_usuario_id: string;
}

interface RecentCheckin extends CheckinRecord {
  estudiantes: { nombre: string; matricula: string } | null;
  proyectos: { nombre: string } | null;
}

const BecarioDashboard = () => {
  const { user, usuarioId, signOut } = useAuth();
  const { toast } = useToast();

  // Search
  const [matricula, setMatricula] = useState("");
  const [searching, setSearching] = useState(false);
  const [estudianteFound, setEstudianteFound] = useState<Estudiante | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Inscriptions
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [noInscripcion, setNoInscripcion] = useState(false);
  const [selectedProyectoId, setSelectedProyectoId] = useState<string | null>(null);

  // Existing checkin for selected project
  const [existingCheckin, setExistingCheckin] = useState<CheckinRecord | null>(null);

  // Actions
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  // Recents
  const [recents, setRecents] = useState<RecentCheckin[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(true);

  const fetchRecents = useCallback(async () => {
    setRecentsLoading(true);
    const { data } = await supabase
      .from("checkins")
      .select("*, estudiantes(nombre, matricula), proyectos(nombre)")
      .order("fecha_hora", { ascending: false })
      .limit(20);
    setRecents((data as RecentCheckin[] | null) ?? []);
    setRecentsLoading(false);
  }, []);

  useEffect(() => {
    fetchRecents();
  }, [fetchRecents]);

  // When student found and inscriptions loaded, auto-select if only one
  useEffect(() => {
    if (inscripciones.length === 1) {
      setSelectedProyectoId(inscripciones[0].proyecto_id);
    } else {
      setSelectedProyectoId(null);
    }
  }, [inscripciones]);

  // When project selected, check existing checkin
  useEffect(() => {
    if (!estudianteFound || !selectedProyectoId) {
      setExistingCheckin(null);
      return;
    }
    const fetchCheckin = async () => {
      const { data } = await supabase
        .from("checkins")
        .select("*")
        .eq("estudiante_id", estudianteFound.estudiante_id)
        .eq("proyecto_id", selectedProyectoId)
        .maybeSingle();
      setExistingCheckin(data as CheckinRecord | null);
    };
    fetchCheckin();
  }, [estudianteFound, selectedProyectoId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = matricula.trim();
    if (!trimmed) return;

    setSearching(true);
    resetResults();

    // 1. Find student
    const { data: est, error } = await supabase
      .from("estudiantes")
      .select("*")
      .eq("matricula", trimmed)
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSearching(false);
      return;
    }

    if (!est) {
      setNotFound(true);
      setSearching(false);
      return;
    }

    setEstudianteFound(est as Estudiante);

    // 2. Check inscriptions
    const { data: regs } = await supabase
      .from("registros_proyecto")
      .select("registro_id, proyecto_id, estado, proyectos(nombre)")
      .eq("estudiante_id", est.estudiante_id)
      .eq("estado", "CONFIRMADO");

    const inscList = (regs as Inscripcion[] | null) ?? [];
    setInscripciones(inscList);
    if (inscList.length === 0) setNoInscripcion(true);

    setSearching(false);
  };

  const handleCheckin = async (estado: "PENDIENTE" | "PRESENTE") => {
    if (!estudianteFound || !usuarioId || !selectedProyectoId) return;
    setCheckinLoading(true);

    if (existingCheckin) {
      if (existingCheckin.estado === estado) {
        toast({ title: "Sin cambios", description: `Ya está como ${estado}.` });
        setCheckinLoading(false);
        return;
      }
      const { error } = await supabase
        .from("checkins")
        .update({ estado, verificado_por_usuario_id: usuarioId })
        .eq("checkin_id", existingCheckin.checkin_id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setCheckinLoading(false);
        return;
      }
      setExistingCheckin({ ...existingCheckin, estado });
    } else {
      const { data, error } = await supabase
        .from("checkins")
        .insert({
          estudiante_id: estudianteFound.estudiante_id,
          proyecto_id: selectedProyectoId,
          estado,
          verificado_por_usuario_id: usuarioId,
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setCheckinLoading(false);
        return;
      }
      setExistingCheckin(data as CheckinRecord);
    }

    // Audit
    await supabase.from("logs_evento").insert({
      tipo_evento: "checkin_update",
      entidad: "checkins",
      entidad_id: estudianteFound.estudiante_id,
      actor_usuario_id: usuarioId,
      metadata: {
        matricula: estudianteFound.matricula,
        estudiante_nombre: estudianteFound.nombre,
        proyecto_id: selectedProyectoId,
        estado,
      },
    });

    setCheckinSuccess(true);
    toast({
      title: estado === "PRESENTE" ? "✅ Presencia confirmada" : "⏳ Marcado como pendiente",
      description: `${estudianteFound.nombre} (${estudianteFound.matricula})`,
    });
    fetchRecents();
    setCheckinLoading(false);
  };

  const resetResults = () => {
    setEstudianteFound(null);
    setNotFound(false);
    setInscripciones([]);
    setNoInscripcion(false);
    setSelectedProyectoId(null);
    setExistingCheckin(null);
    setCheckinSuccess(false);
  };

  const resetSearch = () => {
    setMatricula("");
    resetResults();
  };

  const selectedProyectoNombre = inscripciones.find(
    (i) => i.proyecto_id === selectedProyectoId
  )?.proyectos?.nombre;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Panel de Becario</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-6 py-10">
        {/* Search & Check-in */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Check-in de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search form */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="matricula" className="sr-only">Matrícula</Label>
                <Input
                  id="matricula"
                  placeholder="Ingresa matrícula del estudiante"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  disabled={searching}
                />
              </div>
              <Button type="submit" disabled={searching || !matricula.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" /> Buscar</>}
              </Button>
              {(estudianteFound || notFound) && (
                <Button type="button" variant="ghost" onClick={resetSearch}>
                  Limpiar
                </Button>
              )}
            </form>

            {/* Not found */}
            {notFound && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Estudiante no encontrado</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  No se encontró un estudiante con matrícula "{matricula}". Debe registrarse primero en /registro.
                </p>
              </div>
            )}

            {/* No inscription */}
            {estudianteFound && noInscripcion && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Sin inscripción a proyectos</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {estudianteFound.nombre} ({estudianteFound.matricula}) no está inscrito a ningún proyecto.
                  No se puede registrar asistencia.
                </p>
              </div>
            )}

            {/* Student found with inscriptions */}
            {estudianteFound && inscripciones.length > 0 && (
              <div className="space-y-4">
                {/* Student info */}
                <div className="rounded-lg border bg-card p-4">
                  <p className="font-semibold text-lg">{estudianteFound.nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {estudianteFound.matricula} · {estudianteFound.carrera}
                  </p>
                </div>

                {/* Project selection */}
                {inscripciones.length === 1 ? (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium">Proyecto: {inscripciones[0].proyectos?.nombre ?? "—"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Selecciona el proyecto</Label>
                    <Select value={selectedProyectoId ?? ""} onValueChange={setSelectedProyectoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige un proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {inscripciones.map((insc) => (
                          <SelectItem key={insc.proyecto_id} value={insc.proyecto_id}>
                            {insc.proyectos?.nombre ?? insc.proyecto_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Current status */}
                {selectedProyectoId && existingCheckin && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Estado actual:</span>
                    <Badge variant={existingCheckin.estado === "PRESENTE" ? "default" : "secondary"}>
                      {existingCheckin.estado === "PRESENTE" ? (
                        <><CheckCircle2 className="mr-1 h-3 w-3" /> Presente</>
                      ) : (
                        <><Clock className="mr-1 h-3 w-3" /> Pendiente</>
                      )}
                    </Badge>
                  </div>
                )}

                {/* Success message */}
                {checkinSuccess && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Check-in actualizado correctamente</span>
                  </div>
                )}

                {/* Action buttons */}
                {selectedProyectoId && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleCheckin("PRESENTE")}
                      disabled={checkinLoading}
                      className="flex-1"
                    >
                      {checkinLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Marcar PRESENTE</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleCheckin("PENDIENTE")}
                      disabled={checkinLoading}
                    >
                      <Clock className="mr-2 h-4 w-4" /> Pendiente
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Checkins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Últimos Check-ins
              <Badge variant="secondary">{recents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay check-ins registrados aún.
              </p>
            ) : (
              <div className="space-y-2">
                {recents.map((ck) => (
                  <div
                    key={ck.checkin_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {ck.estudiantes?.nombre ?? "Desconocido"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ck.estudiantes?.matricula ?? "—"} · {ck.proyectos?.nombre ?? "Sin proyecto"} ·{" "}
                        {new Date(ck.fecha_hora).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <Badge variant={ck.estado === "PRESENTE" ? "default" : "secondary"}>
                      {ck.estado}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BecarioDashboard;
