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
      .from("project_comments")
      .select("id, project_id, author, content, created_at, edited_at, is_deleted, projets!inner(client_name, brief)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    const comments = data.map((c: any) => ({
      id: c.id,
      project_id: c.project_id,
      author: c.author,
      content: c.content,
      created_at: c.created_at,
      edited_at: c.edited_at,
      client_name: c.projets?.client_name || "Inconnu",
      project_name: c.projets?.brief?.projectName || "Sans titre",
    }));

    return new Response(JSON.stringify(comments), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});