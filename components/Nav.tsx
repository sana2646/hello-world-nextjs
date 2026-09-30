'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
    const supabase = createClient()
    const router = useRouter()
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
        router.push('/login')
        router.refresh()
    }

    return (
        <nav style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #ccc', fontFamily: 'sans-serif' }}>
            <Link href="/">Home</Link>
            {loggedIn ? (
                <>
                    <Link href="/profile">Profile</Link>
                    <Link href="/dashboard">Dashboard</Link>
                    <button onClick={signOut} style={{ cursor: 'pointer' }}>Sign out</button>
                </>
            ) : (
                <Link href="/login">Sign in</Link>
            )}
        </nav>
    )
}