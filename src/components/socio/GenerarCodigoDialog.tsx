import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyectoId: string;
  proyectoNombre: string;
  cupoDisponible: number;
  onCreated: () => void;
}

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

const GenerarCodigoDialog = ({ open, onOpenChange, proyectoId, proyectoNombre, cupoDisponible, onCreated }: Props) => {
  const { usuarioId } = useAuth();
  const { toast } = useToast();
  const [expMinutes, setExpMinutes] = useState("10");
  const [saving, setSaving] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!usuarioId) return;
    if (cupoDisponible < 1) {
      toast({ title: "Sin cupos", description: "Este proyecto no tiene cupos disponibles.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const code = generateCode();
    const expiresAt = new Date(Date.now() + parseInt(expMinutes) * 60 * 1000).toISOString();

    const { error } = await supabase.from("codigos_temporales").insert({
      proyecto_id: proyectoId,
      codigo_hash: code,
      expira_en: expiresAt,
      creado_por_usuario_id: usuarioId,
    });

    if (error) {
      if (error.code === "23505") {
        // unique violation, retry once
        const code2 = generateCode(10);
        const { error: e2 } = await supabase.from("codigos_temporales").insert({
          proyecto_id: proyectoId,
          codigo_hash: code2,
          expira_en: expiresAt,
          creado_por_usuario_id: usuarioId,
        });
        if (e2) {
          toast({ title: "Error", description: e2.message, variant: "destructive" });
        } else {
          setGeneratedCode(code2);
          await logEvent(code2);
          onCreated();
        }
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      setGeneratedCode(code);
      await logEvent(code);
      onCreated();
    }
    setSaving(false);
  };

  const logEvent = async (code: string) => {
    if (!usuarioId) return;
    await supabase.from("logs_evento").insert({
      entidad: "codigos_temporales",
      tipo_evento: "codigo_generado",
      actor_usuario_id: usuarioId,
      metadata: { proyecto_id: proyectoId, codigo: code },
    });
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setGeneratedCode(null);
      setCopied(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generar código — {proyectoNombre}</DialogTitle>
        </DialogHeader>

        {generatedCode ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">Código generado exitosamente</p>
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted p-4">
              <span className="font-mono text-2xl font-bold tracking-widest">{generatedCode}</span>
              <Button size="icon" variant="ghost" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Expira en {expMinutes} minutos</p>
            <Button className="w-full" variant="outline" onClick={() => handleClose(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Expiración</Label>
              <Select value={expMinutes} onValueChange={setExpMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutos</SelectItem>
                  <SelectItem value="10">10 minutos</SelectItem>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Cupos disponibles: <strong>{cupoDisponible}</strong>
            </p>
            <Button className="w-full" onClick={handleGenerate} disabled={saving || cupoDisponible < 1}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Generar código
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GenerarCodigoDialog;
