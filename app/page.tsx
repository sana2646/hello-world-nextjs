import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTodaysTheme } from '@/lib/themes'
import VoteButtons from '@/components/VoteButtons'

export const dynamic = 'force-dynamic'

type Vote = { value: number; user_id: string }
type CaptionRow = {
  id: string
  caption: string
  image_url: string
  theme: string | null
  created_at: string
  votes: Vote[]
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function Home({
                                     searchParams,
                                   }: {
  searchParams: Promise<{ sort?: string }>
}) {
  const { sort } = await searchParams
  const sortBy = sort === 'top' ? 'top' : 'new'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
      .from('captions')
      .select('id, caption, image_url, theme, created_at, votes(value, user_id)')
      .order('created_at', { ascending: false })
      .limit(90)

  const captions = ((data as CaptionRow[]) ?? []).map((c) => ({
    ...c,
    score: c.votes.reduce((sum, v) => sum + v.value, 0),
    userVote: c.votes.find((v) => v.user_id === user?.id)?.value ?? 0,
  }))

  // Group the 3 captions for each photo
  const groups = new Map<string, typeof captions>()
  for (const c of captions) {
    if (!groups.has(c.image_url)) groups.set(c.image_url, [])
    groups.get(c.image_url)!.push(c)
  }
  let posts = Array.from(groups.entries()).map(([image_url, items]) => {
    const sorted = [...items].sort((a, b) => b.score - a.score)
    return {
      image_url,
      theme: items[0].theme,
      created_at: items[0].created_at,
      items: sorted,
      best: sorted[0].score,
    }
  })
  if (sortBy === 'top') posts = posts.sort((a, b) => b.best - a.best)

  const theme = getTodaysTheme()

  return (
      <main className="container">
        <h1 className="page-title">What&apos;s funny in NYC today?</h1>
        <p className="subtitle">
          Real photos. AI captions. You vote on the funniest one.
        </p>

        <div className="theme-banner">
          <div>
            <div className="theme-label">Today&apos;s theme</div>
            <div className="theme-name">{theme}</div>
          </div>
          <Link href={user ? '/generate' : '/login'} className="btn btn-primary">
            {user ? '+ Post a photo' : 'Sign in to post'}
          </Link>
        </div>

        <div className="tabs">
          <Link href="/?sort=new" className={`tab ${sortBy === 'new' ? 'active' : ''}`}>
            🆕 New
          </Link>
          <Link href="/?sort=top" className={`tab ${sortBy === 'top' ? 'active' : ''}`}>
            🔥 Top
          </Link>
        </div>

        {!user && (
            <p className="muted small" style={{ marginBottom: 16 }}>
              👋 <Link href="/login" style={{ textDecoration: 'underline' }}>Sign in</Link> to vote and post your own photos.
            </p>
        )}

        {posts.length === 0 && (
            <div className="card empty">
              <div style={{ fontSize: 40 }}>📸</div>
              <p style={{ fontWeight: 700, marginTop: 8 }}>No posts yet</p>
              <p className="muted">Be the first to post a photo for today&apos;s theme.</p>
            </div>
        )}

        {posts.map((post) => (
            <article key={post.image_url} className="card post">
              <img src={post.image_url} alt="NYC photo" className="post-img" />
              <div className="post-body">
                <div className="post-meta">
                  {post.theme ? <span className="hashtag">#{post.theme}</span> : <span />}
                  <span>{timeAgo(post.created_at)}</span>
                </div>
                {post.items.map((c, i) => {
                  const isTop = i === 0 && c.score > 0
                  return (
                      <div key={c.id} className="caption-row">
                  <span className={`caption-text ${isTop ? 'caption-top' : ''}`}>
                    {isTop && '👑 '}
                    {c.caption}
                  </span>
                        <VoteButtons
                            captionId={c.id}
                            initialScore={c.score}
                            initialUserVote={c.userVote}
                            userId={user?.id ?? null}
                        />
                      </div>
                  )
                })}
              </div>
            </article>
        ))}
      </main>
  )
}