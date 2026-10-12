'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()
    const [loggedIn, setLoggedIn] = useState(false)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setLoggedIn(!!session)
        })
        return () => listener.subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    const link = (href: string, label: string) => (
        <Link href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
            {label}
        </Link>
    )

    return (
        <nav className="nav">
            <div className="nav-inner">
                <Link href="/" className="logo">
                    NYC Caption <span>Club</span>
                </Link>
                <div className="nav-links">
                    {link('/', 'Feed')}
                    {loggedIn ? (
                        <>
                            {link('/dashboard', 'My Posts')}
                            {link('/profile', 'Profile')}
                            <button onClick={signOut} className="nav-link">
                                Sign out
                            </button>
                            <Link href="/generate" className="btn btn-primary" style={{ marginLeft: 6 }}>
                                + Post
                            </Link>
                        </>
                    ) : (
                        <Link href="/login" className="btn btn-primary" style={{ marginLeft: 6 }}>
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    )
}