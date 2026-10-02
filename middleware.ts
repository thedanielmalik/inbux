import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./lib/supabase/build-env";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          }
        }
      }
    );

    // Refresh/verify the session when possible. A temporary Supabase auth
    // failure must not take the whole application offline.
    await supabase.auth.getClaims();
  } catch (error) {
    console.error("Supabase middleware session refresh failed:", error);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
