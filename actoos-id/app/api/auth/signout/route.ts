import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    let response = NextResponse.json({ success: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: isProd
          ? {
              domain: '.actoos.com',
              path: '/',
              sameSite: 'none',
              secure: true,
              httpOnly: false,
            }
          : undefined,
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.signOut();

    return response;
  } catch (err: any) {
    console.error('[signout]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}