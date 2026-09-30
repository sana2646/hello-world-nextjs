'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const signInWithGoogle = async () => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <main
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontFamily: 'sans-serif',
                gap: 16,
            }}
        >
            <h1>Sign in</h1>
            <button
                onClick={signInWithGoogle}
                style={{
                    padding: '12px 24px',
                    fontSize: 16,
                    borderRadius: 8,
                    border: '1px solid #ccc',
                    cursor: 'pointer',
                    background: 'white',
                    color: 'black',
                }}
            >
                Sign in with Google
            </button>
        </main>
    )
}