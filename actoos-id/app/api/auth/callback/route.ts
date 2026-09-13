import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';
  const isProd = process.env.NODE_ENV === 'production';

  if (!code && !token_hash) {
    return NextResponse.redirect(`${origin}/`);
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

  let error = null;

  if (code) {
    // Flow PKCE (OAuth, magic link)
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (token_hash && type) {
    // Flow OTP (email change, recovery, etc.)
    const result = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    });
    error = result.error;
  }

  if (error) {
    console.error('[callback] auth error:', error.message);
    return NextResponse.redirect(`${origin}/?error=auth`);
  }

  return response;
}