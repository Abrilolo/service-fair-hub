import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, LogOut, Plus, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SocioDashboard = () => {
  const { user, usuarioId, signOut } = useAuth();
  const { toast } = useToast();
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cupoTotal, setCupoTotal] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");

  const fetchProyectos = async () => {
    setLoading(true);
    const { data } = await supabase.from("proyectos").select("*");
    setProyectos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioId) return;
    const cupo = parseInt(cupoTotal);
    if (cupo < 1) { toast({ title: "Error", description: "Cupo debe ser >= 1", variant: "destructive" }); return; }

    setSaving(true);
    const { error } = await supabase.from("proyectos").insert({
      nombre,
      descripcion: descripcion || null,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      cupo_total: cupo,
      cupo_disponible: cupo,
      socio_usuario_id: usuarioId,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proyecto creado" });
      setCreateOpen(false);
      setNombre(""); setDescripcion(""); setFechaInicio(""); setFechaFin(""); setCupoTotal("");
      fetchProyectos();
    }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("proyectos")
      .update({ descripcion: editDescripcion })
      .eq("proyecto_id", editId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proyecto actualizado" });
      setEditOpen(false);
      fetchProyectos();
    }
    setSaving(false);
  };

  const openEdit = (p: any) => {
    setEditId(p.proyecto_id);
    setEditDescripcion(p.descripcion || "");
    setEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <FolderOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Panel de Socio</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Mis Proyectos</h2>
            <Badge variant="secondary">{proyectos.length}</Badge>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nuevo proyecto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear proyecto</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={nombre} onChange={e => setNombre(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha inicio</Label>
                    <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha fin</Label>
                    <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cupo total</Label>
                  <Input type="number" min="1" value={cupoTotal} onChange={e => setCupoTotal(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : proyectos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderOpen className="mb-3 h-10 w-10" />
              <p>No tienes proyectos aún.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {proyectos.map(p => (
              <Card key={p.proyecto_id}>
                <CardContent className="flex items-center justify-between py-4">
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
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar descripción</DialogTitle></DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={editDescripcion} onChange={e => setEditDescripcion(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SocioDashboard;
