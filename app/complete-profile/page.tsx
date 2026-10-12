'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CompleteProfilePage() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const supabase = createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: firstName,
                last_name: lastName,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)

        if (error) {
            setError(error.message)
            setSaving(false)
            return
        }

        router.push('/')
        router.refresh()
    }

    return (
        <main className="center-page">
            <div className="card auth-card">
                <div style={{ fontSize: 44 }}>👋</div>
                <h1 className="page-title" style={{ marginTop: 8 }}>
                    Welcome!
                </h1>
                <p className="subtitle" style={{ marginBottom: 24 }}>
                    What should we call you?
                </p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input className="input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    <input className="input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    <button type="submit" disabled={saving} className="btn btn-primary btn-lg btn-block">
                        {saving ? 'Saving…' : 'Continue'}
                    </button>
                    {error && <p className="error">{error}</p>}
                </form>
            </div>
        </main>
    )
}