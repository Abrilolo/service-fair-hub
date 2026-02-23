import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("proyectos")
        .select("*, usuarios!proyectos_socio_usuario_id_fkey(nombre, email)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { nombre, fecha_inicio, fecha_fin, descripcion, cupo_total, socio_usuario_id } = body;

      const { data, error } = await supabase.from("proyectos").insert({
        nombre,
        fecha_inicio,
        fecha_fin,
        descripcion,
        cupo_total,
        cupo_disponible: cupo_total,
        socio_usuario_id,
      }).select().single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
