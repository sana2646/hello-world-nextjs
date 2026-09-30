'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
    const supabase = createClient()
    const [userId, setUserId] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [message, setMessage] = useState('')

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setUserId(user.id)
            const { data } = await supabase
                .from('profiles')
                .select('first_name, last_name, avatar_url')
                .eq('id', user.id)
                .single()
            if (data) {
                setFirstName(data.first_name ?? '')
                setLastName(data.last_name ?? '')
                setAvatarUrl(data.avatar_url ?? '')
            }
        }
        load()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage('Saving...')
        let newAvatarUrl = avatarUrl

        if (file) {
            const path = `${userId}/avatar.png`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(path, file, { upsert: true })
            if (uploadError) {
                setMessage('Upload error: ' + uploadError.message)
                return
            }
            const { data } = supabase.storage.from('avatars').getPublicUrl(path)
            newAvatarUrl = `${data.publicUrl}?t=${Date.now()}`
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                first_name: firstName,
                last_name: lastName,
                avatar_url: newAvatarUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

        if (error) {
            setMessage('Error: ' + error.message)
            return
        }
        setAvatarUrl(newAvatarUrl)
        setMessage('Profile saved!')
    }

    return (
        <main style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 400 }}>
            <h1>Your Profile</h1>
            {avatarUrl && (
                <img
                    src={avatarUrl}
                    alt="Profile photo"
                    style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
                />
            )}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                <input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ padding: 10 }} />
                <input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ padding: 10 }} />
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <button type="submit" style={{ padding: 10, cursor: 'pointer' }}>Save</button>
                {message && <p>{message}</p>}
            </form>
        </main>
    )
}