import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type CaptionRow = {
    id: string
    caption: string
    image_url: string
    theme: string | null
    created_at: string
    votes: { value: number }[]
}

export default async function MyPostsPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single()

    const { data } = await supabase
        .from('captions')
        .select('id, caption, image_url, theme, created_at, votes(value)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    const captions = ((data as CaptionRow[]) ?? []).map((c) => ({
        ...c,
        score: c.votes.reduce((sum, v) => sum + v.value, 0),
    }))

    const groups = new Map<string, typeof captions>()
    for (const c of captions) {
        if (!groups.has(c.image_url)) groups.set(c.image_url, [])
        groups.get(c.image_url)!.push(c)
    }
    const posts = Array.from(groups.entries()).map(([image_url, items]) => ({
        image_url,
        theme: items[0].theme,
        items: [...items].sort((a, b) => b.score - a.score),
    }))

    const totalScore = captions.reduce((sum, c) => sum + c.score, 0)
    const best = [...captions].sort((a, b) => b.score - a.score)[0]

    return (
        <main className="container">
            <h1 className="page-title">Hey {profile?.first_name ?? 'there'} 👋</h1>
            <p className="subtitle">Here&apos;s how your posts are doing.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
                <div className="card" style={{ padding: 16 }}>
                    <div className="muted small">Photos posted</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{posts.length}</div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                    <div className="muted small">Total votes</div>
                    <div style={{ fontSize: 28, fontWeight: 800 }}>{totalScore}</div>
                </div>
            </div>

            {best && best.score > 0 && (
                <div className="theme-banner">
                    <div>
                        <div className="theme-label">👑 Your best caption</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{best.caption}</div>
                        <div className="muted small" style={{ marginTop: 4 }}>{best.score} votes</div>
                    </div>
                </div>
            )}

            {posts.length === 0 && (
                <div className="card empty">
                    <div style={{ fontSize: 40 }}>📸</div>
                    <p style={{ fontWeight: 700, marginTop: 8 }}>You haven&apos;t posted yet</p>
                    <p className="muted" style={{ marginBottom: 16 }}>Post a photo and see what people think.</p>
                    <Link href="/generate" className="btn btn-primary">+ Post a photo</Link>
                </div>
            )}

            {posts.map((post) => (
                <article key={post.image_url} className="card post">
                    <img src={post.image_url} alt="Your photo" className="post-img" style={{ maxHeight: 280 }} />
                    <div className="post-body">
                        {post.theme && (
                            <div className="post-meta">
                                <span className="hashtag">#{post.theme}</span>
                            </div>
                        )}
                        {post.items.map((c) => (
                            <div key={c.id} className="caption-row">
                                <span className="caption-text">{c.caption}</span>
                                <span className="score" style={{ whiteSpace: 'nowrap' }}>{c.score} ▲</span>
                            </div>
                        ))}
                    </div>
                </article>
            ))}
        </main>
    )
}