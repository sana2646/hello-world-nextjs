'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const signInWithGoogle = async () => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
    }

    return (
        <main className="center-page">
            <div className="card auth-card">
                <div style={{ fontSize: 44 }}>🗽</div>
                <h1 className="page-title" style={{ marginTop: 8 }}>
                    NYC Caption Club
                </h1>
                <p className="subtitle" style={{ marginBottom: 24 }}>
                    Post your NYC moments, get AI captions, and vote on the funniest ones.
                </p>
                <button onClick={signInWithGoogle} className="btn btn-primary btn-lg btn-block">
                    Continue with Google
                </button>
                <p className="muted small" style={{ marginTop: 16 }}>
                    You can browse the feed without signing in.
                </p>
            </div>
        </main>
    )
}