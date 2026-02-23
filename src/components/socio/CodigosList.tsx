import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  proyectoId: string;
  refreshKey: number;
}

type CodigoRow = {
  codigo_id: string;
  codigo_hash: string;
  created_at: string;
  expira_en: string;
  usado: boolean;
  usado_en: string | null;
  usado_por_estudiante_id: string | null;
};

function getEstado(c: CodigoRow): "DISPONIBLE" | "USADO" | "EXPIRADO" {
  if (c.usado) return "USADO";
  if (new Date(c.expira_en) < new Date()) return "EXPIRADO";
  return "DISPONIBLE";
}

const badgeVariant: Record<string, "default" | "destructive" | "secondary"> = {
  DISPONIBLE: "default",
  USADO: "secondary",
  EXPIRADO: "destructive",
};

const CodigosList = ({ proyectoId, refreshKey }: Props) => {
  const { usuarioId } = useAuth();
  const { toast } = useToast();
  const [codigos, setCodigos] = useState<CodigoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("codigos_temporales")
      .select("codigo_id, codigo_hash, created_at, expira_en, usado, usado_en, usado_por_estudiante_id")
      .eq("proyecto_id", proyectoId)
      .order("created_at", { ascending: false })
      .limit(20);
    setCodigos((data as CodigoRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, [proyectoId, refreshKey]);

  const handleInvalidar = async (c: CodigoRow) => {
    const { error } = await supabase
      .from("codigos_temporales")
      .update({ usado: true, usado_en: new Date().toISOString() })
      .eq("codigo_id", c.codigo_id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Código invalidado" });
      if (usuarioId) {
        await supabase.from("logs_evento").insert({
          entidad: "codigos_temporales",
          tipo_evento: "codigo_invalidado",
          actor_usuario_id: usuarioId,
          entidad_id: c.codigo_id,
        });
      }
      fetch();
    }
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (codigos.length === 0) return <p className="py-2 text-sm text-muted-foreground">Sin códigos generados.</p>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead>Expira</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codigos.map((c) => {
            const estado = getEstado(c);
            return (
              <TableRow key={c.codigo_id}>
                <TableCell className="font-mono text-sm">{c.codigo_hash}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(c.expira_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                </TableCell>
                <TableCell>
                  <Badge variant={badgeVariant[estado]}>{estado}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {estado === "DISPONIBLE" && (
                    <Button size="sm" variant="ghost" onClick={() => handleInvalidar(c)}>
                      <XCircle className="mr-1 h-3 w-3" /> Invalidar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default CodigosList;
