import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(`${origin}${next}`);

    // Build the client against `response` directly (same pattern as
    // middleware.ts) rather than next/headers' implicit cookie jar — that
    // jar doesn't reliably merge into a separately-constructed
    // NextResponse.redirect(), so the session cookies set by
    // exchangeCodeForSession (or cleared by signOut()) never actually
    // reached the browser on this response.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Signup confirmation lands on /login — sign back out so the user
      // actually has to enter their password rather than being silently
      // logged in from the confirmation link alone.
      if (next.startsWith('/login')) {
        await supabase.auth.signOut();
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
