import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LogOut,
  ClipboardCheck,
  Search,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Estudiante {
  estudiante_id: string;
  matricula: string;
  nombre: string;
  correo: string;
  carrera: string;
}

interface Checkin {
  checkin_id: string;
  fecha_hora: string;
  estado: "PENDIENTE" | "PRESENTE";
  estudiante_id: string;
  verificado_por_usuario_id: string;
}

interface CheckinWithStudent extends Checkin {
  estudiantes: { nombre: string; matricula: string } | null;
}

const BecarioDashboard = () => {
  const { user, usuarioId, signOut } = useAuth();
  const { toast } = useToast();

  // Search state
  const [matricula, setMatricula] = useState("");
  const [searching, setSearching] = useState(false);
  const [estudianteFound, setEstudianteFound] = useState<Estudiante | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Existing checkin for found student
  const [existingCheckin, setExistingCheckin] = useState<Checkin | null>(null);

  // Create student dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newCorreo, setNewCorreo] = useState("");
  const [newCarrera, setNewCarrera] = useState("");
  const [creating, setCreating] = useState(false);

  // Checkin action
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  // Recent checkins
  const [recents, setRecents] = useState<CheckinWithStudent[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(true);

  const fetchRecents = useCallback(async () => {
    setRecentsLoading(true);
    const { data } = await supabase
      .from("checkins")
      .select("*, estudiantes(nombre, matricula)")
      .order("fecha_hora", { ascending: false })
      .limit(10);
    setRecents((data as CheckinWithStudent[] | null) ?? []);
    setRecentsLoading(false);
  }, []);

  useEffect(() => {
    fetchRecents();
  }, [fetchRecents]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = matricula.trim();
    if (!trimmed) return;

    setSearching(true);
    setEstudianteFound(null);
    setNotFound(false);
    setExistingCheckin(null);
    setCheckinSuccess(false);

    const { data, error } = await supabase
      .from("estudiantes")
      .select("*")
      .eq("matricula", trimmed)
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSearching(false);
      return;
    }

    if (!data) {
      setNotFound(true);
      setSearching(false);
      return;
    }

    setEstudianteFound(data as Estudiante);
    // Check if there's already a checkin for this student
    const { data: ck } = await supabase
      .from("checkins")
      .select("*")
      .eq("estudiante_id", data.estudiante_id)
      .maybeSingle();

    if (ck) setExistingCheckin(ck as Checkin);
    setSearching(false);
  };

  const handleCreateEstudiante = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = matricula.trim();
    if (!trimmed) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("estudiantes")
      .insert({
        matricula: trimmed,
        nombre: newNombre.trim() || "Sin nombre",
        correo: newCorreo.trim() || `${trimmed}@placeholder.com`,
        carrera: newCarrera.trim() || "No especificada",
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error al crear estudiante",
        description: error.message,
        variant: "destructive",
      });
      setCreating(false);
      return;
    }

    setEstudianteFound(data as Estudiante);
    setNotFound(false);
    setCreateOpen(false);
    setNewNombre("");
    setNewCorreo("");
    setNewCarrera("");
    toast({ title: "Estudiante creado", description: `Matrícula: ${trimmed}` });
    setCreating(false);
  };

  const handleCheckin = async (estado: "PENDIENTE" | "PRESENTE") => {
    if (!estudianteFound || !usuarioId) return;
    setCheckinLoading(true);

    if (existingCheckin) {
      if (existingCheckin.estado === estado) {
        toast({ title: "Sin cambios", description: `El estudiante ya está como ${estado}.` });
        setCheckinLoading(false);
        return;
      }
      // Update existing
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
      // Insert new
      const { data, error } = await supabase
        .from("checkins")
        .insert({
          estudiante_id: estudianteFound.estudiante_id,
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
      setExistingCheckin(data as Checkin);
    }

    // Audit log
    await supabase.from("logs_evento").insert({
      tipo_evento: "CHECKIN",
      entidad: "checkins",
      entidad_id: estudianteFound.estudiante_id,
      actor_usuario_id: usuarioId,
      metadata: {
        matricula: estudianteFound.matricula,
        estado,
        estudiante_nombre: estudianteFound.nombre,
      },
    });

    setCheckinSuccess(true);
    toast({
      title: estado === "PRESENTE" ? "✅ Check-in registrado" : "⏳ Marcado como pendiente",
      description: `${estudianteFound.nombre} (${estudianteFound.matricula})`,
    });
    fetchRecents();
    setCheckinLoading(false);
  };

  const resetSearch = () => {
    setMatricula("");
    setEstudianteFound(null);
    setNotFound(false);
    setExistingCheckin(null);
    setCheckinSuccess(false);
  };

  return (
    <div className="min-h-screen bg-background">
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
        {/* Search / Check-in Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Check-in de Estudiantes
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
                  No se encontró un estudiante con matrícula "{matricula}".
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setCreateOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Registrar estudiante
                </Button>
              </div>
            )}

            {/* Student found */}
            {estudianteFound && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{estudianteFound.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {estudianteFound.matricula} · {estudianteFound.carrera}
                      </p>
                      <p className="text-sm text-muted-foreground">{estudianteFound.correo}</p>
                    </div>
                    {existingCheckin && (
                      <Badge variant={existingCheckin.estado === "PRESENTE" ? "default" : "secondary"}>
                        {existingCheckin.estado === "PRESENTE" ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" /> Presente</>
                        ) : (
                          <><Clock className="mr-1 h-3 w-3" /> Pendiente</>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Checkin success */}
                {checkinSuccess && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Check-in actualizado correctamente</span>
                  </div>
                )}

                {/* Action buttons */}
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
                        {ck.estudiantes?.matricula ?? "—"} ·{" "}
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

        {/* Create student dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar nuevo estudiante</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEstudiante} className="space-y-4">
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input value={matricula} disabled />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Nombre completo (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Correo</Label>
                <Input
                  type="email"
                  value={newCorreo}
                  onChange={(e) => setNewCorreo(e.target.value)}
                  placeholder="correo@ejemplo.com (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Carrera</Label>
                <Input
                  value={newCarrera}
                  onChange={(e) => setNewCarrera(e.target.value)}
                  placeholder="Carrera (opcional)"
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar estudiante"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BecarioDashboard;
