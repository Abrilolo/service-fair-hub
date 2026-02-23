import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Pencil, KeyRound, ChevronDown } from "lucide-react";
import GenerarCodigoDialog from "./GenerarCodigoDialog";
import CodigosList from "./CodigosList";

interface Proyecto {
  proyecto_id: string;
  nombre: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  cupo_total: number;
  cupo_disponible: number;
}

interface Props {
  proyecto: Proyecto;
  onEdit: (p: Proyecto) => void;
}

const ProyectoCard = ({ proyecto: p, onEdit }: Props) => {
  const [genOpen, setGenOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-semibold">{p.nombre}</p>
              {p.descripcion && <p className="text-sm text-muted-foreground line-clamp-1">{p.descripcion}</p>}
              <p className="text-xs text-muted-foreground">
                {new Date(p.fecha_inicio).toLocaleDateString("es-MX")} — {new Date(p.fecha_fin).toLocaleDateString("es-MX")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.cupo_disponible > 0 ? "default" : "destructive"}>
                {p.cupo_disponible}/{p.cupo_total}
              </Badge>
              <Button size="icon" variant="ghost" onClick={() => onEdit(p)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setGenOpen(true)} disabled={p.cupo_disponible < 1}>
                <KeyRound className="mr-1 h-4 w-4" /> Generar código
              </Button>
            </div>
          </div>

          <Collapsible open={codesOpen} onOpenChange={setCodesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                Códigos generados
                <ChevronDown className={`h-4 w-4 transition-transform ${codesOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CodigosList proyectoId={p.proyecto_id} refreshKey={refreshKey} />
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <GenerarCodigoDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        proyectoId={p.proyecto_id}
        proyectoNombre={p.nombre}
        cupoDisponible={p.cupo_disponible}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
};

export default ProyectoCard;
