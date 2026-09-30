import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname
    const isAuthPage = path.startsWith('/login') || path.startsWith('/auth')
    const isProtected =
        path.startsWith('/profile') ||
        path.startsWith('/dashboard') ||
        path.startsWith('/complete-profile')

    // Not logged in -> protected pages send you to /login
    if (!user && isProtected) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Logged in but no name yet -> send to /complete-profile
    if (user && !isAuthPage && !path.startsWith('/complete-profile')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single()

        if (!profile?.first_name || !profile?.last_name) {
            const url = request.nextUrl.clone()
            url.pathname = '/complete-profile'
            return NextResponse.redirect(url)
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}