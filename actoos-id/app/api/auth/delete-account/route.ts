import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '');

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // 1. Vérifier que l'utilisateur est bien authentifié
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const userId = userData.user.id;

    // 2. Client admin (bypass RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Nettoyer toutes les dépendances FK via la fonction SQL
    const { error: cleanupError } = await adminClient.rpc('cleanup_user_data', {
      target_user_id: userId,
    });
    if (cleanupError) {
      console.error('[delete-account] cleanup failed:', cleanupError);
      return NextResponse.json(
        { error: `Cleanup failed: ${cleanupError.message}` },
        { status: 500 }
      );
    }

    // 4. Supprimer de auth.users
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[delete-account] deleteUser failed:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-account]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}