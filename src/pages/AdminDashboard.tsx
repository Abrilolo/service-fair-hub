import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, FolderOpen, LogOut, Plus, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Register form
  const [regOpen, setRegOpen] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regNombre, setRegNombre] = useState("");
  const [regRol, setRegRol] = useState<string>("");
  const [regLoading, setRegLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [u, p] = await Promise.all([
      supabase.from("usuarios").select("*"),
      supabase.from("proyectos").select("*"),
    ]);
    setUsuarios(u.data || []);
    setProyectos(p.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("register-user", {
      body: { email: regEmail, password: regPassword, nombre: regNombre, rol: regRol },
    });

    if (error || data?.error) {
      toast({ title: "Error", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "Usuario creado", description: `${regNombre} registrado como ${regRol}` });
      setRegOpen(false);
      setRegEmail(""); setRegPassword(""); setRegNombre(""); setRegRol("");
      fetchData();
    }
    setRegLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Panel de Administrador</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Salir
          </Button>
        </div>
      </header>

      <main className="container mx-auto space-y-8 px-6 py-10">
        {/* Usuarios */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Usuarios</h2>
              <Badge variant="secondary">{usuarios.length}</Badge>
            </div>
            <Dialog open={regOpen} onOpenChange={setRegOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Registrar usuario</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar nuevo usuario</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={regNombre} onChange={e => setRegNombre(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo</Label>
                    <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña</Label>
                    <Input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select value={regRol} onValueChange={setRegRol}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                        <SelectItem value="SOCIO">SOCIO</SelectItem>
                        <SelectItem value="BECARIO">BECARIO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={regLoading || !regRol}>
                    {regLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="grid gap-3">
              {usuarios.map(u => (
                <Card key={u.usuario_id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-semibold">{u.nombre}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{u.rol}</Badge>
                      <Badge variant={u.activo ? "outline" : "secondary"}>{u.activo ? "Activo" : "Inactivo"}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Proyectos */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Proyectos</h2>
            <Badge variant="secondary">{proyectos.length}</Badge>
          </div>
          <div className="grid gap-3">
            {proyectos.map(p => (
              <Card key={p.proyecto_id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{p.nombre}</p>
                    {p.descripcion && <p className="text-sm text-muted-foreground line-clamp-1">{p.descripcion}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={p.cupo_disponible > 0 ? "default" : "destructive"}>
                      {p.cupo_disponible}/{p.cupo_total} cupos
                    </Badge>
                    <Badge variant={p.activo ? "outline" : "secondary"}>{p.activo ? "Activo" : "Inactivo"}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
