import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data, error } = await supabase
      .from("project_files")
      .select("id, project_id, name, url, size, type, uploaded_by, message, created_at, projets!inner(client_name, brief)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const files = data.map((f: any) => ({
      id: f.id,
      project_id: f.project_id,
      name: f.name,
      url: f.url,
      size: f.size,
      type: f.type,
      uploaded_by: f.uploaded_by,
      message: f.message,
      created_at: f.created_at,
      client_name: f.projets?.client_name || "Inconnu",
      project_name: f.projets?.brief?.projectName || "Sans titre",
    }));

    return new Response(JSON.stringify(files), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});