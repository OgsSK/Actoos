import { supabase } from './supabase';

/**
 * Gère les demandes de cours lors d'une suspension.
 * - Demandes pending → archivées
 * - Emails envoyés aux contreparties
 */
export async function handleSuspensionSideEffects(
  userId: string,
  suspendedByName: string = 'l\'équipe'
): Promise<void> {
  try {
    // 1. Récupérer les demandes pending impliquant cet user
    const { data: pendingRequests } = await supabase
      .from('lesson_requests')
      .select('id, parent_id, teacher_id, subject')
      .eq('status', 'pending')
      .or(`parent_id.eq.${userId},teacher_id.eq.${userId}`);

    if (!pendingRequests || pendingRequests.length === 0) return;

    // 2. Archiver toutes ces demandes
    const ids = pendingRequests.map(r => r.id);
    await supabase
      .from('lesson_requests')
      .update({ status: 'archived' })
      .in('id', ids);

    // 3. Notifier les contreparties
    for (const req of pendingRequests) {
      const counterpartId = req.parent_id === userId ? req.teacher_id : req.parent_id;
      const reason = req.parent_id === userId
        ? 'Le parent a été suspendu par notre équipe.'
        : 'L\'enseignant a été suspendu par notre équipe.';

      // Fire & forget
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'request-cancelled-by-suspension',
            request_id: req.id,
            notify_user_id: counterpartId,
            reason,
          }),
        }
      ).catch(e => console.warn('[Suspension] Email non envoyé:', e));
    }

    console.log(`[Suspension] ${pendingRequests.length} demande(s) archivée(s)`);
  } catch (err) {
    console.error('[Suspension] Side effects error:', err);
  }
}