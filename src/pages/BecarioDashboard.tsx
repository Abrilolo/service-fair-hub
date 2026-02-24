import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  ClipboardCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";

interface RecentCheckin {
  checkin_id: string;
  estudiante_id: string;
  proyecto_id: string | null;
  estado: "PENDIENTE" | "PRESENTE";
  fecha_hora: string;
  estudiantes: { nombre: string; matricula: string } | null;
  proyectos: { nombre: string } | null;
}

const BecarioDashboard = () => {
  const { user, usuarioId, signOut } = useAuth();
  const { toast } = useToast();

  // Scanner
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-reader";

  // Processing
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: "success" | "error" | "warning";
    title: string;
    description: string;
  } | null>(null);

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

  const processQrToken = useCallback(async (qrToken: string) => {
    if (processing || !usuarioId) return;
    setProcessing(true);
    setLastResult(null);

    // 1. Find registration by qr_token
    const { data: reg, error: regErr } = await supabase
      .from("registros_proyecto")
      .select("registro_id, estudiante_id, proyecto_id, estado, estudiantes(nombre, matricula, carrera), proyectos(nombre)")
      .eq("qr_token", qrToken)
      .maybeSingle();

    if (regErr || !reg) {
      setLastResult({ type: "error", title: "QR no válido", description: "No se encontró ningún registro con este código QR." });
      setProcessing(false);
      return;
    }

    if (reg.estado !== "CONFIRMADO") {
      setLastResult({ type: "warning", title: "Registro cancelado", description: "Este registro fue cancelado y no se puede hacer check-in." });
      setProcessing(false);
      return;
    }

    const est = reg.estudiantes as { nombre: string; matricula: string; carrera: string } | null;
    const proy = reg.proyectos as { nombre: string } | null;

    // 2. Check existing checkin
    const { data: existingCheckin } = await supabase
      .from("checkins")
      .select("checkin_id, estado")
      .eq("estudiante_id", reg.estudiante_id)
      .eq("proyecto_id", reg.proyecto_id)
      .maybeSingle();

    if (existingCheckin?.estado === "PRESENTE") {
      setLastResult({
        type: "warning",
        title: "Ya registrado",
        description: `${est?.nombre} (${est?.matricula}) ya está marcado como PRESENTE en ${proy?.nombre}.`,
      });
      setProcessing(false);
      return;
    }

    // 3. Upsert checkin as PRESENTE
    if (existingCheckin) {
      await supabase
        .from("checkins")
        .update({ estado: "PRESENTE", verificado_por_usuario_id: usuarioId })
        .eq("checkin_id", existingCheckin.checkin_id);
    } else {
      await supabase
        .from("checkins")
        .insert({
          estudiante_id: reg.estudiante_id,
          proyecto_id: reg.proyecto_id,
          estado: "PRESENTE",
          verificado_por_usuario_id: usuarioId,
        });
    }

    // 4. Audit log
    await supabase.from("logs_evento").insert({
      tipo_evento: "checkin_qr",
      entidad: "checkins",
      entidad_id: reg.estudiante_id,
      actor_usuario_id: usuarioId,
      metadata: {
        matricula: est?.matricula,
        estudiante_nombre: est?.nombre,
        proyecto_id: reg.proyecto_id,
        estado: "PRESENTE",
        qr_token: qrToken,
      },
    });

    setLastResult({
      type: "success",
      title: "✅ Presencia confirmada",
      description: `${est?.nombre} (${est?.matricula}) — ${proy?.nombre}`,
    });

    fetchRecents();
    setProcessing(false);
  }, [processing, usuarioId, fetchRecents]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) return;
    setLastResult(null);

    const scanner = new Html5Qrcode(scannerContainerId);
    scannerRef.current = scanner;
    setScanning(true);

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Stop scanner immediately after reading
          try {
            await scanner.stop();
            scannerRef.current = null;
            setScanning(false);
          } catch { /* ignore */ }
          processQrToken(decodedText.trim());
        },
        () => { /* ignore scan failures */ }
      );
    } catch (err: unknown) {
      setScanning(false);
      scannerRef.current = null;
      const message = err instanceof Error ? err.message : "No se pudo acceder a la cámara";
      toast({ title: "Error de cámara", description: message, variant: "destructive" });
    }
  }, [processQrToken, toast]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ScanLine className="h-5 w-5 text-primary-foreground" />
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

      <main className="container mx-auto space-y-6 px-6 py-8">
        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Escanear QR de estudiante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scanner viewport */}
            <div
              id={scannerContainerId}
              className={`mx-auto w-full max-w-sm overflow-hidden rounded-xl border-2 border-dashed border-border ${
                scanning ? "border-primary" : ""
              }`}
              style={{ minHeight: scanning ? 300 : 0 }}
            />

            {!scanning && !processing && (
              <Button onClick={startScanner} className="w-full" size="lg">
                <ScanLine className="mr-2 h-5 w-5" />
                Abrir cámara y escanear
              </Button>
            )}

            {scanning && (
              <Button variant="outline" onClick={stopScanner} className="w-full">
                Detener cámara
              </Button>
            )}

            {processing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">Procesando check-in…</span>
              </div>
            )}

            {/* Result */}
            {lastResult && (
              <div
                className={`rounded-lg border p-4 flex items-start gap-3 ${
                  lastResult.type === "success"
                    ? "border-green-500/30 bg-green-500/5 text-green-700"
                    : lastResult.type === "warning"
                    ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-700"
                    : "border-destructive/30 bg-destructive/5 text-destructive"
                }`}
              >
                {lastResult.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                ) : lastResult.type === "warning" ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold">{lastResult.title}</p>
                  <p className="text-sm opacity-80">{lastResult.description}</p>
                </div>
              </div>
            )}

            {lastResult && !scanning && !processing && (
              <Button onClick={startScanner} variant="outline" className="w-full">
                <ScanLine className="mr-2 h-4 w-4" />
                Escanear otro
              </Button>
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
