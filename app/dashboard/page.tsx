import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()

    return (
        <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
            <h1>Welcome, {profile?.first_name ?? 'friend'}!</h1>
            <p>This page is only visible when you're logged in.</p>
        </main>
    )
}