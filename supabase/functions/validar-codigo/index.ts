import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigo } = await req.json();

    if (!codigo || typeof codigo !== "string") {
      return new Response(
        JSON.stringify({ error: "Código requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: codigoData, error: codigoError } = await admin
      .from("codigos_temporales")
      .select("codigo_id, proyecto_id, usado, expira_en")
      .eq("codigo_hash", codigo.trim().toUpperCase())
      .single();

    if (codigoError || !codigoData) {
      return new Response(
        JSON.stringify({ error: "Código no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (codigoData.usado) {
      return new Response(
        JSON.stringify({ error: "Este código ya fue utilizado" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(codigoData.expira_en) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este código ha expirado" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: proyecto, error: proyErr } = await admin
      .from("proyectos")
      .select("nombre, cupo_disponible, proyecto_id")
      .eq("proyecto_id", codigoData.proyecto_id)
      .single();

    if (proyErr || !proyecto) {
      return new Response(
        JSON.stringify({ error: "Proyecto no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (proyecto.cupo_disponible < 1) {
      return new Response(
        JSON.stringify({ error: "No hay cupos disponibles" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        proyecto_nombre: proyecto.nombre,
        cupo_disponible: proyecto.cupo_disponible,
        proyecto_id: proyecto.proyecto_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
