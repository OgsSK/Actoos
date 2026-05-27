import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'actoos-admin-2026';

  if ((!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) && token !== ADMIN_TOKEN) {
    return new NextResponse(JSON.stringify({ error: 'Accès non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Appeler l'Edge Function Supabase (données toujours fraîches)
    const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-projects');

    if (!res.ok) {
      return new NextResponse(JSON.stringify({ error: 'Erreur récupération projets' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const projets = await res.json();
    const projetsArray = Array.isArray(projets) ? projets : [];

    return new NextResponse(JSON.stringify(projetsArray), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}