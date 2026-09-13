import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/account';
  const isProd = process.env.NODE_ENV === 'production';

  if (!code && !token_hash) {
    return NextResponse.redirect(`${origin}/?error=missing_token`);
  }

  let response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: isProd
        ? {
            domain: '.actoos.com',
            path: '/',
            sameSite: 'lax',
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

  let error: any = null;

  // Cas 1 : PKCE classique (OAuth Google, magic link récent)
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  }
  // Cas 2 : token_hash avec préfixe pkce_ (email_change, recovery récents)
  else if (token_hash?.startsWith('pkce_') && type) {
    // Supabase PKCE flow : le token_hash contient le code PKCE
    const pkceCode = token_hash.replace(/^pkce_/, '');
    const result = await supabase.auth.exchangeCodeForSession(pkceCode);
    if (result.error) {
      // Fallback : essayer verifyOtp au cas où
      const fallback = await supabase.auth.verifyOtp({
        type: type as any,
        token_hash,
      });
      error = fallback.error;
    } else {
      error = result.error;
    }
  }
  // Cas 3 : token_hash classique (OTP pur)
  else if (token_hash && type) {
    const result = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });
    error = result.error;
  }

  if (error) {
    console.error('[callback] auth error:', error.message);
    return NextResponse.redirect(`${origin}/?error=auth&reason=${encodeURIComponent(error.message)}`);
  }

  return response;
}