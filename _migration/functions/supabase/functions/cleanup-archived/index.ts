import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Récupérer les projets archivés depuis plus de 24h
    const { data: toDelete, error: fetchError } = await supabase
      .from("projets")
      .select("id, client_email, client_name, brief")
      .eq("archived", true)
      .lt("archived_at", twentyFourHoursAgo);

    if (fetchError) throw fetchError;

    // Envoyer un email de refus à chaque client
    for (const projet of toDelete) {
      if (projet.client_email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Actoos <noreply@actoos.com>",
            to: projet.client_email,
            subject: "Votre projet a été définitivement supprimé",
            html: `<h2>Bonjour ${projet.client_name},</h2><p>Le projet <strong>${projet.brief?.projectName || ''}</strong> a été définitivement supprimé de notre système. Nous vous remercions de votre confiance et vous invitons à soumettre un nouveau projet si besoin.</p>`,
          }),
        });
      }
    }

    // Supprimer définitivement les projets
    const { error: deleteError } = await supabase
      .from("projets")
      .delete()
      .in("id", toDelete.map(p => p.id));

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true, deleted: toDelete.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});