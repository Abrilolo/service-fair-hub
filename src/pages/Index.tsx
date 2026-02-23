import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Database, Server, FolderOpen, Users, Loader2 } from "lucide-react";

interface Proyecto {
  proyecto_id: string;
  nombre: string;
  descripcion: string | null;
  cupo_total: number;
  cupo_disponible: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

type StatusState = "idle" | "loading" | "ok" | "error";

const StatusIndicator = ({ status, label }: { status: StatusState; label: string }) => (
  <div className="flex items-center gap-3">
    {status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
    {status === "ok" && <CheckCircle className="h-5 w-5 text-success" />}
    {status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
    {status === "idle" && <div className="h-5 w-5 rounded-full border-2 border-muted" />}
    <span className="text-sm font-medium">{label}</span>
  </div>
);

const Index = () => {
  const [healthStatus, setHealthStatus] = useState<StatusState>("idle");
  const [dbStatus, setDbStatus] = useState<StatusState>("idle");
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loadingProyectos, setLoadingProyectos] = useState(false);

  const checkHealth = async () => {
    setHealthStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("health");
      if (error) throw error;
      setHealthStatus(data?.status === "OK" ? "ok" : "error");
    } catch {
      setHealthStatus("error");
    }
  };

  const checkDb = async () => {
    setDbStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("db-test");
      if (error) throw error;
      setDbStatus(data?.status === "DB connected" ? "ok" : "error");
    } catch {
      setDbStatus("error");
    }
  };

  const fetchProyectos = async () => {
    setLoadingProyectos(true);
    try {
      const { data, error } = await supabase.from("proyectos").select("*");
      if (error) throw error;
      setProyectos((data as Proyecto[]) || []);
    } catch (err) {
      console.error("Error fetching proyectos:", err);
    } finally {
      setLoadingProyectos(false);
    }
  };

  useEffect(() => {
    checkHealth();
    checkDb();
    fetchProyectos();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Feria de Servicio Social</h1>
              <p className="text-xs text-muted-foreground">Plataforma de Registro — MVP Base</p>
            </div>
          </div>
          <Badge variant="outline" className="border-success text-success">
            v0.1.0
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 space-y-8">
        {/* Status Cards */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card className="animate-fade-in" style={{ animationDelay: "0ms" }}>
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">API Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusIndicator status={healthStatus} label="/api/health" />
              <Button size="sm" variant="outline" onClick={checkHealth}>
                Re-check
              </Button>
            </CardContent>
          </Card>

          <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Database</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusIndicator status={dbStatus} label="/api/db-test" />
              <Button size="sm" variant="outline" onClick={checkDb}>
                Re-check
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Proyectos */}
        <section className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Proyectos</h2>
              <Badge variant="secondary" className="ml-2">
                {proyectos.length}
              </Badge>
            </div>
            <Button size="sm" variant="outline" onClick={fetchProyectos} disabled={loadingProyectos}>
              {loadingProyectos ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recargar"}
            </Button>
          </div>

          {proyectos.length === 0 && !loadingProyectos ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FolderOpen className="mb-3 h-10 w-10" />
                <p>No hay proyectos registrados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {proyectos.map((p) => (
                <Card key={p.proyecto_id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-1">
                      <p className="font-semibold">{p.nombre}</p>
                      {p.descripcion && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{p.descripcion}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.fecha_inicio).toLocaleDateString("es-MX")} — {new Date(p.fecha_fin).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={p.cupo_disponible > 0 ? "default" : "destructive"}>
                        {p.cupo_disponible}/{p.cupo_total} cupos
                      </Badge>
                      <Badge variant={p.activo ? "outline" : "secondary"}>
                        {p.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Schema Info */}
        <section className="animate-fade-in rounded-lg border border-border bg-card p-6" style={{ animationDelay: "300ms" }}>
          <h3 className="mb-3 font-bold">Tablas creadas en la base de datos</h3>
          <div className="flex flex-wrap gap-2">
            {["usuarios", "estudiantes", "proyectos", "checkins", "codigos_temporales", "registros_proyecto", "logs_evento"].map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-xs">
                {t}
              </Badge>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
