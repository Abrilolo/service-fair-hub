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
    const { codigo, matricula } = await req.json();

    // --- Input validation ---
    if (!codigo || !matricula) {
      return new Response(
        JSON.stringify({ error: "Código y matrícula son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof matricula !== "string" || matricula.trim().length < 3 || matricula.trim().length > 20) {
      return new Response(
        JSON.stringify({ error: "Matrícula inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for full access (public endpoint, no user auth)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- Step 1: Validate code ---
    const { data: codigoData, error: codigoError } = await admin
      .from("codigos_temporales")
      .select("codigo_id, proyecto_id, usado, expira_en")
      .eq("codigo_hash", codigo.trim().toUpperCase())
      .single();

    if (codigoError || !codigoData) {
      return new Response(
        JSON.stringify({ error: "Código inválido o no encontrado" }),
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

    const proyectoId = codigoData.proyecto_id;
    const codigoId = codigoData.codigo_id;

    // --- Step 2: Verify quota ---
    const { data: proyecto, error: proyErr } = await admin
      .from("proyectos")
      .select("cupo_disponible, nombre")
      .eq("proyecto_id", proyectoId)
      .single();

    if (proyErr || !proyecto) {
      return new Response(
        JSON.stringify({ error: "Proyecto no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (proyecto.cupo_disponible < 1) {
      return new Response(
        JSON.stringify({ error: "No hay cupos disponibles en este proyecto" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 3: Find existing student (must be pre-registered by becario) ---
    const { data: estudiante, error: estErr } = await admin
      .from("estudiantes")
      .select("estudiante_id, nombre")
      .eq("matricula", matricula.trim())
      .maybeSingle();

    if (estErr) {
      return new Response(
        JSON.stringify({ error: "Error al buscar estudiante: " + estErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!estudiante) {
      return new Response(
        JSON.stringify({ error: "Matrícula no encontrada. Debes registrarte primero con un becario en la feria." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const estudianteId = estudiante.estudiante_id;

    // --- Step 4: Check for duplicate registration ---
    const { data: existingReg } = await admin
      .from("registros_proyecto")
      .select("registro_id")
      .eq("estudiante_id", estudianteId)
      .eq("proyecto_id", proyectoId)
      .maybeSingle();

    if (existingReg) {
      return new Response(
        JSON.stringify({ error: "Este estudiante ya está registrado en este proyecto" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also check: student already registered in ANY project (1 project per student rule)
    const { data: anyReg } = await admin
      .from("registros_proyecto")
      .select("registro_id")
      .eq("estudiante_id", estudianteId)
      .eq("estado", "CONFIRMADO")
      .maybeSingle();

    if (anyReg) {
      return new Response(
        JSON.stringify({ error: "Este estudiante ya está registrado en otro proyecto. Solo se permite un registro por feria." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 5: Generate QR token and insert registration ---
    const qrToken = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();

    const { error: regErr } = await admin
      .from("registros_proyecto")
      .insert({
        estudiante_id: estudianteId,
        proyecto_id: proyectoId,
        codigo_id: codigoId,
        qr_token: qrToken,
      });

    if (regErr) {
      return new Response(
        JSON.stringify({ error: "Error al crear registro: " + regErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 6: Mark code as used ---
    const { error: markErr } = await admin
      .from("codigos_temporales")
      .update({
        usado: true,
        usado_en: new Date().toISOString(),
        usado_por_estudiante_id: estudianteId,
      })
      .eq("codigo_id", codigoId);

    if (markErr) {
      // Rollback: delete registration
      await admin.from("registros_proyecto").delete().eq("estudiante_id", estudianteId).eq("proyecto_id", proyectoId);
      return new Response(
        JSON.stringify({ error: "Error al marcar código: " + markErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 7: Decrement quota ---
    const { error: cupoErr } = await admin
      .from("proyectos")
      .update({ cupo_disponible: proyecto.cupo_disponible - 1 })
      .eq("proyecto_id", proyectoId);

    if (cupoErr) {
      // Rollback
      await admin.from("registros_proyecto").delete().eq("estudiante_id", estudianteId).eq("proyecto_id", proyectoId);
      await admin.from("codigos_temporales").update({ usado: false, usado_en: null, usado_por_estudiante_id: null }).eq("codigo_id", codigoId);
      return new Response(
        JSON.stringify({ error: "Error al actualizar cupo: " + cupoErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Step 8: Audit log ---
    await admin.from("logs_evento").insert({
      entidad: "registros_proyecto",
      tipo_evento: "registro_proyecto_publico",
      metadata: {
        proyecto_id: proyectoId,
        estudiante_id: estudianteId,
        codigo_id: codigoId,
        matricula: matricula.trim(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "¡Tu lugar está apartado!",
        proyecto_nombre: proyecto.nombre,
        qr_token: qrToken,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
