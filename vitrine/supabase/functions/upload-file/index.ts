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
    const form = await req.formData();
    const file = form.get("file") as File;
    const projectId = form.get("project_id") as string;
    const message = form.get("message") as string | null; // nouveau

    if (!file || !projectId) {
      return new Response(JSON.stringify({ error: "Fichier et project_id requis" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const bucket = "project-files";
    const filePath = `${projectId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (!publicUrl?.publicUrl) throw new Error("Impossible de générer l'URL publique");

    const { error: dbError } = await supabase.from("project_files").insert({
      project_id: projectId,
      name: file.name,
      url: publicUrl.publicUrl,
      size: file.size,
      type: file.type,
      uploaded_by: 'client',
      message: message || null,
    });
    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true, url: publicUrl.publicUrl }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});